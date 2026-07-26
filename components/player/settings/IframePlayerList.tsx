"use client";

import type { PlayerConfig } from "@/types/player";

interface IframePlayerListProps {
  currentMode: "iframe" | "local";
  enabledIframePlayers: any[];
  currentIframePlayerIndex: number;
  onIframePlayerChange: (index: number) => void;
}

export function IframePlayerList({
  currentMode,
  enabledIframePlayers,
  currentIframePlayerIndex,
  onIframePlayerChange,
}: IframePlayerListProps) {
  if (currentMode !== "iframe" || enabledIframePlayers.length === 0) {
    return null;
  }

  return (
    <>
      {/* 当前使用的播放器 */}
      <div className="p-4 border-b border-gray-800">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          当前播放器
        </h4>
        <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium truncate">
                  {enabledIframePlayers[currentIframePlayerIndex]?.name || "未知播放器"}
                </p>
                {enabledIframePlayers[currentIframePlayerIndex]?.id.startsWith("vod_source_") && (
                  <span className="shrink-0 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                    源推荐
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                优先级 {enabledIframePlayers[currentIframePlayerIndex]?.priority} · 超时 {enabledIframePlayers[currentIframePlayerIndex]?.timeout}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 切换播放器列表 */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">切换播放器</h4>
          <span className="text-xs text-gray-500">{enabledIframePlayers.length} 个可用</span>
        </div>
        <p className="text-xs text-gray-500 mb-3 flex items-start space-x-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>无法加载时将自动切换到下一个播放器</span>
        </p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {enabledIframePlayers.map((player, index) => {
            const isFromVodSource = player.id.startsWith("vod_source_");
            return (
              <button
                key={player.id}
                onClick={() => onIframePlayerChange(index)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                  currentIframePlayerIndex === index
                    ? "bg-red-600 text-white font-medium"
                    : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      currentIframePlayerIndex === index ? "bg-red-700 text-white" : "bg-gray-700 text-gray-400"
                    }`}>
                      {player.priority}
                    </span>
                    <span className="truncate">{player.name}</span>
                    {isFromVodSource && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        currentIframePlayerIndex === index
                          ? "bg-yellow-500/20 text-yellow-200 border border-yellow-400/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      }`}>
                        源推荐
                      </span>
                    )}
                  </div>
                  {currentIframePlayerIndex === index && (
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
