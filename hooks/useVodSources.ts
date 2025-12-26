import useSWR from 'swr';
import type { VodSource } from '@/types/drama';

interface VodSourcesResponse {
  sources: VodSource[];
  selected: VodSource | null;
}

// 获取 VOD 视频源配置
async function fetchVodSources(): Promise<VodSourcesResponse> {
  const response = await fetch('/api/vod-sources');
  const result = await response.json();
  
  if (result.code === 200 && result.data) {
    return {
      sources: result.data.sources || [],
      selected: result.data.selected || null,
    };
  }
  
  return { sources: [], selected: null };
}

interface UseVodSourcesReturn {
  sources: VodSource[];
  selected: VodSource | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 管理 VOD 视频源配置
 * 使用 SWR 缓存配置数据
 */
export function useVodSources(): UseVodSourcesReturn {
  const { data, error, isLoading, mutate } = useSWR(
    'vod-sources',
    fetchVodSources
  );

  return {
    sources: data?.sources || [],
    selected: data?.selected || null,
    loading: isLoading && !data,
    error: error?.message || null,
    refetch: async () => { await mutate(); },
  };
}
