/**
 * 短剧视频源类型定义
 */
export interface ShortDramaSource {
  key: string;       // 唯一标识
  name: string;      // 显示名称
  api: string;       // API 地址
  typeId?: number;   // 短剧分类 ID（不同资源站的分类 ID 不同）
  priority?: number; // 优先级，数值越小优先级越高（默认 0）
}
