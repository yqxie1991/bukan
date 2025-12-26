import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// 存储滚动位置的 Map（使用全局变量而不是 sessionStorage 避免性能问题）
const scrollPositions = new Map<string, number>();

/**
 * 滚动位置恢复 Hook
 * 
 * 保存当前页面滚动位置，在页面重新挂载时恢复
 * 
 * @param key - 可选的自定义键名，默认使用路径名
 * @param options - 配置选项
 */
export function useScrollRestoration(
  key?: string,
  options: { 
    delay?: number;  // 恢复延迟（毫秒）
    behavior?: ScrollBehavior;  // 滚动行为
    enabled?: boolean; // 是否启用（用于等待加载完成）
  } = {}
) {
  const pathname = usePathname();
  const storageKey = key || pathname;
  const restoredRef = useRef(false);
  const { delay = 0, behavior = 'instant', enabled = true } = options;

  // 保存当前滚动位置
  const saveScrollPosition = useCallback(() => {
    const position = window.scrollY;
    if (position > 0) {
      scrollPositions.set(storageKey, position);
    }
  }, [storageKey]);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    const position = scrollPositions.get(storageKey);
    if (position !== undefined && position > 0) {
      const restore = () => {
        window.scrollTo({ top: position, behavior });
        restoredRef.current = true;
      };
      
      if (delay > 0) {
        setTimeout(restore, delay);
      } else {
        // 使用 requestAnimationFrame 确保 DOM 已渲染
        requestAnimationFrame(restore);
      }
    }
  }, [storageKey, delay, behavior]);

  // 当 enabled 变为 true 时恢复滚动位置（用于等待加载完成）
  useEffect(() => {
    if (enabled && !restoredRef.current) {
      restoreScrollPosition();
    }
  }, [enabled, restoreScrollPosition]);

  // 滚动时保存位置，卸载时保存
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      // 卸载时保存最终位置
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

  // 手动保存位置
  const save = useCallback(() => {
    saveScrollPosition();
  }, [saveScrollPosition]);

  // 清除保存的位置
  const clear = useCallback(() => {
    scrollPositions.delete(storageKey);
    restoredRef.current = false;
  }, [storageKey]);

  return { save, clear };
}
