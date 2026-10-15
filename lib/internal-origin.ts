import type { NextRequest } from 'next/server';

/**
 * 解析服务端自调用（self-fetch）应使用的内部 Origin
 *
 * 背景：豆瓣多源匹配接口需要请求本服务自身的 /api/drama/list。
 * 此前硬编码为 `http://127.0.0.1:${PORT}`，在 Vercel 等 Serverless 环境中
 * 回环地址不可达，导致多源匹配整体失效（错误被 catch 吞掉，表现为「0 个播放源」）。
 *
 * 优先级：
 * 1. INTERNAL_ORIGIN 环境变量（Docker 单容器部署显式指定）
 * 2. 当前请求的 Origin（Serverless / 反代场景下由请求头推导）
 */
export function getInternalOrigin(request: NextRequest): string {
  const configured = process.env.INTERNAL_ORIGIN;
  if (configured) {
    return configured;
  }
  return request.nextUrl.origin;
}
