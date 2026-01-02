"use client";

import { useRouter } from "next/navigation";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { History, X, ChevronRight, Trash2 } from "lucide-react";

export function WatchHistory() {
  const router = useRouter();
  const { history, isLoading, removeHistory, clearAllHistory } =
    useWatchHistory();

  // 如果加载中或没有历史记录，不显示
  if (isLoading || history.length === 0) {
    return null;
  }

  const handleClick = (item: (typeof history)[0]) => {
    // 跳转到播放页面，带上 source 和 from=history 参数
    const url = item.sourceKey
      ? `/play/${item.id}?source=${item.sourceKey}&from=history`
      : `/play/${item.id}?from=history`;
    router.push(url);
  };

  const handleRemove = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    removeHistory(id);
  };

  return (
    <div className="px-4 md:px-12">
      {/* 标题和清除全部 - 与 CategoryRow 保持一致 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <History className="w-6 h-6 text-red-500" />
          <span>继续观看</span>
        </h2>
        <button
          onClick={clearAllHistory}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1 group"
        >
          <span>清除全部</span>
          <Trash2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 横向滚动列表 - 与 CategoryRow 保持一致 */}
      <div className="relative group">
        <div className="flex overflow-x-auto space-x-3 md:space-x-4 pb-4 scrollbar-hide scroll-smooth">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className="shrink-0 w-40 sm:w-48 md:w-56 cursor-pointer group/card"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg transition-all duration-300 group-hover/card:shadow-xl group-hover/card:shadow-red-500/20 group-hover/card:scale-105">
                {/* 封面图 - 添加 referrerPolicy 绕过防盗链 */}
                <img
                  src={item.cover || ""}
                  alt={item.name}
                  className={`w-full h-full object-cover ${
                    !item.cover ? "hidden" : ""
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // 图片加载失败时隐藏 img 标签
                    const target = e.target as HTMLImageElement;
                    target.classList.add("hidden");
                  }}
                />
                {/* Fallback 占位 - 当图片失败或不存在时始终在底层显示 */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 -z-10">
                  <span className="text-gray-400 text-sm text-center px-2">
                    {item.name}
                  </span>
                </div>

                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* 播放源标签 */}
                {item.sourceName && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-0.5 rounded-md shadow-xl">
                      {item.sourceName}
                    </span>
                  </div>
                )}

                {/* 播放进度指示 */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium line-clamp-1 mb-1">
                    {item.name}
                  </p>
                  <p className="text-gray-300 text-xs">
                    看到第 {item.episode + 1} 集
                  </p>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full opacity-0 group-hover/card:opacity-100 transition-all duration-200"
                  title="移除"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>

                {/* 继续播放按钮 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                  <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg shadow-red-500/50">
                    <ChevronRight className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
