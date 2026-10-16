"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { DanmakuItem } from "@/lib/player/danmaku-service";
import { autoLoadDanmaku } from "@/lib/player/danmaku-service";
import type Artplayer from "artplayer";

interface UseDanmakuProps {
  title: string;
  artRef: React.RefObject<Artplayer | null>;
  externalDanmaku?: DanmakuItem[];
  onDanmakuCountChange?: (count: number) => void;
}

/** artplayer-plugin-danmuku 实例的最小接口（本项目只用到 config / load） */
interface DanmakuPluginLike {
  config: (options: { danmuku: DanmakuItem[] }) => void;
  load: () => void;
}

/** 插件工厂的返回类型（即挂在播放器实例上的插件对象） */
type DanmakuPluginInstance = ReturnType<
  typeof import("artplayer-plugin-danmuku").default
>;

export function useDanmaku({
  title,
  artRef,
  externalDanmaku,
  onDanmakuCountChange,
}: UseDanmakuProps) {
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [autoLoadStatus, setAutoLoadStatus] = useState<{
    loading: boolean;
    message: string;
    matchedTitle?: string;
  }>({ loading: false, message: "" });
  
  const danmakuPluginRef = useRef<DanmakuPluginInstance | null>(null);
  const autoLoadAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDanmakuLoad = useCallback(
    (danmaku: DanmakuItem[]) => {
      setDanmakuList(danmaku);
      onDanmakuCountChange?.(danmaku.length);
      if (artRef.current && danmakuPluginRef.current) {
        // 清空现有弹幕并加载新弹幕
        const plugin = artRef.current.plugins.artplayerPluginDanmuku as unknown as DanmakuPluginLike | undefined;
        if (plugin) {
          plugin.config({ danmuku: danmaku });
          plugin.load();
          console.log(`🎯 已加载 ${danmaku.length} 条弹幕`);
        }
      }
    },
    [onDanmakuCountChange, artRef]
  );

  useEffect(() => {
    if (externalDanmaku && externalDanmaku.length > 0) {
      // 需要把外部传入的弹幕同步进播放器插件实例（外部系统），
      // 同时更新本地计数状态。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleDanmakuLoad(externalDanmaku);
    }
  }, [externalDanmaku, handleDanmakuLoad]);

  const loadAutoDanmaku = useCallback(() => {
    if (!autoLoadAttemptedRef.current && title && artRef.current) {
      autoLoadAttemptedRef.current = true;
      setAutoLoadStatus({
        loading: true,
        message: "正在自动匹配弹幕...",
      });

      autoLoadDanmaku(title).then((result) => {
        if (!isMountedRef.current) return;
        if (result.success && result.danmaku.length > 0) {
          setDanmakuList(result.danmaku);
          setAutoLoadStatus({
            loading: false,
            message: result.message,
            matchedTitle: result.matchedTitle,
          });

          // 加载弹幕到播放器
          const plugin = artRef.current?.plugins.artplayerPluginDanmuku as unknown as DanmakuPluginLike | undefined;
          if (plugin) {
            plugin.config({ danmuku: result.danmaku });
            plugin.load();
            console.log(`🎯 自动加载 ${result.danmaku.length} 条弹幕`);
          }

          // 3秒后清除提示
          setTimeout(() => {
            if (isMountedRef.current) {
              setAutoLoadStatus({ loading: false, message: "" });
            }
          }, 3000);
        } else {
          setAutoLoadStatus({
            loading: false,
            message: result.message,
          });
          // 5秒后清除错误提示
          setTimeout(() => {
            if (isMountedRef.current) {
              setAutoLoadStatus({ loading: false, message: "" });
            }
          }, 5000);
        }
      });
    }
  }, [title, artRef]);

  return {
    danmakuList,
    autoLoadStatus,
    danmakuPluginRef,
    loadAutoDanmaku,
  };
}
