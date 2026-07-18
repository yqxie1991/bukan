// 视频代理API - 处理CORS和代理视频流
import { NextRequest, NextResponse } from 'next/server';

// 使用Node.js Runtime以支持完整的URL处理
export const runtime = 'nodejs';

// 阻止的主机名（防止SSRF攻击）
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS元数据服务
  'metadata.google.internal', // GCP元数据服务
];

// 阻止的IP前缀
const BLOCKED_IP_PREFIXES = [
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  let targetUrl = '';

  try {
    // Next.js 15+ params 是 Promise，需要 await
    const resolvedParams = await params;

    // 重建目标URL
    targetUrl = decodeURIComponent(resolvedParams.segments.join('/'));

    // 安全验证（保持静默，避免高频切片请求刷盘）
    if (!isValidUrl(targetUrl)) {
      return NextResponse.json(
        { error: '无效的URL' },
        { status: 400 }
      );
    }

    // 获取客户端的Range header
    const rangeHeader = request.headers.get('Range');

    // 准备请求头 - 尝试多种策略
    const strategies = [
      // 策略1: 极简headers（避免被识别为代理）
      () => {
        const headers: HeadersInit = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (rangeHeader) headers['Range'] = rangeHeader;
        return headers;
      },
      // 策略2: 添加Referer但不设置Origin
      () => {
        const headers: HeadersInit = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        };
        try {
          const urlObj = new URL(targetUrl);
          headers['Referer'] = `${urlObj.protocol}//${urlObj.host}/`;
        } catch (e) {
          console.warn('设置Referer失败:', e);
        }
        if (rangeHeader) headers['Range'] = rangeHeader;
        return headers;
      },
      // 策略3: 完整的浏览器headers
      () => {
        const headers: HeadersInit = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        };
        try {
          const urlObj = new URL(targetUrl);
          headers['Referer'] = `${urlObj.protocol}//${urlObj.host}/`;
          headers['Origin'] = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
          console.warn('设置Referer失败:', e);
        }
        if (rangeHeader) headers['Range'] = rangeHeader;
        return headers;
      },
    ];

    // 尝试第一个策略
    let fetchHeaders = strategies[0]();

    let response: Response | null = null;
    let lastError: Error | null = null;

    // 尝试所有策略（错误才记录日志，避免高频切片刷盘）
    for (let i = 0; i < strategies.length; i++) {
      try {
        if (i > 0) {
          fetchHeaders = strategies[i]();
        }

        // 转发请求
        response = await fetch(targetUrl, {
          headers: fetchHeaders,
          redirect: 'manual',
          // 🚀 减少超时时间，快速失败（从30秒改为8秒）
          signal: AbortSignal.timeout(8000),
        });

        // 如果成功或者不是403/5xx错误，跳出循环
        if (response.ok || response.status === 206 || (response.status < 403 && response.status >= 300)) {
          break;
        }

        // 如果是403或5xx错误且还有其他策略，继续尝试
        if (i < strategies.length - 1) {
          continue;
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ 策略${i + 1}网络请求失败:`, error);

        // 如果是最后一个策略，抛出错误
        if (i === strategies.length - 1) {
          throw error;
        }
        // 否则继续尝试下一个策略
        continue;
      }
    }

    // 如果所有策略都失败
    if (!response) {
      throw lastError || new Error('所有请求策略失败');
    }

    // 处理重定向
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        // 返回重定向地址
        return NextResponse.redirect(location);
      }
    }

    // 检查响应状态（仅在错误时记录日志，避免高频切片刷盘）
    if (!response.ok && response.status !== 206) {
      console.error('❌ 代理请求失败:', response.status, response.statusText, 'URL:', targetUrl);

      // 如果是403，可能是IP封锁，返回原始URL供前端直接请求
      if (response.status === 403) {
        return NextResponse.json(
          {
            error: 'proxy_blocked',
            message: '代理服务器被IP封锁，尝试直接播放',
            fallbackUrl: targetUrl,
            useDirect: true,
          },
          {
            status: 403,
            headers: {
              'X-Proxy-Status': 'blocked',
              'X-Fallback-Url': encodeURIComponent(targetUrl),
            }
          }
        );
      }

      return NextResponse.json(
        {
          error: `代理请求失败: ${response.status} ${response.statusText}`,
          url: targetUrl,
          suggestion: '目标站点拒绝访问，可能需要特定的cookies或认证'
        },
        { status: response.status }
      );
    }

    // 获取响应内容类型
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    // 先处理m3u8文件（优先级最高）
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.endsWith('.m3u8')) {
      const text = await response.text();

      // 处理m3u8中的相对路径
      const processedM3u8 = processM3u8Content(text, targetUrl);

      return new NextResponse(processedM3u8, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 对于视频流和其他内容，直接转发（支持Range请求）
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        ...(response.headers.get('Content-Range') && {
          'Content-Range': response.headers.get('Content-Range') || '',
        }),
        ...(response.headers.get('Content-Length') && {
          'Content-Length': response.headers.get('Content-Length') || '',
        }),
        ...(response.headers.get('Accept-Ranges') && {
          'Accept-Ranges': response.headers.get('Accept-Ranges') || '',
        }),
      },
    });

  } catch (error) {
    // 解析错误类型
    const err = error as Error;
    let errorMessage = '代理请求失败';
    let errorCode = 'PROXY_ERROR';
    let suggestion = '';

    if (err.message) {
      // TLS/SSL 错误
      if (err.message.includes('ECONNRESET') || err.message.includes('socket disconnected')) {
        errorMessage = 'TLS连接被重置，目标服务器拒绝连接';
        errorCode = 'TLS_CONNECTION_RESET';
        suggestion = '该服务器可能使用了非标准端口或证书配置，建议切换其他视频源';
      }
      // 超时错误
      else if (err.message.includes('timeout') || err.message.includes('aborted')) {
        errorMessage = '请求超时，服务器响应过慢';
        errorCode = 'REQUEST_TIMEOUT';
        suggestion = '网络连接不稳定或服务器繁忙，建议稍后重试';
      }
      // DNS 错误
      else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        errorMessage = '无法解析域名，服务器不存在';
        errorCode = 'DNS_ERROR';
        suggestion = '该视频源可能已失效，建议切换其他源';
      }
      // 连接拒绝
      else if (err.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝，服务器未响应';
        errorCode = 'CONNECTION_REFUSED';
        suggestion = '目标服务器可能已下线，建议切换其他源';
      }
      // 其他网络错误
      else if (err.message.includes('fetch failed')) {
        errorMessage = '网络请求失败';
        errorCode = 'NETWORK_ERROR';
        suggestion = '请检查网络连接或尝试切换其他视频源';
      }
    }

    console.error('❌ 代理错误:', errorCode, err.message, 'URL:', targetUrl);

    return NextResponse.json(
      {
        error: errorCode,
        message: errorMessage,
        details: err.message,
        suggestion,
        url: targetUrl,
        fallbackUrl: targetUrl,
        useDirect: true, // 建议前端尝试直接播放
      },
      {
        status: 500,
        headers: {
          'X-Error-Code': errorCode,
          'X-Fallback-Url': encodeURIComponent(targetUrl),
        }
      }
    );
  }
}

// OPTIONS请求处理（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// URL安全验证（保持静默，避免高频请求刷盘）
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // 只允许HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // 检查阻止的主机名
    if (BLOCKED_HOSTS.includes(url.hostname)) {
      return false;
    }

    // 检查阻止的IP前缀
    for (const prefix of BLOCKED_IP_PREFIXES) {
      if (url.hostname.startsWith(prefix)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// 处理m3u8内容，转换相对路径为代理路径
function processM3u8Content(content: string, baseUrl: string): string {
  const lines = content.split('\n');
  const base = new URL(baseUrl);

  // 辅助函数：解析并代理URL
  const resolveAndProxy = (urlString: string): string => {
    try {
      let url: URL;
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        url = new URL(urlString);
      } else {
        url = new URL(urlString, base.href);
      }
      return `/api/video-proxy/${encodeURIComponent(url.href)}`;
    } catch (e) {
      console.error(`❌ URL解析失败: "${urlString}"`, e);
      return urlString;
    }
  };

  const processedLines = lines.map(line => {
    // 处理 #EXT-X-KEY 标签中的 URI（加密密钥）
    if (line.startsWith('#EXT-X-KEY:')) {
      const uriMatch = line.match(/URI=["']?([^"',]+)["']?/);
      if (uriMatch && uriMatch[1]) {
        const originalUri = uriMatch[1];
        const proxiedUri = resolveAndProxy(originalUri);
        return line.replace(/URI=["']?[^"',]+["']?/, `URI="${proxiedUri}"`);
      }
      return line;
    }

    // 跳过其他注释行和空行
    if (line.startsWith('#') || !line.trim()) {
      return line;
    }

    // 处理片段URL
    const trimmedLine = line.trim();
    const proxiedUrl = resolveAndProxy(trimmedLine);
    return proxiedUrl;
  });

  return processedLines.join('\n');
}
