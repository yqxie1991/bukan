"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ShortDramaPlayer } from "./ShortDramaPlayer";
import { ShortDramaOverlay } from "./ShortDramaOverlay";

export interface Episode {
  name: string;
  url: string;
}

export interface ShortDrama {
  vod_id: number;
  vod_name: string;
  vod_pic: string;
  vod_remarks: string;
  episodes: Episode[];
}

interface Source {
  key: string;
  name: string;
}

interface ShortDramaSwiperProps {
  dramas: ShortDrama[];
  onLoadMore: () => void;
  hasMore: boolean;
  sources?: Source[];
  currentSource?: string;
  onSourceChange?: (source: string) => void;
}

export function ShortDramaSwiper({
  dramas,
  onLoadMore,
  hasMore,
  sources = [],
  currentSource = "",
  onSourceChange,
}: ShortDramaSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 当前活跃索引
  const [activeIndex, setActiveIndex] = useState(0);

  // 模式状态：explore = 探索不同短剧，watch = 追剧模式（同一短剧不同集数）
  const [mode, setMode] = useState<"explore" | "watch">("explore");

  // 当前追剧的短剧索引和集数索引
  const [currentDramaIndex, setCurrentDramaIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  // 进度状态
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // 获取当前显示的项目列表
  const getDisplayItems = useCallback(() => {
    if (mode === "explore") {
      // 探索模式：显示每个短剧的第1集
      return dramas.map((drama) => ({
        drama,
        episode: drama.episodes[0],
        episodeIndex: 0,
      }));
    } else {
      // 追剧模式：显示当前短剧的所有集数
      const currentDrama = dramas[currentDramaIndex];
      if (!currentDrama) return [];

      return currentDrama.episodes.map((episode, index) => ({
        drama: currentDrama,
        episode,
        episodeIndex: index,
      }));
    }
  }, [mode, dramas, currentDramaIndex]);

  const displayItems = getDisplayItems();

  // 处理滚动
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (
      newIndex !== activeIndex &&
      newIndex >= 0 &&
      newIndex < displayItems.length
    ) {
      setActiveIndex(newIndex);

      // 接近底部时加载更多
      if (
        mode === "explore" &&
        newIndex >= displayItems.length - 3 &&
        hasMore
      ) {
        onLoadMore();
      }
    }
  }, [activeIndex, displayItems.length, mode, hasMore, onLoadMore]);

  // 处理视频播放完成
  const handleVideoEnded = useCallback(() => {
    if (mode === "explore") {
      // 探索模式下播放完成，进入追剧模式
      const currentDrama = dramas[activeIndex];
      if (currentDrama && currentDrama.episodes.length > 1) {
        setMode("watch");
        setCurrentDramaIndex(activeIndex);
        setCurrentEpisodeIndex(1); // 从第2集开始
        setActiveIndex(1);

        // 滚动到第2集位置
        setTimeout(() => {
          const container = containerRef.current;
          if (container) {
            container.scrollTo({
              top: container.clientHeight,
              behavior: "smooth",
            });
          }
        }, 100);
      } else {
        // 只有1集，直接切换到下一部短剧
        if (activeIndex < dramas.length - 1) {
          setActiveIndex(activeIndex + 1);
          containerRef.current?.scrollTo({
            top: (activeIndex + 1) * containerRef.current.clientHeight,
            behavior: "smooth",
          });
        }
      }
    } else {
      // 追剧模式下播放完成
      const currentDrama = dramas[currentDramaIndex];
      if (!currentDrama) return;

      if (activeIndex < currentDrama.episodes.length - 1) {
        // 还有下一集，自动播放
        const nextIndex = activeIndex + 1;
        setActiveIndex(nextIndex);
        setCurrentEpisodeIndex(nextIndex);
        containerRef.current?.scrollTo({
          top: nextIndex * containerRef.current.clientHeight,
          behavior: "smooth",
        });
      } else {
        // 当前剧播完了，切换到下一部短剧
        if (currentDramaIndex < dramas.length - 1) {
          setMode("explore");
          setActiveIndex(currentDramaIndex + 1);
          setCurrentDramaIndex(currentDramaIndex + 1);
          setCurrentEpisodeIndex(0);

          // 需要等模式切换后再滚动
          setTimeout(() => {
            containerRef.current?.scrollTo({
              top: (currentDramaIndex + 1) * containerRef.current.clientHeight,
              behavior: "smooth",
            });
          }, 100);
        }
      }
    }
  }, [mode, activeIndex, dramas, currentDramaIndex]);

  // 处理进度更新
  const handleProgress = useCallback(
    (currentTime: number, totalDuration: number) => {
      setProgress(totalDuration > 0 ? currentTime / totalDuration : 0);
      setDuration(totalDuration);
    },
    []
  );

  // 监听滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // 模式切换时重置滚动位置
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
      setActiveIndex(
        mode === "watch" ? currentEpisodeIndex : currentDramaIndex
      );
    }
  }, [mode, currentDramaIndex, currentEpisodeIndex]);

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollBehavior: "smooth" }}
    >
      {displayItems.map((item, index) => (
        <div
          key={`${mode}-${item.drama.vod_id}-${item.episodeIndex}`}
          className="h-[100dvh] w-full snap-start snap-always relative"
        >
          {/* 只渲染可视区域附近的视频 */}
          {Math.abs(index - activeIndex) <= 1 && (
            <>
              <ShortDramaPlayer
                videoUrl={item.episode.url}
                isActive={index === activeIndex}
                onEnded={handleVideoEnded}
                onProgress={handleProgress}
              />

              <ShortDramaOverlay
                dramaName={item.drama.vod_name}
                episodeName={item.episode.name}
                currentEpisode={item.episodeIndex + 1}
                totalEpisodes={item.drama.episodes.length}
                isExploreMode={mode === "explore"}
                sources={sources}
                currentSource={currentSource}
                onSourceChange={onSourceChange}
                onModeChange={(newMode) => {
                  if (newMode === "explore" && mode !== "explore") {
                    setMode("explore");
                    setActiveIndex(currentDramaIndex);
                  } else if (newMode === "watch" && mode !== "watch") {
                    // 进入追剧模式，显示当前短剧的所有集数
                    const currentDrama =
                      dramas[activeIndex] || dramas[currentDramaIndex];
                    if (currentDrama && currentDrama.episodes.length > 1) {
                      setMode("watch");
                      setCurrentDramaIndex(activeIndex);
                      setCurrentEpisodeIndex(0);
                      setActiveIndex(0);
                    }
                  }
                }}
              />
            </>
          )}

          {/* 占位符 - 未渲染的视频 */}
          {Math.abs(index - activeIndex) > 1 && (
            <div className="h-full w-full bg-black flex items-center justify-center">
              <div className="text-white/50 text-sm">{item.drama.vod_name}</div>
            </div>
          )}
        </div>
      ))}

      {/* 加载更多提示 */}
      {hasMore && mode === "explore" && (
        <div className="h-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
