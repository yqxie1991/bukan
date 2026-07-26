/**
 * 通用骨架屏原子组件
 * 可组合为各种骨架屏布局
 */

interface SkeletonProps {
  className?: string;
}

/** 基础骨架块 - 带闪烁动画 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-foreground/10 animate-pulse rounded ${className}`}
    />
  );
}

/** 影片卡片骨架屏 */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex-shrink-0 ${className}`}>
      {/* 海报骨架 */}
      <div className="relative aspect-[2/3] bg-gradient-to-br from-zinc-950 via-black to-zinc-950 rounded-lg overflow-hidden">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>
      {/* 标题骨架 */}
      <Skeleton className="h-5 md:h-6 w-3/4 mt-2" />
      {/* 评分骨架 */}
      <Skeleton className="h-4 w-1/2 mt-1.5 bg-foreground/5" />
    </div>
  );
}

/** 分类行骨架屏 */
export function SkeletonRow({
  cardCount = 15,
  cardWidth = "w-40 sm:w-48 md:w-56",
}: {
  cardCount?: number;
  cardWidth?: string;
}) {
  return (
    <div className="px-4 md:px-12">
      {/* 分类标题骨架 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded" />
          <Skeleton className="h-7 md:h-8 w-32 md:w-40 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-20 bg-foreground/5" />
      </div>

      {/* 影片卡片行 */}
      <div className="flex overflow-x-auto space-x-3 md:space-x-4 pb-4 scrollbar-hide">
        {Array.from({ length: cardCount }).map((_, j) => (
          <SkeletonCard key={j} className={cardWidth} />
        ))}
      </div>
    </div>
  );
}

/** Hero Banner 骨架屏 */
export function SkeletonHero() {
  return (
    <div className="relative w-full aspect-[3/4] md:aspect-[12/5] overflow-hidden bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      {/* 动画光效 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100%] animate-[spin_3s_linear_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/70 md:via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

      {/* 内容骨架 */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 md:px-12 pb-8 md:pb-12 lg:pb-16">
          <div className="max-w-3xl space-y-3 md:space-y-4">
            <Skeleton className="h-12 md:h-16 w-3/4 rounded-lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="hidden md:block space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Skeleton className="h-12 md:h-14 w-36 md:w-40 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* 轮播指示器骨架 */}
      <div className="absolute hidden md:flex bottom-6 left-1/2 -translate-x-1/2 items-center gap-2 z-20">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`${i === 0 ? "w-8 h-2" : "w-2 h-2"} bg-white/30 rounded-full animate-pulse`}
          />
        ))}
      </div>
    </div>
  );
}
