import { SkeletonHero, SkeletonRow } from "@/components/ui/Skeleton";

export function LoadingSkeleton() {
  return (
    <div>
      {/* Hero 骨架屏 */}
      <SkeletonHero />

      {/* 分类骨架屏 - 10个分类 */}
      <div className="relative z-20 mt-6 sm:-mt-4 md:-mt-4 lg:-mt-4 space-y-10 md:space-y-12 lg:space-y-16 pb-16">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
