// 图片处理工具函数

// 默认占位图
const DEFAULT_PLACEHOLDER = '/movie-default-bg.jpg';

/**
 * weserv.nl 图片 CDN 直连地址
 *
 * 背景：豆瓣防盗链海报若全部经本地服务器中转，NAS 的上行/下行流量会被图片占满
 * （首页一次加载约 180 张封面）。weserv 提供公共图片代理，可直接由**客户端**拉取，
 * 服务器完全不参与，带宽趋近于 0。
 */
export function getWeservUrl(imageUrl: string): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp&q=85`;
}

/**
 * 本地图片代理地址（weserv 不可用时的降级路径）
 */
export function getImageProxyFallbackUrl(imageUrl: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

/**
 * 智能获取图片URL
 *
 * 三级回退策略（由 SmartImage 组件驱动）：
 *   1. weserv CDN 直连（客户端拉取，服务器零流量）
 *   2. 本地 /api/image-proxy 服务端代理
 *   3. 占位图
 *
 * 本函数返回第 1 级地址；后两级在 SmartImage 的 onError 中依次降级。
 */
export function getImageUrl(imageUrl: string): string {
  // 空URL返回占位图
  if (!imageUrl || imageUrl.trim() === '') {
    return DEFAULT_PLACEHOLDER;
  }

  // 本地静态路径、已缓存图片、已代理过的图片：直接返回
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  // 外部海报：走 weserv 客户端直连，不占用服务器带宽
  return getWeservUrl(imageUrl);
}
