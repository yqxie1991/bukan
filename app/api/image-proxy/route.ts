import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isValidExternalUrlAsync, safeFetch } from '@/lib/url-guard';

// 代理池配置
const PROXY_POOL = [
  {
    name: 'wsrv.link0.me',
    url: (imgUrl: string) => `https://wsrv.link0.me/?url=${encodeURIComponent(imgUrl)}&output=webp&q=85`,
    timeout: 2500,
  },
  {
    name: 'images.weserv.nl',
    url: (imgUrl: string) => `https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&output=webp&q=85`,
    timeout: 2500,
  } 
];

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 使用代理池获取图片
 * 策略：依次尝试代理池中的所有代理，快速失败，提高效率
 */
async function fetchImageWithProxy(url: string): Promise<Response> {
  
  const fastProxies = PROXY_POOL.slice(0, 2);
  
  const fastPromises = fastProxies.map(async (proxy) => {
    try {
      const proxyUrl = proxy.url(url);
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(proxy.timeout),
      });

      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      throw error;
    }
  });

  // 使用 Promise.any，只要有一个成功就返回
  try {
    return await Promise.any(fastPromises);
  } catch {
    // 前2个代理都失败，降级到直接访问
  }

  // 策略 2: 直接访问（防盗链 Referer）。
  // 用 safeFetch 逐跳校验重定向，防止上游 302 指向内网地址。
  const response = await safeFetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://movie.douban.com/',
    },
    signal: AbortSignal.timeout(2500),
  });

  if (response && response.ok) {
    return response;
  }

  throw new Error('所有获取方式都失败');
}

export async function GET(request: NextRequest) {
  try {
    let url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 本地缓存图片直接读取并返回，避免走外部代理池或本地 fetch 时格式报错导致裂图
    if (url.startsWith('/cache/images/')) {
      try {
        const safeDir = path.join(process.cwd(), 'public', 'cache', 'images');
        const filePath = path.resolve(process.cwd(), 'public', url.replace(/^\//, ''));
        // 用 path.relative 判定越界：目标在 safeDir 之外时 rel 以 '..' 开头。
        // 原实现用 filePath.startsWith(safeDir)，`/cache/images/../images_x/f.jpg`
        // 这类前缀混淆可绕过（resolve 后落在同前缀的兄弟目录）。
        const rel = path.relative(safeDir, filePath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const imageBuffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        console.error('Failed to read local cached image:', err);
        // 自愈逻辑：解析文件名以查找豆瓣原始图片 URL
        const match = url.match(/\/cache\/images\/(\d+)_(cover|horizontal|vertical)_[a-f0-9]+/);
        if (match) {
          const id = match[1];
          const type = match[2];
          let originalImgUrl = '';
          
          // 1. 如果是横版/竖版海报，优先从 hero movies 中寻找
          if (type === 'horizontal' || type === 'vertical') {
            try {
              const { getHeroMovies } = await import('@/lib/douban-service');
              const heroes = await getHeroMovies();
              const hero = heroes.find(h => String(h.id) === id);
              if (hero) {
                originalImgUrl = type === 'horizontal' ? hero.poster_horizontal : hero.poster_vertical;
              }
            } catch (e) {
              console.error('Failed to get hero movies for self-healing:', e);
            }
          }
          
          // 2. 如果没找到，或者是普通的 cover 类型，优先查询详情
          if (!originalImgUrl) {
            try {
              const { getSubjectDetail, getHeroMovies } = await import('@/lib/douban-service');
              const detail = await getSubjectDetail(id);
              if (detail && detail.cover) {
                originalImgUrl = detail.cover;
              } else {
                // 降级到 hero 中寻找 cover
                const heroes = await getHeroMovies();
                const hero = heroes.find(h => String(h.id) === id);
                if (hero && hero.cover) {
                  originalImgUrl = hero.cover;
                }
              }
            } catch (e) {
              console.error('Failed to get subject detail for self-healing:', e);
            }
          }

          if (originalImgUrl) {
            console.log(`[Self-Healing] Reconstructed origin URL for ${url} -> ${originalImgUrl}`);
            url = originalImgUrl;
          }
        }
      }
    }

    // SSRF 防护：走到这里说明不是本地缓存路径，接下来会由服务器主动请求该地址，
    // 必须先校验（禁止内网 IP、云元数据、以及解析到内网的域名）。
    if (!(await isValidExternalUrlAsync(url))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 使用代理池获取图片
    const response = await fetchImageWithProxy(url);
    
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
