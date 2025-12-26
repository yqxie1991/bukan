import useSWR from 'swr';
import type { DailymotionChannelConfig, DailymotionConfigData } from '@/types/dailymotion-config';

// 获取 Dailymotion 配置
async function fetchDailymotionConfig(): Promise<DailymotionConfigData> {
  const response = await fetch('/api/dailymotion-config');
  const result = await response.json();
  
  if (result.code === 200 && result.data) {
    return result.data;
  }
  
  // 返回默认配置
  return {
    channels: [{
      id: 'default',
      username: 'kchow125',
      displayName: 'KChow125',
      isActive: true,
      createdAt: new Date().toISOString(),
    }],
    defaultChannelId: 'default',
  };
}

interface UseDailymotionConfigReturn {
  channels: DailymotionChannelConfig[];
  defaultChannelId?: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 管理 Dailymotion 频道配置
 * 使用 SWR 缓存配置数据
 */
export function useDailymotionConfig(): UseDailymotionConfigReturn {
  const { data, error, isLoading, mutate } = useSWR(
    'dailymotion-config',
    fetchDailymotionConfig
  );

  const activeChannels = data?.channels.filter(c => c.isActive) || [];

  return {
    channels: activeChannels,
    defaultChannelId: data?.defaultChannelId || activeChannels[0]?.id,
    loading: isLoading && !data,
    error: error?.message || null,
    refetch: async () => { await mutate(); },
  };
}
