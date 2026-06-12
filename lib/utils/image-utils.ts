// 图片处理工具函数

// 默认占位图
const DEFAULT_PLACEHOLDER = '/movie-default-bg.jpg';

/**
 * 智能获取图片URL - 通过代理服务器获取图片
 */
export function getImageUrl(imageUrl: string): string {
  // 空URL返回占位图
  if (!imageUrl || imageUrl.trim() === '') {
    return DEFAULT_PLACEHOLDER;
  }
  
  // 如果是本地静态路径、本地已缓存的图片，或者已经代理过的图片，直接返回
  if (imageUrl.startsWith('/') || imageUrl.startsWith('file://') || imageUrl.startsWith('/api/image-proxy')) {
    return imageUrl;
  }
  
  // 核心优化：改走本地图片代理 API，通过服务端中转与代理池（包括 wsrv.link0.me 镜像和直连豆瓣 Referer 防盗链绕过），
  // 并配合 Vercel 的 Edge CDN 缓存实现极速免流量加载。
  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}
