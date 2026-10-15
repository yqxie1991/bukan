import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 智能视频代理 v2
 * 支持 m3u8 播放列表重写
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoUrl = searchParams.get('url');
    
    if (!videoUrl) {
      return NextResponse.json(
        { code: 400, message: '缺少视频地址参数' },
        { status: 400 }
      );
    }

    // 移除高频代理请求日志，防止 Docker 频繁刷盘写日志
    // console.log(`🎬 代理视频请求: ${videoUrl}`);

    // 准备请求头 - 模拟真实浏览器
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };
    
    // 添加 Referer - 使用同域名的根路径
    try {
      const urlObj = new URL(videoUrl);
      fetchHeaders['Referer'] = `${urlObj.protocol}//${urlObj.host}/`;
      fetchHeaders['Origin'] = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      console.warn('设置Referer失败:', e);
    }
    
    // 添加 Range 头（如果存在）
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }
    
    // 移除高频 Headers 打印，防止 Docker 频繁刷盘写日志
    // console.log('🔧 请求headers:', JSON.stringify(fetchHeaders, null, 2));
    
    const videoResponse = await fetch(videoUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(30000)
    });

    if (!videoResponse.ok && videoResponse.status !== 206) {
      // 仅记录状态码，避免高频切片请求刷盘（一部电影几千个 .ts）
      console.error(`❌ 视频请求失败: ${videoResponse.status} ${videoResponse.statusText}`);

      return NextResponse.json(
        {
          code: videoResponse.status,
          message: `视频请求失败: ${videoResponse.status} ${videoResponse.statusText}`,
          suggestion: videoResponse.status === 403 ? '目标站点拒绝访问，可能需要特定的cookies或认证' : undefined
        },
        { status: videoResponse.status }
      );
    }

    const contentType = videoResponse.headers.get('content-type') || '';

    // 检查是否是 m3u8 播放列表
    if (contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegURL') ||
        videoUrl.endsWith('.m3u8')) {

      // 读取 m3u8 内容
      const m3u8Content = await videoResponse.text();
      
      // 获取真实外网域名 Origin 并重写 m3u8 内容
      const realOrigin = getRealOrigin(request);
      const rewrittenContent = rewriteM3U8(m3u8Content, videoUrl, realOrigin);
      
      // 返回重写后的 m3u8
      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Expose-Headers': 'Content-Length',
          'Cache-Control': 'no-cache',
        }
      });
    }

    // 非 m3u8 文件，直接转发
    const headers = new Headers();
    
    const headersToClone = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];

    headersToClone.forEach(header => {
      const value = videoResponse.headers.get(header);
      if (value) headers.set(header, value);
    });

    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    return new NextResponse(videoResponse.body, {
      status: videoResponse.status,
      headers
    });

  } catch (error) {
    console.error('视频代理失败:', error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : '视频代理失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取请求的真实 Origin (考虑反代及外网域名环境)
 */
function getRealOrigin(request: NextRequest): string {
  // 1. 优先使用环境变量
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  // 2. 其次通过请求的 Referer 提取真实外网 Origin (最精准，无视反代配置缺失)
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.protocol.startsWith('http')) {
        return refererUrl.origin;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 3. 再次尝试从代理头获取
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  
  if (host) {
    return `${proto}://${host}`;
  }

  // 4. 兜底使用 nextUrl.origin
  return request.nextUrl.origin;
}

/**
 * 重写 m3u8 文件内容
 * 将所有资源 URL 替换为代理 URL
 */
function rewriteM3U8(content: string, baseUrl: string, proxyOrigin: string): string {
  const lines = content.split('\n');
  const baseUrlObj = new URL(baseUrl);
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  
  // 辅助函数：将相对URL转换为绝对URL
  const resolveUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
    }
    return baseDir + url;
  };
  
  const rewrittenLines = lines.map(line => {
    // 通用处理带 URI 属性的标签 (包括 #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-MAP 等)
    if (line.startsWith('#')) {
      if (line.includes('URI=')) {
        return line.replace(/URI=["']?([^"',]+)["']?/g, (match, p1) => {
          const absoluteUri = resolveUrl(p1);
          return `URI="${proxyOrigin}/api/video-proxy?url=${encodeURIComponent(absoluteUri)}"`;
        });
      }
      return line;
    }
    
    // 跳过其他注释行和空行
    if (line.startsWith('#') || line.trim() === '') {
      return line;
    }
    
    // 处理资源 URL（.ts 片段等）
    const resourceUrl = resolveUrl(line.trim());
    
    // 智能决策是否直连：
    // 1. 如果本地服务外网部署为 HTTPS 协议，而视频切片源为 HTTP 协议，为了防范浏览器混合内容 (Mixed Content) 拦截，必须走服务器代理。
    // 2. 其他情况下 (如切片源本身为 HTTPS 或本地部署为 HTTP 环境)，完全可以让客户端直连 CDN 下载分片，群晖带宽开销直接降为 0！
    const isHttpsProxy = proxyOrigin.startsWith('https:');
    const isHttpResource = resourceUrl.startsWith('http:');
    
    if (isHttpsProxy && isHttpResource) {
      return `${proxyOrigin}/api/video-proxy?url=${encodeURIComponent(resourceUrl)}`;
    }
    
    return resourceUrl;
  });
  
  return rewrittenLines.join('\n');
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new NextResponse(null, {
    status: 204,
    headers
  });
}
