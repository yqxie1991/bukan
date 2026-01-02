"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface Source {
  key: string;
  name: string;
}

interface ShortDramaOverlayProps {
  dramaName: string;
  episodeName: string;
  currentEpisode: number;
  totalEpisodes: number;
  isExploreMode: boolean;
  sources?: Source[];
  currentSource?: string;
  onSourceChange?: (source: string) => void;
  onModeChange?: (mode: "explore" | "watch") => void;
}

export function ShortDramaOverlay({
  dramaName,
  episodeName,
  currentEpisode,
  totalEpisodes,
  isExploreMode,
  sources = [],
  currentSource = "",
  onSourceChange,
  onModeChange,
}: ShortDramaOverlayProps) {
  const router = useRouter();
  const [showSourceSelector, setShowSourceSelector] = useState(false);

  // 获取当前源名称
  const currentSourceName =
    sources.find((s) => s.key === currentSource)?.name || "选择源";

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between">
      {/* 顶部区域 - 高z-index确保可点击 */}
      <div className="pt-safe-area-inset-top relative z-[60]">
        <div className="flex items-center justify-between p-4">
          {/* 返回按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.back();
            }}
            className="pointer-events-auto w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* TikTok风格中间标签 */}
          <div className="pointer-events-auto flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onModeChange?.("explore");
              }}
              className={`text-sm font-semibold transition-all ${
                isExploreMode
                  ? "text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              推荐
            </button>
            <div className="w-px h-4 bg-white/30" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onModeChange?.("watch");
              }}
              className={`text-sm font-semibold transition-all ${
                !isExploreMode
                  ? "text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {!isExploreMode
                ? `追剧中 ${currentEpisode}/${totalEpisodes}`
                : "追剧"}
            </button>
          </div>

          {/* 源选择器 */}
          {sources.length > 1 && (
            <div className="pointer-events-auto relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSourceSelector(!showSourceSelector);
                }}
                className="px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs flex items-center gap-1.5 hover:bg-black/60 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                <span>{currentSourceName}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${
                    showSourceSelector ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* 源下拉菜单 */}
              {showSourceSelector && (
                <div className="absolute top-full right-0 mt-2 py-1 bg-zinc-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-zinc-800 min-w-[100px] overflow-hidden z-[70]">
                  {/* Netflix风格红色顶部线 */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600" />
                  {sources.map((source) => (
                    <button
                      key={source.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSourceChange?.(source.key);
                        setShowSourceSelector(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        source.key === currentSource
                          ? "text-red-500 bg-red-500/10"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 如果只有一个源，显示占位 */}
          {sources.length <= 1 && <div className="w-10 h-10" />}
        </div>
      </div>

      {/* 底部区域 - 添加足够的底部间距避免被播放器控制栏遮挡 */}
      <div className="pb-safe-area-inset-bottom relative z-[60]">
        {/* 剧集信息 - 添加底部间距避开播放器控件 */}
        <div className="px-4 pb-20">
          <h2 className="text-white text-lg font-bold mb-1 drop-shadow-lg line-clamp-1">
            {dramaName}
          </h2>
          <p className="text-white/80 text-sm drop-shadow-md">
            {episodeName}
            {!isExploreMode && ` · 共${totalEpisodes}集`}
          </p>

          {/* 滑动提示 */}
          <div className="mt-3">
            <div className="inline-flex items-center gap-1 text-white/50 text-xs">
              <svg
                className="w-4 h-4 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span>
                {isExploreMode ? "下滑看更多短剧" : "上下滑动切换集数"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
