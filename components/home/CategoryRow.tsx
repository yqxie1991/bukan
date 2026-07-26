import { type ReactElement, useEffect, useRef, useState } from "react";
import type { DoubanMovie } from "@/types/douban";
import DoubanCard from "@/components/DoubanCard";

interface CategoryRowProps {
  title: string;
  icon: ReactElement;
  movies: DoubanMovie[];
  onMovieClick: (movie: DoubanMovie) => void;
  onViewMore: () => void;
}

export function CategoryRow({
  title,
  icon,
  movies,
  onMovieClick,
  onViewMore,
}: CategoryRowProps) {
  const INITIAL_DISPLAY_COUNT = 15;
  const displayMovies = movies.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = movies.length > INITIAL_DISPLAY_COUNT;

  const rowRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.02,
        rootMargin: "0px 0px -45px 0px",
      }
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={rowRef} className="px-4 md:px-12">
      {/* 标题和查看更多 */}
      <div 
        className={`flex items-center justify-between mb-4 transition-all duration-700 ease-out transform ${
          isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </h2>
        {hasMore && (
          <button
            onClick={onViewMore}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1 group px-3 py-2 -mr-3"
          >
            <span>查看全部</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 横向滚动列表 */}
      <div className="relative group/row">
        {/* 左侧渐变遮罩和滚动按钮 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            const row = rowRef.current?.querySelector('.category-scroll-container');
            if (row) row.scrollBy({ left: -row.clientWidth * 0.75, behavior: 'smooth' });
          }}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-foreground/10 hover:bg-primary text-foreground hover:text-primary-foreground rounded-full backdrop-blur-sm transition-all duration-300 opacity-0 group-hover/row:opacity-100 -ml-4"
          aria-label="向左滚动"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="category-scroll-container flex overflow-x-auto space-x-3 md:space-x-4 py-4 -my-4 scrollbar-hide scroll-smooth snap-x snap-mandatory">
          {displayMovies.map((movie, index) => (
            <div 
              key={movie.id} 
              className={`shrink-0 w-40 sm:w-48 md:w-56 snap-start transition-all duration-700 ease-out transform active:scale-95 ${
                isIntersecting 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-4 scale-95"
              }`}
              style={{ transitionDelay: `${index * 35}ms` }}
            >
              <DoubanCard movie={movie} onSelect={onMovieClick} />
            </div>
          ))}
        </div>

        {/* 右侧渐变遮罩和滚动按钮 */}
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            const row = rowRef.current?.querySelector('.category-scroll-container');
            if (row) row.scrollBy({ left: row.clientWidth * 0.75, behavior: 'smooth' });
          }}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-foreground/10 hover:bg-primary text-foreground hover:text-primary-foreground rounded-full backdrop-blur-sm transition-all duration-300 opacity-0 group-hover/row:opacity-100 -mr-4"
          aria-label="向右滚动"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
