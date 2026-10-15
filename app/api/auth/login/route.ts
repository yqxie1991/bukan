import { NextRequest, NextResponse } from 'next/server';
import { createSession, validatePassword } from '@/lib/auth';

// 简易 IP 维度滑动窗口速率限制（5 次/分钟，无需外部存储，进程内存即可，符合极简部署）
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
// Map 容量上限：超过则触发全量清扫，防止被伪造 IP 撑爆内存
const RATE_LIMIT_MAP_MAX_SIZE = 1000;
const ipAttemptMap = new Map<string, { count: number; firstAttemptAt: number }>();

/**
 * 是否信任反向代理写入的 X-Forwarded-For / X-Real-IP
 * 默认开启（典型部署为 Lucky / Nginx 反代）；设为 'false' 可在直连场景下完全忽略这些头。
 */
const TRUST_PROXY = process.env.TRUST_PROXY !== 'false';

/**
 * 清除已超出时间窗口的记录
 * @param forceSweep true 时执行全量清扫（Map 超容量时），否则仅清理当前 key
 */
function purgeExpiredRecords(forceSweep: boolean): void {
  const now = Date.now();
  if (forceSweep) {
    for (const [key, rec] of ipAttemptMap) {
      if (now - rec.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
        ipAttemptMap.delete(key);
      }
    }
    return;
  }
  return;
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const record = ipAttemptMap.get(ip);

  // 清理当前 key 的过期记录
  if (record && now - record.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    ipAttemptMap.delete(ip);
  }

  // 容量超限时全量清扫过期条目，避免攻击者用海量伪造 IP 导致内存无限增长
  if (ipAttemptMap.size > RATE_LIMIT_MAP_MAX_SIZE) {
    purgeExpiredRecords(true);
  }

  const current = ipAttemptMap.get(ip);

  if (current && current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const elapsed = now - current.firstAttemptAt;
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  if (current) {
    current.count += 1;
  } else {
    ipAttemptMap.set(ip, { count: 1, firstAttemptAt: now });
  }

  return { allowed: true, retryAfterSec: 0 };
}

// 登录成功后清理该 IP 的计数
function clearRateLimit(ip: string): void {
  ipAttemptMap.delete(ip);
}

/**
 * 获取客户端真实 IP
 *
 * TRUST_PROXY 开启时取 X-Forwarded-For 的**最后一段**：可信反代（Lucky/Nginx）
 * 会在原有链路后追加真实客户端 IP，故最后一段不可被客户端伪造；
 * 若取第一段，攻击者每次请求换一个伪造前缀即可绕过限流。
 */
function getClientIp(request: NextRequest): string {
  if (TRUST_PROXY) {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
      const segments = xff.split(',').map(s => s.trim()).filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  }
  // 不信任代理头（或未提供）时统一归并为单一 key，
  // 此时限流按「全局」生效，无法被伪造 IP 绕过
  return 'untrusted-proxy-header';
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const { allowed, retryAfterSec } = checkRateLimit(clientIp);
    if (!allowed) {
      return NextResponse.json(
        { error: `尝试过于频繁，请 ${retryAfterSec} 秒后重试` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: '请输入密码' },
        { status: 400 }
      );
    }

    // 验证密码
    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 创建会话
    await createSession();
    clearRateLimit(clientIp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
