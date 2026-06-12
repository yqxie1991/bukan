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
  
  // 如果是本地静态路径或本地已缓存的图片，直接返回
  if (imageUrl.startsWith('/') || imageUrl.startsWith('file://')) {
    return imageUrl;
  }
  
  // 核心优化：外部防盗链海报直接由客户端向 images.weserv.nl 官方 CDN 发起拉取，实现本地服务器 0 带宽、0 CPU、0 磁盘占用。
  return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp&q=85`;
}
