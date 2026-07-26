"use client";

interface PageEmptyProps {
  /** 空状态提示文案 */
  message?: string;
  /** 自定义标题 */
  title?: string;
  /** 操作按钮文案 */
  actionLabel?: string;
  /** 操作回调 */
  onAction?: () => void;
}

/**
 * 全页空状态组件
 * 统一的空数据展示 UI
 */
export function PageEmpty({
  message = "这里空空如也",
  title = "暂无内容",
  actionLabel = "刷新试试",
  onAction,
}: PageEmptyProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-muted-foreground/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="px-6 py-2.5 bg-surface text-foreground border border-border-color rounded-xl font-medium hover:bg-card-bg transition-colors text-sm"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
