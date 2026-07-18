import { NextRequest, NextResponse } from 'next/server';
import { createSession, validatePassword } from '@/lib/auth';

// 简易 IP 维度滑动窗口速率限制（5 次/分钟，无需外部存储，进程内存即可，符合极简部署）
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const ipAttemptMap = new Map<string, { count: number; firstAttemptAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const record = ipAttemptMap.get(ip);

  // 清理过期记录
  if (record && now - record.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    ipAttemptMap.delete(ip);
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

// 获取客户端真实 IP（兼容反代场景：优先 X-Forwarded-For）
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
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
