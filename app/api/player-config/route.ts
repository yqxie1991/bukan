// 播放器配置管理API
import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/json-store';
import { validateSession } from '@/lib/auth';
import type { PlayerConfig, IframePlayer, LocalPlayerSettings } from '@/types/player';

// Re-export types for backward compatibility
export type { PlayerConfig, IframePlayer, LocalPlayerSettings };

// 默认配置
const DEFAULT_CONFIG: PlayerConfig = {
  mode: 'local', // 默认使用本地代理模式
  enableProxy: true,
  iframePlayers: [
    {
      id: 'player1',
      name: 'M1907解析接口',
      url: 'https://im1907.top/?jx=',
      priority: 1,
      timeout: 10000,
      enabled: true,
    },
    {
      id: 'player2',
      name: '虾米解析接口',
      url: 'https://jx.xmflv.com/?url=',
      priority: 2,
      timeout: 10000,
      enabled: true,
    },
    {
      id: 'player3',
      name: '咸鱼解析接口',
      url: 'https://jx.xymp4.cc/?url=',
      priority: 3,
      timeout: 10000,
      enabled: true,
    },
    {
      id: 'player4',
      name: '极速解析接口',
      url: 'https://jx.2s0cn/player/?url=',
      priority: 4,
      timeout: 12000,
      enabled: true,
    },
    {
      id: 'player5',
      name: 'PlayerJY解析接口',
      url: 'https://jx.playerjy.com/?url=',
      priority: 5,
      timeout: 12000,
      enabled: true,
    },
    {
      id: 'player6',
      name: '备用播放器',
      url: 'https://jx.jsonplayer.com/player/?url=',
      priority: 6,
      timeout: 12000,
      enabled: true,
    },
    {
      id: 'player7',
      name: '备用播放器2',
      url: 'https://jx.m3u8.tv/jiexi/?url=',
      priority: 7,
      timeout: 15000,
      enabled: true,
    },
  ],
  localPlayerSettings: {
    autoSaveProgress: true,
    progressSaveInterval: 5,
    theme: '#ef4444',
  },
};

const CONFIG_FILE = 'player-config.json';

// 获取配置
export async function GET() {
  try {
    // 从 JSON 文件读取配置（如果文件不存在，会自动创建并保存 DEFAULT_CONFIG）
    const config = readStore<PlayerConfig>(CONFIG_FILE, DEFAULT_CONFIG);

    return NextResponse.json({
      code: 200,
      data: config,
      msg: '获取配置成功',
    });
  } catch (error) {
    console.error('获取播放器配置失败:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: '获取配置失败',
      },
      { status: 500 }
    );
  }
}

// 更新配置
export async function POST(request: NextRequest) {
  try {
    // 验证会话权限
    if (!(await validateSession())) {
      return NextResponse.json(
        { code: 401, msg: '未授权访问' },
        { status: 401 }
      );
    }

    const config: Partial<PlayerConfig> = await request.json();

    // 验证配置格式
    if (!validateConfig(config)) {
      return NextResponse.json(
        {
          code: 400,
          msg: '配置格式错误',
        },
        { status: 400 }
      );
    }

    // 获取现有配置
    const existingConfig = readStore<PlayerConfig>(CONFIG_FILE, DEFAULT_CONFIG);

    // 合并配置
    const mergedConfig: PlayerConfig = {
      ...DEFAULT_CONFIG,
      ...existingConfig,
      ...config,
    };

    // 保存到 JSON 文件
    writeStore(CONFIG_FILE, mergedConfig);

    return NextResponse.json({
      code: 200,
      data: mergedConfig,
      msg: '配置更新成功',
    });
  } catch (error) {
    console.error('更新播放器配置失败:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: '配置更新失败',
      },
      { status: 500 }
    );
  }
}

function validateConfig(config: Partial<PlayerConfig>): boolean {
  // 验证模式
  if (config.mode && !['iframe', 'local', 'auto'].includes(config.mode)) {
    return false;
  }

  // 验证播放器列表
  if (config.iframePlayers) {
    for (const player of config.iframePlayers) {
      if (!player.id || !player.name || !player.url) {
        return false;
      }
    }
  }

  return true;
}
