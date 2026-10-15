import { NextRequest, NextResponse } from 'next/server';
import { VodSource } from '@/types/drama';
import { getVodSourceByKey } from '@/lib/vod-sources-db';
import { isValidExternalUrlAsync, safeFetch } from '@/lib/url-guard';

interface ParseResponse {
  code: number;
  msg: string;
  url: string;
}

// 生成随机 token（32位十六进制字符串）
function generateRandomToken(): string {
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * 16)];
  }
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json(
        { code: 400, msg: '缺少视频URL', data: null },
        { status: 400 }
      );
    }

    // SSRF 防护：不信任请求体中的 source.parseProxy，改为按 key 回查数据库真实配置。
    // 本端点由播放器直接调用，故不能加会话鉴权。
    const requestedSource = body.source as VodSource | undefined;
    const source: VodSource | null = requestedSource?.key
      ? await getVodSourceByKey(requestedSource.key)
      : null;

    // 如果没有解析代理（或源不存在/未启用），直接返回原始URL
    if (!source?.parseProxy) {
      return NextResponse.json({
        code: 200,
        msg: 'success',
        data: { url },
      });
    }

    if (!(await isValidExternalUrlAsync(source.parseProxy))) {
      return NextResponse.json(
        { code: 400, msg: '解析代理地址不合法', data: null },
        { status: 400 }
      );
    }

    // 构建解析请求URL
    const parseParams = new URLSearchParams();
    if (source.parseId) {
      parseParams.set('id', source.parseId);
    }
    parseParams.set('url', url);
    // 使用随机 token（每次请求生成新的）
    parseParams.set('token', generateRandomToken());

    const parseUrl = `${source.parseProxy}?${parseParams.toString()}`;

    // 从 parseProxy URL 提取 origin 用于 Referer 和 Origin 头
    const parseOrigin = new URL(source.parseProxy).origin;

    // 调用解析API（safeFetch 逐跳校验重定向，阻断 SSRF）
    const response = await safeFetch(parseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        'Referer': `${parseOrigin}/`,
        'Origin': parseOrigin,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response) {
      return NextResponse.json(
        { code: 400, msg: '解析代理地址不合法', data: null },
        { status: 400 }
      );
    }

    if (!response.ok) {
      // 不抛出错误，返回正常响应但带有错误码
      console.warn(`[Parse API] 解析请求失败: HTTP ${response.status}`);
      return NextResponse.json({
        code: response.status,
        msg: `解析API请求失败: HTTP ${response.status}`,
        data: null,
      });
    }

    const data: ParseResponse = await response.json();

    if (data.code !== 200 || !data.url) {
      // 解析服务返回错误。
      // 安全考量：不回显上游 msg 原文，避免把内网响应内容透传给未鉴权调用方。
      console.warn('[Parse API] 解析失败');
      return NextResponse.json({
        code: 400,
        msg: '解析失败，请检查播放源或稍后重试',
        data: null,
      });
    }

    // 处理URL格式（移除转义的斜杠）
    const parsedUrl = data.url.replace(/\\\//g, '/');

    // 仅允许返回 http/https 地址，避免上游返回 javascript: 等协议注入
    if (!/^https?:\/\//i.test(parsedUrl)) {
      return NextResponse.json(
        { code: 400, msg: '解析结果地址不合法', data: null },
        { status: 400 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: 'success',
      data: { url: parsedUrl },
    });
  } catch (error) {
    // 仅在开发模式下用 warn 输出，避免触发 Next.js 错误覆盖层。
    // 安全考量：不回显 error.message（可能含内网地址与栈信息）。
    console.warn('[Parse API] 请求异常:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      code: 500,
      msg: '解析请求异常',
      data: null,
    });
  }
}
