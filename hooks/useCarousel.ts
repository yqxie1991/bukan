"use client";

import { useState, useEffect, useCallback } from "react";

interface UseCarouselOptions {
  /** 轮播项总数 */
  itemCount: number;
  /** 自动轮播间隔（毫秒，默认 5000） */
  interval?: number;
  /** 是否启用自动轮播（默认 true） */
  autoPlay?: boolean;
}

interface UseCarouselReturn {
  /** 当前索引 */
  currentIndex: number;
  /** 跳转到指定索引 */
  goTo: (index: number) => void;
  /** 上一项 */
  goToPrev: () => void;
  /** 下一项 */
  goToNext: () => void;
  /** 滑动手势处理器 */
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * 通用轮播逻辑 hook
 * 包含自动轮播、页面可见性暂停、手动切换
 */
export function useCarousel({
  itemCount,
  interval = 5000,
  autoPlay = true,
}: UseCarouselOptions): UseCarouselReturn {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 自动轮播 - 页面不可见时暂停
  useEffect(() => {
    if (!autoPlay || itemCount <= 1) return;

    let timer: NodeJS.Timeout;

    const startTimer = () => {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % itemCount);
      }, interval);
    };

    const stopTimer = () => {
      clearInterval(timer);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [itemCount, interval, autoPlay]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, itemCount - 1)));
    },
    [itemCount]
  );

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? itemCount - 1 : prev - 1));
  }, [itemCount]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % itemCount);
  }, [itemCount]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  return { 
    currentIndex, 
    goTo, 
    goToPrev, 
    goToNext,
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  };
}
