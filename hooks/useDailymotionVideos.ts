import useSWR from 'swr';
import { DailymotionChannel } from '@/types/dailymotion';

// 获取 Dailymotion 频道视频
async function fetchChannelVideos(username: string, page: number): Promise<DailymotionChannel> {
  const response = await fetch(`/api/dailymotion?username=${username}&page=${page}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch channel data');
  }
  
  return response.json();
}

interface UseDailymotionVideosReturn {
  channelData: DailymotionChannel | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 管理 Dailymotion 频道视频数据
 * 使用 SWR 缓存视频列表
 */
export function useDailymotionVideos(
  username: string | null,
  page: number
): UseDailymotionVideosReturn {
  const { data, error, isLoading, mutate } = useSWR(
    username ? `dailymotion-videos-${username}-${page}` : null,
    () => fetchChannelVideos(username!, page),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    channelData: data || null,
    hasMore: data?.hasMore || false,
    loading: isLoading && !data,
    error: error?.message || null,
    refetch: async () => { await mutate(); },
  };
}
