"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DoubanMovie } from "@/types/douban";
import type { HeroData } from "@/types/home";
import { SkeletonHero as HeroBannerSkeleton } from "@/components/ui/Skeleton";
import { HeroCard } from "./HeroCard";
import { useCarousel } from "@/hooks/useCarousel";

interface HeroBannerProps {
  heroMovies: DoubanMovie[];
  heroDataList: HeroData[];
  onMovieClick: (movie: DoubanMovie) => void;
}

export function HeroBanner({
  heroMovies,
  heroDataList,
  onMovieClick,
}: HeroBannerProps) {
  const { currentIndex, goTo, goToPrev, goToNext, swipeHandlers } = useCarousel({
    itemCount: heroMovies.length,
    interval: 5000,
  });

  if (heroMovies.length === 0 || heroDataList.length === 0) {
    return <HeroBannerSkeleton />;
  }

  // 移动端手势优化：将 swipeHandlers 绑定到容器上
  return (
    <div className="relative w-full group" {...swipeHandlers}>
      {/* 海报容器 */}
      <div className="relative w-full aspect-9/16 md:aspect-12/5 overflow-hidden">
        {/* 轮播图片 */}
        {heroMovies.map((movie, index) => (
          <HeroCard
            key={movie.id}
            movie={movie}
            heroData={heroDataList[index]}
            isActive={index === currentIndex}
            isFirst={index === 0}
            onMovieClick={onMovieClick}
          />
        ))}

        {/* 左右导航按钮 - 仅PC端悬停时显示 */}
        <button
          onClick={goToPrev}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100"
          aria-label="上一个"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100"
          aria-label="下一个"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* 指示器 - PC端居中底部，移动端右上角避免遮挡内容 */}
        <div className="absolute hidden md:flex bottom-6 left-1/2 -translate-x-1/2 z-20 items-center gap-2">
          {heroMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/50 hover:bg-white/75"
              } rounded-full`}
              aria-label={`跳转到第 ${index + 1} 个`}
            />
          ))}
        </div>

        {/* 移动端指示器 - 右上角小圆点，5个以内时显示 */}
        {heroMovies.length > 1 && heroMovies.length <= 8 && (
          <div className="absolute top-3 right-3 md:hidden z-20 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full">
            {heroMovies.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/50"
                }`}
                aria-label={`跳转到第 ${index + 1} 个`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
