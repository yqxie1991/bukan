"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShortDramaSwiper,
  type ShortDrama,
  type Episode,
} from "@/components/shorts/ShortDramaSwiper";

interface Source {
  key: string;
  name: string;
}

export default function ShortsPage() {
  const [dramas, setDramas] = useState<ShortDrama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 多源支持
  const [sources, setSources] = useState<Source[]>([]);
  const [currentSource, setCurrentSource] = useState("wwzy");

  // 获取短剧详情（获取集数信息）
  const fetchDramaDetail = async (
    vodId: number,
    source: string
  ): Promise<Episode[]> => {
    try {
      const response = await fetch(
        `/api/shorts/detail?ids=${vodId}&source=${source}`
      );
      const result = await response.json();

      if (result.code === 200 && result.data) {
        return result.data.episodes || [];
      }
      return [];
    } catch {
      return [];
    }
  };

  // 获取短剧列表
  const fetchDramas = useCallback(
    async (pageNum: number, source: string, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setDramas([]); // 切换源时清空
        }

        const response = await fetch(
          `/api/shorts/list?pg=${pageNum}&source=${source}`
        );
        const result = await response.json();

        if (result.code !== 200 || !result.data) {
          throw new Error(result.msg || "获取短剧列表失败");
        }

        const dramaList = result.data.list;

        // 保存可用源列表
        if (result.data.sources) {
          setSources(result.data.sources);
        }

        // 并行获取每个短剧的详情
        const dramasWithEpisodes = await Promise.all(
          dramaList.map(async (drama: any) => {
            const episodes = await fetchDramaDetail(drama.vod_id, source);
            return {
              vod_id: drama.vod_id,
              vod_name: drama.vod_name,
              vod_pic: drama.vod_pic,
              vod_remarks: drama.vod_remarks,
              episodes:
                episodes.length > 0
                  ? episodes
                  : [{ name: drama.vod_remarks || "正片", url: "" }],
            } as ShortDrama;
          })
        );

        // 过滤掉没有可播放视频的短剧
        const validDramas = dramasWithEpisodes.filter(
          (d) => d.episodes.length > 0 && d.episodes[0].url
        );

        if (append) {
          setDramas((prev) => [...prev, ...validDramas]);
        } else {
          setDramas(validDramas);
        }

        setHasMore(pageNum < result.data.pagecount);
        setError(null);
      } catch (err) {
        console.error("[Shorts Fetch Error]", err);
        if (!append) {
          setError("加载失败，请刷新重试");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // 初始加载
  useEffect(() => {
    fetchDramas(1, currentSource);
  }, [fetchDramas, currentSource]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchDramas(nextPage, currentSource, true);
    }
  }, [loadingMore, hasMore, page, fetchDramas, currentSource]);

  // 切换源
  const handleSourceChange = useCallback(
    (newSource: string) => {
      if (newSource !== currentSource) {
        setCurrentSource(newSource);
        setPage(1);
        setDramas([]);
        setHasMore(true);
      }
    },
    [currentSource]
  );

  // 加载状态
  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-white text-lg mb-4">{error}</p>
          <button
            onClick={() => fetchDramas(1, currentSource)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 空状态
  if (dramas.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 text-lg">暂无短剧内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden">
      <ShortDramaSwiper
        dramas={dramas}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        sources={sources}
        currentSource={currentSource}
        onSourceChange={handleSourceChange}
      />
    </div>
  );
}
