"use client";

import { useCallback, useRef, useEffect } from "react";
import { IframePlayer } from "./IframePlayer";
import { LocalHlsPlayer } from "./LocalHlsPlayer";
import type { VodSource } from "@/types/drama";
import { useVideoUrlParser } from "@/hooks/player/useVideoUrlParser";
import { usePlayerConfig } from "@/hooks/player/usePlayerConfig";

interface UnifiedPlayerProps {
  videoUrl: string;
  title: string;
  mode?: "iframe" | "local";
  currentIframePlayerIndex?: number;
  vodSource?: VodSource | null;
  externalDanmaku?: import("@/lib/player/danmaku-service").DanmakuItem[];
  onDanmakuCountChange?: (count: number) => void;
  onProgress?: (time: number) => void;
  onEnded?: () => void;
  onIframePlayerSwitch?: (playerIndex: number) => void;
}

export function UnifiedPlayer({
  videoUrl,
  title,
  mode: externalMode,
  currentIframePlayerIndex,
  vodSource,
  externalDanmaku,
  onDanmakuCountChange,
  onProgress,
  onEnded,
  onIframePlayerSwitch,
}: UnifiedPlayerProps) {
  // 使用自定义 hooks 提取逻辑
  const { playerConfig, currentMode, isLoading, handlePlayerError } = usePlayerConfig(externalMode);
  const { parsedVideoUrl, isParsing, parseError, resetParseError } = useVideoUrlParser({
    videoUrl,
    vodSource,
  });

  // 使用 ref 保存回调，避免频繁重建
  const onIframePlayerSwitchRef = useRef(onIframePlayerSwitch);

  // 更新回调 ref
  useEffect(() => {
    onIframePlayerSwitchRef.current = onIframePlayerSwitch;
  });

  const handlePlayerSwitch = useCallback((playerIndex: number) => {
    onIframePlayerSwitchRef.current?.(playerIndex);
  }, []);

  if (isLoading || !playerConfig) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-red-600 mx-auto mb-4" />
          <p className="text-white text-lg">加载播放器配置...</p>
        </div>
      </div>
    );
  }

  // 切换播放器时显示过渡
  if (!currentMode) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500 mx-auto mb-3" />
          <p className="text-white text-base">切换播放器...</p>
        </div>
      </div>
    );
  }

  // 解析错误时显示错误提示
  if (parseError) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">当前线路存在问题</h3>
          <p className="text-gray-400 text-sm mb-4">{parseError}</p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>请点击顶部的「播放源」按钮切换到其他线路尝试播放</span>
            </p>
          </div>
          <button
            onClick={resetParseError}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium"
          >
            重新尝试
          </button>
        </div>
      </div>
    );
  }

  // 解析视频URL时显示加载
  if (isParsing || !parsedVideoUrl) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-amber-500 mx-auto mb-3" />
          <p className="text-white text-base">解析视频地址...</p>
        </div>
      </div>
    );
  }

  const finalVideoUrl = parsedVideoUrl;

  return (
    <div className="relative w-full h-full bg-black">
      {currentMode === "iframe" && (
        <IframePlayer
          key={`iframe-${currentIframePlayerIndex}-${finalVideoUrl}`}
          videoUrl={finalVideoUrl}
          players={playerConfig.iframePlayers}
          currentPlayerIndex={currentIframePlayerIndex}
          vodSource={vodSource}
          onProgress={onProgress}
          onEnded={onEnded}
          onPlayerSwitch={handlePlayerSwitch}
        />
      )}

      {currentMode === "local" && (
        <LocalHlsPlayer
          key={`local-${finalVideoUrl}`}
          videoUrl={finalVideoUrl}
          title={title}
          settings={playerConfig.localPlayerSettings}
          externalDanmaku={externalDanmaku}
          onDanmakuCountChange={onDanmakuCountChange}
          onProgress={onProgress}
          onEnded={onEnded}
          onError={handlePlayerError}
        />
      )}
    </div>
  );
}
