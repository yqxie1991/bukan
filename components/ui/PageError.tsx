"use client";

interface PageErrorProps {
  /** 错误信息 */
  message?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 自定义标题 */
  title?: string;
}

/**
 * 全页错误状态组件
 * 统一的错误展示 UI，带重试按钮
 */
export function PageError({
  message = "加载失败，请稍后重试",
  onRetry,
  title = "出了点问题",
}: PageErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
          >
            重新加载
          </button>
        )}
      </div>
    </div>
  );
}
