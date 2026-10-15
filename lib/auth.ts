import { cookies } from 'next/headers';
import crypto from 'crypto';
import { saveSession, isValidSessionToken, removeSession } from './session-store';

// Session cookie 名称
const SESSION_COOKIE_NAME = 'admin_session';

// 默认密码（仅在未设置 ADMIN_PASSWORD 环境变量时使用，保证开箱即用）
const DEFAULT_ADMIN_PASSWORD = 'bukan';

// 启动时检查：若仍未设置密码则输出告警。
// docker-compose 已用 ${ADMIN_PASSWORD:?...} 强制校验，此处是兜底——
// 覆盖绕过 compose 直接运行（如本地 npm run dev）的场景。
// 注意用 trim 判断：空字符串同样是无效配置，若仅判 falsy 会让「传了空值」的
// 情况悄悄回落到默认密码却不触发任何告警。
if (!process.env.ADMIN_PASSWORD?.trim()) {
  console.warn(
    '\n⚠️  未设置 ADMIN_PASSWORD，正在使用默认密码 \'' + DEFAULT_ADMIN_PASSWORD + '\'。\n' +
    '   请设置强密码后重启：export ADMIN_PASSWORD=<你的强密码>\n'
  );
}

// 获取管理员密码（运行时动态读取环境变量，避免构建时被内联）
function getAdminPassword(): string {
  // 空串/纯空白视为未设置，回落默认密码
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
}

// 创建会话：生成 32 字节随机 token 并落盘，服务端持有映射表以支持吊销
export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = saveSession();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // 由环境变量控制：HTTPS 反代场景保持 true；本地 HTTP 开发时设 false
    secure: process.env.SECURE_COOKIE === 'true',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

// 清除会话：删除服务端记录并清除 cookie
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    // 从服务端会话表删除，使该 token 立即失效
    removeSession(token);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

// 校验会话：token 必须命中服务端会话表
export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  // 服务端校验：token 是否存在、未过期、且密码指纹匹配
  return isValidSessionToken(token);
}

// 校验密码
export function validatePassword(password: string): boolean {
  const expected = getAdminPassword();
  const passwordBuf = Buffer.from(password, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (passwordBuf.length !== expectedBuf.length) {
    // 长度不一致：仍执行一次比较，保持恒定时间，避免泄露长度信息
    const dummy = Buffer.alloc(1, 0);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(passwordBuf, expectedBuf);
}