'use client';

import { useState } from 'react';
import { Play, Star } from 'lucide-react';
import { DoubanMovie } from '@/types/douban';
import { getImageUrl } from '@/lib/utils/image-utils';

interface DoubanCardProps {
  movie: DoubanMovie;
  onSelect: (movie: DoubanMovie) => void;
  /** 是否为首屏可见卡片，优先加载 */
  priority?: boolean;
}

export default function DoubanCard({ movie, onSelect, priority = false }: DoubanCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
 
  // 豆瓣图片使用代理
  const imageUrl = getImageUrl(movie.cover);

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:z-10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] rounded-xl"
    >
      {/* 海报图片 */}
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-foreground/5 dark:bg-surface border border-black/5 dark:border-white/5 transition-colors duration-300">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={movie.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 opacity-100`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setImageError(true);
              setIsLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 transition-transform duration-700 group-hover:scale-110">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 dark:bg-gray-800">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-black dark:border-t-white" />
          </div>
        )}

        {/* 评分标签 (毛玻璃效果) */}
        {movie.rate && (
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-yellow-400 text-sm font-bold flex items-center space-x-1 shadow-lg transform transition-transform duration-300 group-hover:scale-105 group-hover:bg-black/60">
            <Star className="w-4 h-4 fill-current" />
            <span>{movie.rate}</span>
          </div>
        )}

        {/* 悬浮播放按钮层 - 玻璃拟物风 (Glassmorphism) */}
        <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex-col justify-end p-4 pointer-events-none">
          <div className="flex items-center justify-center h-full w-full pointer-events-auto transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)">
            {/* 带有高光反射和柔和阴影的弹性播放按钮 */}
            <button className="flex items-center justify-center gap-2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/30 hover:scale-110 hover:border-white/50 hover:shadow-[0_8px_32px_rgba(255,255,255,0.2)] active:scale-95 transition-all duration-300 ease-out group/btn">
              <Play className="w-5 h-5 fill-current ml-1 group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* 常驻标题 - 微妙颜色渐变 */}
      <div className="mt-3 px-1 transform transition-transform duration-300 group-hover:translate-x-1">
        <h3 className="text-foreground text-sm md:text-[15px] font-semibold leading-tight line-clamp-1 transition-colors duration-300">
          {movie.title}
        </h3>
        {movie.episode_info && movie.episode_info.length > 0 && (
          <p className="text-muted-foreground text-xs mt-1 line-clamp-1 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0 group-hover:bg-foreground group-hover:shadow-[0_0_8px_rgba(255,255,255,0.4)] dark:group-hover:shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-300" />
            <span className="truncate">{movie.episode_info}</span>
          </p>
        )}
      </div>
    </div>
  );
}
