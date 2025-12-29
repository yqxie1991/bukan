"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  searchAnime,
  getBangumi,
  getComments,
  extractSearchKeyword,
  type Anime,
  type Episode,
  type DanmakuItem,
} from "@/lib/player/danmaku-service";

// 自定义弹幕图标 - 类似屏幕上有文字飘过的样式
function DanmakuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 屏幕边框 */}
      <rect x="2" y="4" width="20" height="14" rx="2" ry="2" />
      {/* 弹幕文字线条 */}
      <line x1="5" y1="8" x2="12" y2="8" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="5" y1="14" x2="11" y2="14" />
      {/* 底座 */}
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

interface DanmakuSelectorProps {
  videoTitle: string;
  danmakuCount: number;
  onDanmakuLoad: (danmaku: DanmakuItem[]) => void;
}

export function DanmakuSelector({
  videoTitle,
  danmakuCount,
  onDanmakuLoad,
}: DanmakuSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [isLoadingDanmaku, setIsLoadingDanmaku] = useState(false);
  const [loadedCount, setLoadedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnimeList, setShowAnimeList] = useState(false);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 打开时初始化搜索关键词
  useEffect(() => {
    if (isOpen && videoTitle && !searchKeyword) {
      const keyword = extractSearchKeyword(videoTitle);
      setSearchKeyword(keyword);
    }
  }, [isOpen, videoTitle, searchKeyword]);

  // 搜索动漫
  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    setError(null);
    setAnimes([]);
    setSelectedAnime(null);
    setEpisodes([]);
    setSelectedEpisode(null);
    setLoadedCount(null);

    try {
      const results = await searchAnime(searchKeyword);
      if (results.length === 0) {
        setError("未找到匹配的动漫");
      } else {
        setAnimes(results);
        setShowAnimeList(true);
      }
    } catch {
      setError("搜索失败，请重试");
    } finally {
      setIsSearching(false);
    }
  }, [searchKeyword]);

  // 选择动漫
  const handleSelectAnime = useCallback(async (anime: Anime) => {
    setSelectedAnime(anime);
    setShowAnimeList(false);
    setIsLoadingEpisodes(true);
    setEpisodes([]);
    setSelectedEpisode(null);
    setLoadedCount(null);
    setError(null);

    try {
      const bangumi = await getBangumi(anime.animeId);
      if (bangumi && bangumi.episodes.length > 0) {
        setEpisodes(bangumi.episodes);
        setSelectedEpisode(bangumi.episodes[0]);
      } else {
        setError("未找到剧集信息");
      }
    } catch {
      setError("获取剧集失败");
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, []);

  // 加载弹幕
  const handleLoadDanmaku = useCallback(async () => {
    if (!selectedEpisode) return;

    setIsLoadingDanmaku(true);
    setError(null);

    try {
      const danmaku = await getComments(selectedEpisode.episodeId);
      setLoadedCount(danmaku.length);
      onDanmakuLoad(danmaku);
    } catch {
      setError("加载弹幕失败");
    } finally {
      setIsLoadingDanmaku(false);
    }
  }, [selectedEpisode, onDanmakuLoad]);

  // 按回车搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-2 px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-105 text-white text-xs md:text-sm font-medium shadow-lg backdrop-blur-sm"
        aria-label="弹幕设置"
        aria-expanded={isOpen}
      >
        <DanmakuIcon
          className={`w-5 h-5 transition-transform ${
            isOpen ? "rotate-12" : ""
          }`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in z-50">
          {/* 头部 */}
          <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-transparent">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <DanmakuIcon className="w-4 h-4 text-red-500" />
                <span>弹幕搜索</span>
              </h3>
              {danmakuCount > 0 && (
                <span className="text-xs text-green-400">
                  已加载 {danmakuCount} 条
                </span>
              )}
            </div>
          </div>

          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入动漫名称搜索"
                  className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-red-500/50"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 animate-spin" />
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchKeyword.trim()}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="max-h-[50vh] overflow-y-auto p-3 space-y-3">
            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 已选动漫 */}
            {selectedAnime && (
              <button
                onClick={() => setShowAnimeList(!showAnimeList)}
                className="w-full flex items-center justify-between p-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2 text-left min-w-0">
                  {selectedAnime.imageUrl && (
                    <img
                      src={selectedAnime.imageUrl}
                      alt={selectedAnime.animeTitle}
                      className="w-8 h-10 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">
                      {selectedAnime.animeTitle}
                    </div>
                    <div className="text-white/50 text-xs">
                      {selectedAnime.episodeCount} 集
                    </div>
                  </div>
                </div>
                {showAnimeList ? (
                  <ChevronUp className="w-4 h-4 text-white/50 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/50 flex-shrink-0" />
                )}
              </button>
            )}

            {/* 动漫列表 */}
            {showAnimeList && animes.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {animes.map((anime) => (
                  <button
                    key={anime.animeId}
                    onClick={() => handleSelectAnime(anime)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      selectedAnime?.animeId === anime.animeId
                        ? "bg-red-500/30 border border-red-500/50"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {anime.imageUrl && (
                      <img
                        src={anime.imageUrl}
                        alt={anime.animeTitle}
                        className="w-6 h-8 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-white text-xs truncate">
                        {anime.animeTitle}
                      </div>
                      <div className="text-white/40 text-xs">
                        {anime.episodeCount} 集
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 剧集选择 */}
            {episodes.length > 0 && (
              <div className="space-y-2">
                <div className="text-white/70 text-xs font-medium">
                  选择剧集
                </div>
                {isLoadingEpisodes ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-1">
                    {episodes.map((episode) => (
                      <button
                        key={episode.episodeId}
                        onClick={() => setSelectedEpisode(episode)}
                        className={`px-1.5 py-1 text-xs rounded transition-colors ${
                          selectedEpisode?.episodeId === episode.episodeId
                            ? "bg-red-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                        title={episode.episodeTitle}
                      >
                        {episode.episodeNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 加载弹幕按钮 */}
            {selectedEpisode && (
              <button
                onClick={handleLoadDanmaku}
                disabled={isLoadingDanmaku}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isLoadingDanmaku ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DanmakuIcon className="w-4 h-4" />
                )}
                <span className="text-white text-sm font-medium">
                  {isLoadingDanmaku ? "加载中..." : "加载弹幕"}
                </span>
              </button>
            )}

            {/* 加载成功提示 */}
            {loadedCount !== null && (
              <div className="text-center text-green-400 text-xs">
                ✓ 已加载 {loadedCount} 条弹幕
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
