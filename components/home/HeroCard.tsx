"use client";

import { Play } from "lucide-react";
import type { DoubanMovie } from "@/types/douban";
import type { HeroData } from "@/types/home";
import { getImageUrl } from "@/lib/utils/image-utils";

interface HeroCardProps {
  movie: DoubanMovie;
  heroData: HeroData;
  isActive: boolean;
  isFirst: boolean;
  onMovieClick: (movie: DoubanMovie) => void;
}

/**
 * Hero Banner 中的单个展示卡片
 */
export function HeroCard({
  movie,
  heroData,
  isActive,
  isFirst,
  onMovieClick,
}: HeroCardProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 z-10" : "opacity-0 z-0"
      }`}
    >
      {/* 背景图层 */}
      <div className="absolute inset-0">
        {/* 移动端：9:16 竖向海报 */}
        <img
          src={getImageUrl(heroData.poster_vertical)}
          alt={movie.title}
          loading={isFirst ? "eager" : "lazy"}
          fetchPriority={isFirst ? "high" : "auto"}
          decoding="async"
          className="block md:hidden w-full h-full object-cover object-top"
        />

        {/* PC端：16:9 横向海报 */}
        <img
          src={getImageUrl(heroData.poster_horizontal)}
          alt={movie.title}
          loading={isFirst ? "eager" : "lazy"}
          fetchPriority={isFirst ? "high" : "auto"}
          decoding="async"
          className="hidden md:block w-full h-full object-cover object-top"
        />

        {/* 智能遮罩系统 */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent md:opacity-90" />
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent hidden md:block" />
      </div>

      {/* 内容区域 */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 md:px-12 lg:px-16 pb-16 md:pb-24">
          <div
            className={`max-w-3xl transform transition-all duration-700 delay-100 ${
              isActive
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            {/* 标题 */}
            <h1 className="text-2xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 leading-tight drop-shadow-xl line-clamp-2">
              {movie.title}
            </h1>

            {/* 元信息栏 */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6 text-xs md:text-base">
              {movie.rate && (
                <div className="flex items-center text-yellow-400 font-bold bg-black/30 px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-md">
                  <span className="text-sm md:text-lg">{movie.rate}</span>
                  <span className="text-[10px] md:text-xs ml-0.5">分</span>
                </div>
              )}

              {heroData.genres && heroData.genres.length > 0 && (
                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                  <span className="hidden md:inline text-gray-400">•</span>
                  {heroData.genres.slice(0, 3).map((genre: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-gray-200 shadow-black drop-shadow-md"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {movie.episode_info && (
                <>
                  <span className="hidden md:inline text-gray-400">•</span>
                  <span className="text-gray-300 bg-white/10 px-1.5 py-0.5 md:px-2 rounded text-[10px] md:text-xs backdrop-blur-sm">
                    {movie.episode_info}
                  </span>
                </>
              )}
            </div>

            {/* 简介 - 仅PC端显示 */}
            {heroData.description && (
              <p
                className="hidden md:block text-gray-300 text-base lg:text-lg mb-8 max-w-2xl leading-relaxed drop-shadow-md"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {heroData.description}
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => onMovieClick(movie)}
                className="group flex items-center gap-2 md:gap-3 bg-white/90 backdrop-blur-md border border-white/20 text-black px-5 py-2 md:px-8 md:py-3.5 rounded-lg md:rounded-2xl font-bold hover:bg-white hover:scale-[1.05] hover:shadow-[0_8px_30px_rgba(255,255,255,0.4)] active:scale-95 transition-all duration-400 ease-out"
              >
                <Play className="w-4 h-4 md:w-6 md:h-6 fill-black group-hover:scale-110 transition-all duration-300 ease-out" />
                <span className="text-sm md:text-lg">立即播放</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
