"use client";

import { useState, useEffect, useCallback } from "react";

interface WatchHistoryItem {
  id: string | number;
  name: string;
  cover?: string;
  episode: number;
  timestamp: number;
  sourceKey?: string;
  sourceName?: string;
}

const HISTORY_PREFIX = "play_history_";
const MAX_HISTORY_ITEMS = 20;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 读取所有播放历史
  const loadHistory = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const items: WatchHistoryItem[] = [];

      // 遍历 localStorage 查找所有播放历史
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(HISTORY_PREFIX)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const item = JSON.parse(value);
              // 确保必要字段存在
              if (item.id && item.name && typeof item.timestamp === "number") {
                items.push({
                  id: item.id,
                  name: item.name,
                  cover: item.cover || "",
                  episode: item.episode || 0,
                  timestamp: item.timestamp,
                  sourceKey: item.sourceKey,
                  sourceName: item.sourceName,
                });
              }
            }
          } catch {
            // 解析失败的记录跳过
          }
        }
      }

      // 按时间戳降序排列（最近观看的在前面）
      items.sort((a, b) => b.timestamp - a.timestamp);

      // 限制数量
      setHistory(items.slice(0, MAX_HISTORY_ITEMS));
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 清除单条历史
  const removeHistory = useCallback(
    (id: string | number) => {
      if (typeof window === "undefined") return;

      try {
        localStorage.removeItem(`${HISTORY_PREFIX}${id}`);
        loadHistory();
      } catch {
        // 静默失败
      }
    },
    [loadHistory]
  );

  // 清除全部历史
  const clearAllHistory = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(HISTORY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      setHistory([]);
    } catch {
      // 静默失败
    }
  }, []);

  // 刷新历史记录
  const refreshHistory = useCallback(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    removeHistory,
    clearAllHistory,
    refreshHistory,
  };
}
