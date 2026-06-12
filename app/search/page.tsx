"use client";

import {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useTransition,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drama, VodSource } from "@/types/drama";
import DoubanCard from "@/components/DoubanCard";
import { useVodSources } from "@/hooks/useVodSources";
import { mutate } from "swr";

// SWR 缓存键前缀
const SWR_SEARCH_KEY_PREFIX = "search-results-";

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-8 gap-x-4 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-2/3 bg-gray-800/50 rounded-lg w-full" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-800/50 rounded w-3/4" />
            <div className="h-3 bg-gray-800/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKeyword = searchParams.get("q") || "";

  const [searchKeyword, setSearchKeyword] = useState(queryKeyword);
  const [searchResults, setSearchResults] = useState<
    (Drama & { source: VodSource })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 使用 SWR 缓存的视频源配置
  const { sources: allSources } = useVodSources();
  const [currentSource, setCurrentSource] = useState<VodSource | null>(null);
  const [searchStats, setSearchStats] = useState<{
    total: number;
    bySource: Record<string, number>;
  }>({ total: 0, bySource: {} });

  // 流式搜索进度
  const [searchProgress, setSearchProgress] = useState<{
    completed: number;
    total: number;
  }>({ completed: 0, total: 0 });

  // 使用 useTransition 让渲染不阻塞用户交互
  const [, startTransition] = useTransition();

  // 防止重复搜索
  const searchingRef = useRef<string | null>(null);

  // 同步 URL 参数到本地搜索框状态
  useEffect(() => {
    setSearchKeyword(queryKeyword);
  }, [queryKeyword]);

  // 执行流式搜索 - 每个源完成就立即显示结果
  const performSearch = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) return;

      setLoading(true);
      setSearched(true);
      setSearchResults([]);
      setSearchStats({ total: 0, bySource: {} });
      setSearchProgress({ completed: 0, total: 0 });

      try {
        console.log(`🔍 开始流式搜索: ${keyword}`);

        // 使用流式搜索 API
        const response = await fetch(
          `/api/drama/search-stream?q=${encodeURIComponent(keyword.trim())}`
        );

        if (!response.ok) {
          throw new Error("搜索请求失败");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("无法读取响应流");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 解析 SSE 数据
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // 保留未完成的部分

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "init") {
                  // 初始化：设置总源数（源列表来自 useVodSources hook）
                  console.log(`📡 开始搜索 ${data.totalSources} 个视频源`);
                  setSearchProgress({ completed: 0, total: data.totalSources });
                } else if (data.type === "result") {
                  // 收到单个源的结果 - 立即追加显示
                  console.log(
                    `  ✅ ${data.sourceName} 找到 ${data.count} 个结果`
                  );

                  startTransition(() => {
                    setSearchResults((prev) => [...prev, ...data.results]);
                    setSearchStats((prev) => ({
                      total: prev.total + data.count,
                      bySource: {
                        ...prev.bySource,
                        [data.sourceKey]: data.count,
                      },
                    }));
                  });

                  setSearchProgress((prev) => ({
                    ...prev,
                    completed: prev.completed + 1,
                  }));
                } else if (data.type === "done") {
                  console.log("📊 所有视频源搜索完成");

                  // 搜索完成后，使用 SWR mutate 缓存结果
                  setSearchResults((currentResults) => {
                    setSearchStats((currentStats) => {
                      // 缓存到 SWR
                      mutate(
                        `${SWR_SEARCH_KEY_PREFIX}${keyword}`,
                        {
                          results: currentResults,
                          stats: currentStats,
                        },
                        false
                      );
                      return currentStats;
                    });
                    return currentResults;
                  });
                }
              } catch (e) {
                console.error("解析 SSE 数据失败:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("搜索失败:", error);
        // 检查是否是因为没有配置视频源
        if (allSources.length === 0) {
          // 会在 UI 中显示配置提示
        }
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    [startTransition]
  );

  // 当搜索关键词变化时执行搜索
  useEffect(() => {
    if (queryKeyword && searchingRef.current !== queryKeyword) {
      searchingRef.current = queryKeyword;
      performSearch(queryKeyword);
    }
  }, [queryKeyword, performSearch]);

  // 处理搜索提交
  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchKeyword.trim())}`);
  };

  // 点击影片 - 清除旧缓存后跳转播放页面
  const handlePlayClick = (drama: Drama & { source: VodSource }) => {
    // 清除旧的 multi_source_matches 缓存，避免 SourceSelector 显示旧数据
    try {
      localStorage.removeItem("multi_source_matches");
    } catch {
      // 静默处理
    }

    router.push(`/play/${drama.id}?source=${drama.source.key}`);
  };

  // 返回首页
  const goBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-red-500/30 transition-colors duration-300">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-background/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800/50 shadow-lg transition-colors duration-300">
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {/* 返回按钮和Logo */}
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={goBack}
                className="p-2 -ml-2 rounded-full hover:bg-foreground/10 transition-colors group"
              >
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-foreground transition-colors"
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
              </button>
              <h1
                className="text-xl font-bold tracking-tight cursor-pointer hidden sm:block"
                onClick={goBack}
                style={{ fontFamily: '"Smiley Sans", sans-serif' }}
              >
                <span className="text-red-600">不看</span>
                <span className="text-foreground ml-1">搜索</span>
              </h1>
            </div>
            {/* 搜索框 */}
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-500 group-focus-within:text-red-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="搜索电影、电视剧、动漫..."
                  className="w-full bg-foreground/5 border border-gray-200 dark:border-white/10 rounded-full py-2.5 pl-12 pr-12 text-sm md:text-base text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-foreground/10 dark:focus:bg-white/10 transition-all duration-300"
                  autoFocus
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword("")}
                    className="absolute inset-y-0 right-14 pr-2 flex items-center"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="absolute inset-y-0 right-1.5 my-1.5 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors shadow-lg shadow-red-900/20"
                >
                  搜索
                </button>
              </div>
            </div>
            <div className="w-10 sm:w-[88px] shrink-0" />{" "}
            {/* Spacer for alignment */}
          </div>

          {/* 视频源筛选器 - 只有在有结果或有源时显示 */}
          {allSources.length > 0 && (
            <div className="mt-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max pb-1">
                <button
                  onClick={() => setCurrentSource(null)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentSource === null
                      ? "bg-foreground text-background dark:bg-white dark:text-black shadow-md"
                      : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                  }`}
                >
                  全部
                  <span className="ml-1.5 opacity-60">
                    {searchResults.length}
                  </span>
                </button>
                {allSources.map((source) => {
                  const count = searchStats.bySource[source.key] || 0;
                  if (count === 0 && searched && !loading) return null; // 搜索完成且无结果的源隐藏? 不，还是显示好，或者变灰

                  return (
                    <button
                      key={source.key}
                      onClick={() => setCurrentSource(source)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                        currentSource?.key === source.key
                          ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                          : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                      }`}
                    >
                      {source.name}
                      {count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            currentSource?.key === source.key
                              ? "bg-white/20 text-white"
                              : "bg-foreground/10 text-foreground/60"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[60vh]">
        {/* 状态反馈条 */}
        {(loading || searched) && (
          <div className="mb-8 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              {loading ? (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  正在从 {searchProgress.total} 个源中搜索...
                  <span className="ml-2 px-2 py-0.5 bg-foreground/5 rounded-md text-xs border border-gray-200 dark:border-white/5 transition-colors duration-300">
                    已完成 {searchProgress.completed}/{searchProgress.total}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-foreground font-medium">
                    {searchResults.length}
                  </span>{" "}
                  个结果
                  {queryKeyword && (
                    <>
                      · 关键词{" "}
                      <span className="text-foreground font-medium">
                        &ldquo;{queryKeyword}&rdquo;
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 结果展示 */}
        {allSources.length === 0 ? (
          // 无视频源配置
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">未配置视频源</h3>
            <p className="text-gray-400 mb-8 max-w-sm text-center">
              请先在后台管理中配置视频源后再使用搜索功能
            </p>
            <a
              href="/admin/settings"
              className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium rounded-full transition-colors duration-300"
            >
              前往配置
            </a>
          </div>
        ) : loading && searchResults.length === 0 ? (
          // 初始加载中 (Skeleton)
          <SearchSkeleton />
        ) : searched || searchResults.length > 0 ? (
          searchResults.length > 0 ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-8 gap-x-4">
                {searchResults
                  .filter(
                    (drama) =>
                      !currentSource || drama.source.key === currentSource.key
                  )
                  .map((drama, index) => {
                    const movieData = {
                      id: String(drama.id),
                      title: drama.name,
                      cover: drama.pic,
                      rate: drama.score || "",
                      episode_info: drama.remarks || drama.note || "",
                      is_new: false,
                      playable: true,
                      url: "",
                      cover_x: 0,
                      cover_y: 0,
                    };

                    return (
                      <div
                        key={`${drama.source.key}-${drama.id}-${index}`}
                        className="relative group z-0 hover:z-50"
                      >
                        <div className="absolute top-2 left-2 z-40 flex gap-1 pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-0.5 rounded-md shadow-xl">
                            {drama.source.name}
                          </div>
                        </div>
                        <DoubanCard
                          movie={movieData}
                          onSelect={() => handlePlayClick(drama)}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* 无结果 */
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                未找到相关内容
              </h3>
              <p className="text-gray-400 mb-2">
                在所有 {allSources.length} 个视频源中搜索 &ldquo;{queryKeyword}
                &rdquo; 没有结果
              </p>
              <p className="text-gray-500 text-sm mb-6">
                已搜索: {allSources.map((s) => s.name).join("、")}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBack}
                  className="px-6 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-gray-200 dark:border-white/10 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                >
                  返回首页
                </button>
                <button
                  onClick={() => setSearchKeyword("")}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  重新搜索
                </button>
              </div>
            </div>
          )
        ) : (
          /* 初始状态 */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-24 h-24 bg-foreground/5 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-12 h-12 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">搜索影视资源</h3>
            <p className="text-gray-400 mb-2">
              输入关键词，将在 {allSources.length} 个视频源中搜索
            </p>
            <p className="text-gray-500 text-sm">
              {allSources.map((s) => s.name).join("、")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-red-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg font-medium">加载中...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
