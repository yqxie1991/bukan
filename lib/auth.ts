import { cookies } from 'next/headers';
import crypto from 'crypto';

// Session cookie 名称
const SESSION_COOKIE_NAME = 'admin_session';

// 默认密码（仅在未设置 ADMIN_PASSWORD 环境变量时使用，保证开箱即用）
const DEFAULT_ADMIN_PASSWORD = 'bukan';

// 启动时检查：若仍使用默认密码则输出显著警告（不阻止启动，保留开箱即用体验）
if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    '\n⚠️  安全警告：未设置 ADMIN_PASSWORD 环境变量，正在使用默认密码 \'' + DEFAULT_ADMIN_PASSWORD + '\'。\n' +
    '   公网部署时请务必设置强密码：export ADMIN_PASSWORD=<你的强密码>\n'
  );
}

// 获取管理员密码（运行时动态读取环境变量，避免构建时被内联）
function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

// 创建会话
export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  // 设置session cookie，有效期7天
  cookieStore.set(SESSION_COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

// 删除会话
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// 验证会话
export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return session?.value === 'authenticated';
}

// 验证密码（使用 timingSafeEqual 防止时序攻击，避免通过响应时间差异侧信道泄露密码长度/前缀）
export function validatePassword(password: string): boolean {
  const expected = getAdminPassword();
  const passwordBuf = Buffer.from(password, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  // 长度不同时也调用 timingSafeEqual 一次以保持恒定时间（用 0 与第一个字节比较，结果被 & 运算抹掉）
  if (passwordBuf.length !== expectedBuf.length) {
    const dummy = Buffer.alloc(1, 0);
    const safeCompare = crypto.timingSafeEqual(dummy, dummy);
    return safeCompare && false;
  }
  return crypto.timingSafeEqual(passwordBuf, expectedBuf);
}
