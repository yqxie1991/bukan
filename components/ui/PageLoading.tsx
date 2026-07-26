"use client";

interface PageLoadingProps {
  /** 加载提示文案 */
  message?: string;
}

/**
 * 全页加载状态组件
 * 统一的加载中展示 UI，带品牌色 spinner
 */
export function PageLoading({ message = "加载中..." }: PageLoadingProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-border-color border-t-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
