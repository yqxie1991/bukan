"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DramaDetail, VodSource } from "@/types/drama";
import { UnifiedPlayer } from "@/components/player/UnifiedPlayer";
import { SourceSelector } from "@/components/player/SourceSelector";
import { PlayerSettingsPanel } from "@/components/player/PlayerSettingsPanel";
import { DanmakuSelector } from "@/components/player/DanmakuSelector";
import type { DanmakuItem } from "@/lib/player/danmaku-service";
import type { PlayerConfig } from "@/app/api/player-config/route";
import { ArrowLeft, X, ChevronLeft } from "lucide-react";

interface AvailableSource {
  source_key: string;
  source_name: string;
  vod_id: string | number;
  vod_name: string;
  match_confidence: "high" | "medium" | "low";
}

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dramaId = params.id as string;
  const currentSourceKey = searchParams.get("source");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dramaDetail, setDramaDetail] = useState<DramaDetail | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // 多源相关状态
  const [availableSources, setAvailableSources] = useState<AvailableSource[]>(
    []
  );

  // 视频源数据（从 API 获取）
  const [vodSources, setVodSources] = useState<VodSource[]>([]);
  const [selectedVodSource, setSelectedVodSource] = useState<VodSource | null>(
    null
  );
  const [currentVodSource, setCurrentVodSource] = useState<VodSource | null>(
    null
  );

  // 播放器配置和状态
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig | null>(null);
  const [playerMode, setPlayerMode] = useState<"iframe" | "local">("iframe");
  const [currentIframePlayerIndex, setCurrentIframePlayerIndex] = useState(0);

  // 弹幕状态
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [danmakuCount, setDanmakuCount] = useState(0);

  // 从 API 获取视频源配置
  useEffect(() => {
    const fetchVodSources = async () => {
      try {
        const response = await fetch("/api/vod-sources");
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200 && result.data) {
            setVodSources(result.data.sources || []);
            setSelectedVodSource(result.data.selected || null);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[VOD Sources Fetch Failed]", error);
        }
      }
    };
    fetchVodSources();
  }, []);

  // 加载播放器配置
  useEffect(() => {
    const fetchPlayerConfig = async () => {
      try {
        const response = await fetch("/api/player-config");
        const result = await response.json();
        if (result.code === 200 && result.data) {
          setPlayerConfig(result.data);
          // 根据配置决定初始模式 - 与 UnifiedPlayer.tsx 的 selectBestPlayerMode 保持一致
          if (result.data.mode === "auto") {
            // 检查是否有可用的 iframe 播放器
            const hasEnabledIframePlayers = result.data.iframePlayers?.some(
              (p: { enabled: boolean }) => p.enabled
            );
            // 检查是否启用了代理（本地播放器必需）
            const proxyEnabled = result.data.enableProxy;
            // 检查浏览器是否支持 HLS（MediaSource API）
            const supportsHLS =
              typeof window !== "undefined" && "MediaSource" in window;

            // 决策逻辑（与 UnifiedPlayer.tsx 完全一致）：
            // - 如果启用代理且浏览器支持 HLS，优先使用本地播放器
            // - 如果没有启用代理或不支持 HLS，使用 iframe 播放器
            // - 如果 iframe 播放器也没有可用的，降级到本地播放器
            if (proxyEnabled && supportsHLS) {
              setPlayerMode("local");
            } else if (hasEnabledIframePlayers) {
              setPlayerMode("iframe");
            } else {
              setPlayerMode("local");
            }
          } else {
            setPlayerMode(result.data.mode);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Player Config Fetch Failed]", error);
        }
      }
    };
    fetchPlayerConfig();
  }, []);

  // 加载多源数据
  useEffect(() => {
    try {
      const stored = localStorage.getItem("multi_source_matches");
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < 30 * 60 * 1000) {
          setAvailableSources(data.matches || []);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Multi-source Data Load Failed]", err);
      }
    }
  }, []);

  // 获取影视详情
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        let sourceKey = currentSourceKey;
        if (!sourceKey && availableSources.length > 0) {
          sourceKey = availableSources[0].source_key;
        }

        if (!sourceKey && selectedVodSource) {
          sourceKey = selectedVodSource.key;
        }

        const source = sourceKey
          ? vodSources.find((s) => s.key === sourceKey)
          : selectedVodSource;

        if (!source) {
          setError("未配置视频源，请先在后台管理中配置视频源");
          setLoading(false);
          return;
        }

        // 保存当前使用的视频源
        setCurrentVodSource(source);

        // 获取详情 - 查找当前源对应的 vod_name（用于代理搜索）
        // 优先从 availableSources 查找，如果为空则直接从 localStorage 查找
        let vodName: string | undefined;

        // 方法1：从 availableSources 查找
        const matchedSource = availableSources.find(
          (s) => s.source_key === source.key
        );
        vodName = matchedSource?.vod_name;

        // 方法2：如果 availableSources 为空，直接从 localStorage 查找
        if (!vodName) {
          try {
            const stored = localStorage.getItem("multi_source_matches");
            if (stored) {
              const data = JSON.parse(stored);
              if (data.matches && Array.isArray(data.matches)) {
                // 用 vod_id 和 source_key 同时匹配
                const match = data.matches.find(
                  (m: AvailableSource) =>
                    String(m.vod_id) === dramaId && m.source_key === source.key
                );
                vodName = match?.vod_name;
              }
            }
          } catch (e) {
            console.warn("[vodName lookup from localStorage failed]", e);
          }
        }

        if (process.env.NODE_ENV === "development") {
          console.log("📌 Debug - vodName:", vodName);
        }

        const response = await fetch("/api/drama/detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: dramaId,
            source: source,
            vodName: vodName, // 传递 vodName 用于代理搜索
            _t: Date.now(),
          }),
        });

        const result = await response.json();

        if (result.code !== 200) {
          throw new Error(result.msg || "获取影视详情失败");
        }

        const data = result.data;
        if (data && data.episodes && data.episodes.length > 0) {
          setDramaDetail(data);
        } else {
          setError("该影视暂无播放源");
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Drama Detail Fetch Failed]", err);
        }
        setError("获取影视详情失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    if (dramaId && vodSources.length > 0) {
      fetchDetail();
    }
  }, [
    dramaId,
    currentSourceKey,
    availableSources,
    vodSources,
    selectedVodSource,
  ]);

  // 切换视频源
  const switchSource = useCallback(
    (newSourceKey: string, newVodId: string | number) => {
      const url = `/play/${newVodId}?source=${newSourceKey}`;
      router.push(url);
    },
    [router]
  );

  // 选择集数
  const selectEpisode = useCallback(
    (index: number) => {
      if (index >= 0 && dramaDetail && index < dramaDetail.episodes.length) {
        setCurrentEpisode(index);
        // 切换集数时重置弹幕状态，让新集数可以自动加载
        setDanmakuList([]);
        setDanmakuCount(0);
      }
    },
    [dramaDetail]
  );

  // 上一集
  const previousEpisode = useCallback(() => {
    if (currentEpisode > 0) {
      selectEpisode(currentEpisode - 1);
    }
  }, [currentEpisode, selectEpisode]);

  // 下一集
  const nextEpisode = useCallback(() => {
    if (dramaDetail && currentEpisode < dramaDetail.episodes.length - 1) {
      selectEpisode(currentEpisode + 1);
    }
  }, [dramaDetail, currentEpisode, selectEpisode]);

  // 返回列表
  const goBack = useCallback(() => {
    router.push("/");
  }, [router]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          previousEpisode();
          break;
        case "ArrowDown":
          e.preventDefault();
          nextEpisode();
          break;
        case "ArrowLeft":
          e.preventDefault();
          previousEpisode();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextEpisode();
          break;
        case "Escape":
          goBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [previousEpisode, nextEpisode, goBack]);

  // 保存播放历史
  useEffect(() => {
    if (dramaDetail && typeof window !== "undefined") {
      try {
        const history = {
          id: dramaDetail.id,
          name: dramaDetail.name,
          episode: currentEpisode,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `play_history_${dramaDetail.id}`,
          JSON.stringify(history)
        );
      } catch {
        // 静默失败，不影响播放
      }
    }
  }, [dramaDetail, currentEpisode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-stone-300 border-t-amber-500 mx-auto mb-4" />
          <p className="text-stone-300 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-400"
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
          <p className="text-white text-xl mb-2">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!dramaDetail) {
    return null;
  }

  return (
    <div
      className="w-full h-screen"
      style={{
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundImage: "url(/movie-default-bg.jpg)",
      }}
    >
      {/* 顶部导航栏 - Netflix风格 */}
      <nav className="sticky top-0 z-450 bg-zinc-900/95 backdrop-blur-md border-b border-white/5">
        <div className="w-full mx-auto px-4 md:px-6 h-[48px] md:h-[64px] flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-white text-lg font-bold flex items-center gap-2 hover:text-red-500 transition-all duration-300 group"
          >
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-all duration-300">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">返回</span>
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            {/* 多源选择器 */}
            <SourceSelector
              sources={availableSources}
              currentSourceKey={currentSourceKey}
              onSourceChange={switchSource}
            />
            {/* 播放器设置 */}
            {playerConfig && (
              <PlayerSettingsPanel
                playerConfig={playerConfig}
                currentMode={playerMode}
                currentIframePlayerIndex={currentIframePlayerIndex}
                vodSource={currentVodSource}
                onModeChange={setPlayerMode}
                onIframePlayerChange={setCurrentIframePlayerIndex}
              />
            )}
            {/* 弹幕选择器 - 仅在本地模式下显示 */}
            {playerMode === "local" && dramaDetail && (
              <DanmakuSelector
                videoTitle={`${dramaDetail.name} - 第${currentEpisode + 1}集`}
                danmakuCount={danmakuCount}
                onDanmakuLoad={(danmaku) => {
                  setDanmakuList(danmaku);
                  setDanmakuCount(danmaku.length);
                }}
              />
            )}
            {/* 展开侧边栏按钮 */}
            {!isRightPanelOpen && (
              <button
                onClick={() => setIsRightPanelOpen(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all duration-300 group"
                title="打开侧边栏"
              >
                <ChevronLeft className="w-5 h-5 text-white group-hover:text-red-500 transform rotate-180" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 主内容区域 - 左右分栏布局 */}
      <div className="w-full mx-auto flex flex-col lg:flex-row gap-0 p-0 relative">
        {/* 左侧：视频播放器区域 */}
        <div
          className={`flex-1 transition-all duration-300 ${
            isRightPanelOpen
              ? "lg:min-h-[calc(100vh-65px)]"
              : "lg:h-[calc(100vh-65px)]"
          }`}
        >
          <div
            className={`relative w-full bg-black overflow-hidden ${
              isRightPanelOpen ? "aspect-video h-full" : "h-full"
            }`}
          >
            {dramaDetail && dramaDetail.episodes.length > 0 && (
              <UnifiedPlayer
                videoUrl={dramaDetail.episodes[currentEpisode].url}
                title={`${dramaDetail.name} - 第${currentEpisode + 1}集`}
                mode={playerMode}
                currentIframePlayerIndex={currentIframePlayerIndex}
                vodSource={currentVodSource}
                externalDanmaku={danmakuList}
                onDanmakuCountChange={setDanmakuCount}
                onProgress={() => {
                  // 播放进度更新
                }}
                onEnded={() => {
                  if (currentEpisode < dramaDetail.episodes.length - 1) {
                    selectEpisode(currentEpisode + 1);
                  }
                }}
                onIframePlayerSwitch={(index) => {
                  setCurrentIframePlayerIndex(index);
                }}
              />
            )}
          </div>

          {/* 视频下方信息 - 仅在移动端显示 */}
          <div className="lg:hidden p-4 bg-linear-to-b from-gray-900/90 to-gray-950/90 backdrop-blur-sm">
            <h1 className="text-sm font-bold text-white mb-2 tracking-tight">
              {dramaDetail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {dramaDetail.year && (
                <span className="px-2 py-1 bg-linear-to-r from-red-600 to-red-500 text-white font-semibold rounded-md shadow-lg shadow-red-500/30">
                  {dramaDetail.year}
                </span>
              )}
              {dramaDetail.type && (
                <span className="text-gray-300 font-medium">
                  {dramaDetail.type}
                </span>
              )}
              {dramaDetail.area && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-300 font-medium">
                    {dramaDetail.area}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：剧集信息和选择器 - Netflix风格 */}
        {isRightPanelOpen ? (
          <div className="w-full lg:w-[380px] xl:w-[420px] bg-zinc-900 overflow-y-auto lg:max-h-[calc(100vh-65px)] relative">
            {/* 关闭按钮 */}
            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="hidden sm:block absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 group"
              title="关闭侧边栏"
            >
              <X className="w-5 h-5 text-gray-300 group-hover:text-white" />
            </button>
            <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              {/* 查看全部集数模式 */}
              {showAllEpisodes ? (
                <div className="space-y-4 lg:space-y-6">
                  {/* 返回按钮和标题 */}
                  <div className="flex items-center justify-between sticky top-0 bg-zinc-900 pb-4 border-b border-white/10 z-10">
                    <button
                      onClick={() => setShowAllEpisodes(false)}
                      className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
                    >
                      <svg
                        className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="text-xs lg:text-sm font-semibold">
                        返回
                      </span>
                    </button>
                  </div>

                  {/* 剧集标题 */}
                  <div>
                    <h1 className="text-sm lg:text-2xl font-bold text-white mb-2 line-clamp-2 tracking-tight leading-tight">
                      {dramaDetail.name}
                    </h1>
                    <p className="text-xs lg:text-sm text-gray-400">选择集数</p>
                  </div>

                  {/* 所有集数网格 */}
                  <div className="grid grid-cols-4 gap-2.5 pb-6">
                    {dramaDetail.episodes.map((episode, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          selectEpisode(index);
                          setShowAllEpisodes(false);
                        }}
                        className={`aspect-video rounded-lg text-xs lg:text-sm flex flex-col items-center justify-center p-2 transition-all duration-300 group relative overflow-hidden ${
                          currentEpisode === index
                            ? "bg-linear-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-400 scale-105"
                            : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white hover:scale-105 backdrop-blur-sm"
                        }`}
                      >
                        {episode.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* 剧集标题和信息 - 仅在桌面端显示 */}
                  <div className="hidden lg:block animate-fade-in">
                    <h1 className="text-2xl font-bold text-white mb-4 line-clamp-2 tracking-tight leading-tight">
                      {dramaDetail.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
                      {dramaDetail.year && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-red-600 to-red-500 text-white font-semibold rounded-md shadow-lg shadow-red-500/30">
                          {dramaDetail.year}
                        </span>
                      )}
                      {dramaDetail.remarks && (
                        <span className="px-3 py-1.5 border border-white/20 text-gray-200 rounded-md font-medium backdrop-blur-sm bg-white/5">
                          {dramaDetail.remarks}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300 font-medium">
                      {dramaDetail.type && <span>{dramaDetail.type}</span>}
                      {dramaDetail.area && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{dramaDetail.area}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 演职人员 */}
                  {(dramaDetail.actor || dramaDetail.director) && (
                    <div className="space-y-3 text-xs lg:text-sm lg:border-t lg:border-white/10 lg:pt-6">
                      {dramaDetail.actor && (
                        <div className="group">
                          <span className="text-gray-400 font-semibold">
                            主演：
                          </span>
                          <span className="text-gray-200 group-hover:text-white transition-colors">
                            {dramaDetail.actor}
                          </span>
                        </div>
                      )}
                      {dramaDetail.director && (
                        <div className="group">
                          <span className="text-gray-400 font-semibold">
                            导演：
                          </span>
                          <span className="text-gray-200 group-hover:text-white transition-colors">
                            {dramaDetail.director}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 简介 */}
                  {dramaDetail.blurb && (
                    <div className="border-t border-white/10 pt-4 lg:pt-6">
                      <h3 className="text-xs lg:text-sm font-semibold text-gray-400 mb-2">
                        剧情简介
                      </h3>
                      <div className="relative">
                        <p
                          className={`text-xs lg:text-sm text-gray-300 leading-relaxed transition-all duration-300 ${
                            isDescriptionExpanded ? "" : "line-clamp-4"
                          }`}
                          dangerouslySetInnerHTML={{
                            __html: dramaDetail.blurb
                              .replace(/<[^>]*>/g, "")
                              .replace(/&nbsp;/g, " "),
                          }}
                        />
                        {dramaDetail.blurb.length > 100 && (
                          <button
                            onClick={() =>
                              setIsDescriptionExpanded(!isDescriptionExpanded)
                            }
                            className="mt-2 text-xs lg:text-sm text-red-500 hover:text-red-400 font-semibold transition-colors flex items-center gap-1 group"
                          >
                            {isDescriptionExpanded ? (
                              <>
                                <span>显示更少</span>
                                <svg
                                  className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </>
                            ) : (
                              <>
                                <span>显示更多</span>
                                <svg
                                  className="w-4 h-4 group-hover:translate-y-0.5 transition-transform"
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
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 选集区域 */}
                  <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs lg:text-sm font-bold text-white tracking-tight">
                        选集
                      </h2>
                    </div>

                    {/* 上一集/下一集按钮 */}
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={previousEpisode}
                        disabled={currentEpisode === 0}
                        className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-lg transition-all duration-300 text-xs lg:text-sm font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                      >
                        上一集
                      </button>
                      <button
                        onClick={nextEpisode}
                        disabled={
                          currentEpisode === dramaDetail.episodes.length - 1
                        }
                        className="flex-1 px-4 py-2.5 bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white rounded-lg transition-all duration-300 text-xs lg:text-sm font-semibold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:shadow-none"
                      >
                        下一集
                      </button>
                    </div>

                    {/* 集数预览（显示前12集） */}
                    <div className="grid grid-cols-4 gap-2.5 mb-4">
                      {dramaDetail.episodes
                        .slice(0, 12)
                        .map((episode, index) => (
                          <button
                            key={index}
                            onClick={() => selectEpisode(index)}
                            className={`rounded-lg flex flex-col text-xs lg:text-sm items-center justify-center p-2 transition-all duration-300 group relative overflow-hidden ${
                              currentEpisode === index
                                ? "bg-linear-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-400 scale-105"
                                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white hover:scale-105 backdrop-blur-sm"
                            }`}
                          >
                            {episode.name}
                          </button>
                        ))}
                    </div>

                    {/* 查看全部按钮 */}
                    {dramaDetail.episodes.length > 12 && (
                      <button
                        onClick={() => setShowAllEpisodes(true)}
                        className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 text-xs lg:text-sm font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                      >
                        <span>查看全部</span>
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
