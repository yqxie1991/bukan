// 播放器相关类型定义

export interface IframePlayer {
  id: string;
  name: string;
  url: string;
  priority: number;
  timeout: number;
  enabled: boolean;
}

export interface LocalPlayerSettings {
  autoSaveProgress: boolean; // 自动保存进度
  progressSaveInterval: number; // 进度保存间隔（秒）
  theme: string; // 主题颜色
}

export interface PlayerConfig {
  mode: 'iframe' | 'local' | 'auto'; // 播放器模式
  enableProxy: boolean; // 是否启用代理
  iframePlayers: IframePlayer[]; // iframe播放器列表
  localPlayerSettings: LocalPlayerSettings; // 本地播放器设置
}
