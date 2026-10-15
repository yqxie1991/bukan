import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidSessionToken } from './lib/session-store';

export function proxy(request: NextRequest) {
  // 检查是否访问admin路径
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 检查 session cookie：需命中服务端会话表（token 为 64 位十六进制随机串）
    const token = request.cookies.get('admin_session')?.value;

    if (!token || !isValidSessionToken(token)) {
      // 未登录或会话已失效，重定向到登录页
      const loginUrl = new URL('/login', request.url);

      // 仅允许站内绝对路径作为回跳目标，避免开放重定向。
      // request.nextUrl.pathname 本身不含 scheme/host，此处做防御性校验：
      // 拒绝协议相对URL（//evil.com）与含反斜杠的路径。
      const target = request.nextUrl.pathname;
      const safeTarget =
        target.startsWith('/') && !target.startsWith('//') && !target.includes('\\')
          ? target
          : '/admin/settings';

      loginUrl.searchParams.set('redirect', safeTarget);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*'
};
