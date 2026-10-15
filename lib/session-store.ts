import crypto from 'crypto';
import { readStore, writeStore } from './json-store';

/**
 * 管理员会话存储（服务端可撤销的会话表）
 *
 * 背景：原实现把 session cookie 的值硬编码为字符串 'authenticated'，
 * 且无任何签名与随机性，任何人手工构造该 cookie 即可获得完整管理员权限。
 * 本模块改为：登录时生成 32 字节随机 token 并落盘，服务端持有映射表，
 * 校验时需查表命中且未过期，从而支持真正吊销与改密码全量失效。
 */

const SESSIONS_FILE = 'sessions.json';

/** 会话有效期：7 天，与 cookie maxAge 对齐 */
const SESSION_TTL_MS = 60 * 60 * 24 * 7 * 1000;

interface StoredSession {
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
  /** 会话创建时的管理员密码指纹，用于改密码后全量失效 */
  pwdFingerprint: string;
}

type SessionMap = Record<string, StoredSession>;

/** 默认密码（与 lib/auth.ts 保持一致；此处仅用于指纹计算，不用于登录校验） */
const DEFAULT_ADMIN_PASSWORD = 'bukan';

function getAdminPassword(): string {
  // 与 lib/auth.ts 保持一致：空串/纯空白视为未设置
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
}

/**
 * 计算当前管理员密码的指纹（sha256 前 16 位十六进制）
 * 指纹不含明文密码，仅用于判断「密码是否被修改过」
 */
function currentPwdFingerprint(): string {
  return crypto
    .createHash('sha256')
    .update(getAdminPassword(), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

/**
 * 生成一个新的随机会话 token（64 位十六进制，256 位熵）
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 保存一个新会话，同时清理已过期的历史会话
 *
 * @returns 会话 token（调用方负责写入 cookie）
 */
export function saveSession(): string {
  const token = generateSessionToken();
  const now = Date.now();
  const fingerprint = currentPwdFingerprint();

  const store = readStore<SessionMap>(SESSIONS_FILE, {});

  // 顺带清理过期会话，避免表无限增长
  for (const [key, session] of Object.entries(store)) {
    if (session.expiresAt <= now) {
      delete store[key];
    }
  }

  store[token] = {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    pwdFingerprint: fingerprint,
  };

  writeStore(SESSIONS_FILE, store);
  return token;
}

/**
 * 校验会话 token 是否有效
 *
 * 校验项：token 存在于会话表、未过期、密码指纹与当前密码一致（改密码即失效）
 */
export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) {
    return false;
  }

  const store = readStore<SessionMap>(SESSIONS_FILE, {});
  const session = store[token];

  if (!session) {
    return false;
  }

  const now = Date.now();

  // 过期：顺手从表中移除
  if (session.expiresAt <= now) {
    delete store[token];
    try {
      writeStore(SESSIONS_FILE, store);
    } catch {
      // 清理失败不影响本次鉴权结论
    }
    return false;
  }

  // 密码已被修改：该会话一律失效
  if (session.pwdFingerprint !== currentPwdFingerprint()) {
    delete store[token];
    try {
      writeStore(SESSIONS_FILE, store);
    } catch {
      // 忽略
    }
    return false;
  }

  return true;
}

/**
 * 吊销一个会话（登出时调用）
 */
export function removeSession(token: string | undefined | null): void {
  if (!token) {
    return;
  }

  const store = readStore<SessionMap>(SESSIONS_FILE, {});
  if (!(token in store)) {
    return;
  }

  delete store[token];
  writeStore(SESSIONS_FILE, store);
}