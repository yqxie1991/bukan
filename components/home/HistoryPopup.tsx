"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { History, ChevronRight, Play } from "lucide-react";

// Popup 显示的最大数量
const MAX_POPUP_ITEMS = 5;

interface HistoryPopupProps {
  scrolled?: boolean;
}

export function HistoryPopup({ scrolled = false }: HistoryPopupProps) {
  const router = useRouter();
  const { history, isLoading } = useWatchHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 限制显示数量
  const displayHistory = history.slice(0, MAX_POPUP_ITEMS);
  const hasMore = history.length > MAX_POPUP_ITEMS;

  // 点击处理 - 移动端直接跳转
  const handleButtonClick = () => {
    if (isMobile) {
      router.push("/history");
    }
  };

  // 播放视频
  const handlePlay = (item: (typeof history)[0]) => {
    const url = item.sourceKey
      ? `/play/${item.id}?source=${item.sourceKey}&from=history`
      : `/play/${item.id}?from=history`;
    router.push(url);
    setIsOpen(false);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => !isMobile && setIsOpen(true)}
      onMouseLeave={() => !isMobile && setIsOpen(false)}
    >
      {/* 触发按钮 */}
      <button
        onClick={handleButtonClick}
        className={`p-2 rounded-full transition-colors relative ${
          scrolled
            ? "text-foreground hover:bg-foreground/5"
            : "text-white hover:bg-white/10"
        }`}
        aria-label="历史记录"
        aria-haspopup={!isMobile}
        aria-expanded={isOpen}
      >
        <History className="w-5 h-5 md:w-6 md:h-6" />
        {/* 有历史记录时显示小红点 */}
        {history.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Popup 弹出层 */}
      {isOpen && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="w-80 bg-card-bg rounded-xl shadow-2xl border border-border-color overflow-hidden">
            {/* 顶部红色装饰线 */}
            <div className="h-0.5 bg-red-600" />

            {/* 标题 */}
            <div className="px-4 py-3 border-b border-border-color">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-red-500" />
                最近观看
              </h3>
            </div>

            {/* 内容区域 */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-color border-t-primary mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">加载中…</p>
                </div>
              ) : history.length === 0 ? (
                <div className="p-6 text-center">
                  <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">暂无观看记录</p>
                </div>
              ) : (
                <div className="py-2">
                  {displayHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handlePlay(item)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-foreground/5 transition-colors text-left group"
                    >
                      {/* 封面缩略图 */}
                      <div className="w-12 h-16 rounded overflow-hidden bg-foreground/10 flex-shrink-0 relative">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : null}
                        {/* 播放图标 overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            第 {item.episode + 1} 集
                          </span>
                          {item.sourceName && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">
                                {item.sourceName}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(item.timestamp)}
                        </p>
                      </div>

                      {/* 箭头 */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 底部查看全部 */}
            {history.length > 0 && (
              <div className="border-t border-border-color">
                <Link
                  href="/history"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-center text-sm text-muted-foreground hover:text-primary hover:bg-foreground/5 transition-colors"
                >
                  {hasMore
                    ? `查看全部 ${history.length} 条记录`
                    : "管理历史记录"}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
