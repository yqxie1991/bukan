"use client";

interface InlineErrorProps {
  /** 错误信息 */
  message?: string;
  /** 重试回调 */
  onRetry?: () => void;
}

/**
 * 行内/卡片级错误提示组件
 * 用于局部区域的错误展示，不影响整体页面
 */
export function InlineError({
  message = "加载失败",
  onRetry,
}: InlineErrorProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm text-muted-foreground flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary font-medium hover:opacity-80 transition-opacity flex-shrink-0"
        >
          重试
        </button>
      )}
    </div>
  );
}
