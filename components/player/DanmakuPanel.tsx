"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  AlertCircle,
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

interface DanmakuPanelProps {
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDanmakuLoad: (danmaku: DanmakuItem[]) => void;
}

export function DanmakuPanel({
  videoTitle,
  isOpen,
  onClose,
  onDanmakuLoad,
}: DanmakuPanelProps) {
  // 状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [isLoadingDanmaku, setIsLoadingDanmaku] = useState(false);
  const [danmakuCount, setDanmakuCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnimeList, setShowAnimeList] = useState(false);

  // 初始化搜索关键词
  useEffect(() => {
    if (videoTitle && isOpen) {
      const keyword = extractSearchKeyword(videoTitle);
      setSearchKeyword(keyword);
    }
  }, [videoTitle, isOpen]);

  // 搜索动漫
  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    setError(null);
    setAnimes([]);
    setSelectedAnime(null);
    setEpisodes([]);
    setSelectedEpisode(null);
    setDanmakuCount(null);

    try {
      const results = await searchAnime(searchKeyword);
      if (results.length === 0) {
        setError("未找到匹配的动漫，请尝试其他关键词");
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
    setDanmakuCount(null);
    setError(null);

    try {
      const bangumi = await getBangumi(anime.animeId);
      if (bangumi && bangumi.episodes.length > 0) {
        setEpisodes(bangumi.episodes);
        // 自动选择第一集
        setSelectedEpisode(bangumi.episodes[0]);
      } else {
        setError("未找到剧集信息");
      }
    } catch {
      setError("获取剧集失败，请重试");
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
      setDanmakuCount(danmaku.length);
      onDanmakuLoad(danmaku);
    } catch {
      setError("加载弹幕失败，请重试");
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

  if (!isOpen) return null;

  return (
    <>
      {/* 移动端背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-[99] sm:hidden"
        onClick={onClose}
      />

      {/* 面板主体：移动端全屏fixed，桌面端侧边absolute */}
      <div className="fixed inset-0 sm:absolute sm:inset-auto sm:top-0 sm:right-0 sm:w-80 sm:h-full bg-black/95 sm:bg-black/90 backdrop-blur-sm z-[100] sm:z-50 flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 sm:p-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <MessageSquare size={20} className="sm:w-[18px] sm:h-[18px]" />
            <span className="font-medium text-base sm:text-sm">弹幕搜索</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1 hover:bg-white/10 active:bg-white/20 rounded-lg sm:rounded transition-colors"
          >
            <X size={22} className="sm:w-[18px] sm:h-[18px] text-white/70" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 sm:p-3 border-b border-white/10">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入动漫名称搜索"
                className="w-full px-4 sm:px-3 py-3 sm:py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white text-base sm:text-sm placeholder:text-white/40 focus:outline-none focus:border-red-500/50"
              />
              {isSearching && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 animate-spin"
                />
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchKeyword.trim()}
              className="px-4 sm:px-3 py-3 sm:py-2 min-w-[48px] bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Search size={18} className="sm:w-4 sm:h-4 text-white" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 已选动漫 */}
          {selectedAnime && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAnimeList(!showAnimeList)}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  {selectedAnime.imageUrl && (
                    <img
                      src={selectedAnime.imageUrl}
                      alt={selectedAnime.animeTitle}
                      className="w-10 h-14 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {selectedAnime.animeTitle}
                    </div>
                    <div className="text-white/50 text-xs">
                      {selectedAnime.episodeCount} 集 · {selectedAnime.source}
                    </div>
                  </div>
                </div>
                {showAnimeList ? (
                  <ChevronUp size={16} className="text-white/50" />
                ) : (
                  <ChevronDown size={16} className="text-white/50" />
                )}
              </button>
            </div>
          )}

          {/* 动漫列表 */}
          {showAnimeList && animes.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {animes.map((anime) => (
                <button
                  key={anime.animeId}
                  onClick={() => handleSelectAnime(anime)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    selectedAnime?.animeId === anime.animeId
                      ? "bg-red-500/30 border border-red-500/50"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {anime.imageUrl && (
                    <img
                      src={anime.imageUrl}
                      alt={anime.animeTitle}
                      className="w-8 h-11 object-cover rounded"
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
              <div className="text-white/70 text-xs font-medium">选择剧集</div>
              {isLoadingEpisodes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="text-white/50 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5">
                  {episodes.map((episode) => (
                    <button
                      key={episode.episodeId}
                      onClick={() => setSelectedEpisode(episode)}
                      className={`px-2 py-1.5 text-xs rounded transition-colors ${
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

          {/* 弹幕数量和加载按钮 */}
          {selectedEpisode && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleLoadDanmaku}
                disabled={isLoadingDanmaku}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isLoadingDanmaku ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MessageSquare size={16} />
                )}
                <span className="text-white text-sm font-medium">
                  {isLoadingDanmaku ? "加载中..." : "加载弹幕"}
                </span>
              </button>

              {danmakuCount !== null && (
                <div className="text-center text-green-400 text-sm">
                  ✓ 已加载 {danmakuCount} 条弹幕
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
