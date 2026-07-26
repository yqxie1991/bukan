"use client";

import type { PlayerConfig } from "@/types/player";

interface ModeSwitchProps {
  currentMode: "iframe" | "local";
  playerConfig: PlayerConfig;
  onModeChange: (mode: "iframe" | "local") => void;
  disableParseUrl: boolean;
}

export function ModeSwitch({
  currentMode,
  playerConfig,
  onModeChange,
  disableParseUrl,
}: ModeSwitchProps) {
  return (
    <>
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            播放器模式
          </h4>
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
            {currentMode === "iframe" ? "iframe" : "本地"}
          </span>
        </div>

        <div className="space-y-2">
          {/* iframe 播放器 */}
          <button
            onClick={() => onModeChange("iframe")}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all group ${
              currentMode === "iframe"
                ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium">iframe 播放器</div>
                  <div className={`text-xs mt-1 ${currentMode === "iframe" ? "text-red-100" : "text-gray-500"}`}>
                    兼容性好，无需代理
                  </div>
                </div>
              </div>
              {currentMode === "iframe" && <span className="text-lg">✓</span>}
            </div>
          </button>

          {/* 本地播放器 */}
          <button
            onClick={() => playerConfig.enableProxy && onModeChange("local")}
            disabled={!playerConfig.enableProxy}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all group ${
              currentMode === "local"
                ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                : playerConfig.enableProxy
                ? "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
                : "bg-gray-900/50 text-gray-600 cursor-not-allowed opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium">本地播放器</div>
                  <div className={`text-xs mt-1 ${currentMode === "local" ? "text-red-100" : playerConfig.enableProxy ? "text-gray-500" : "text-gray-600"}`}>
                    {playerConfig.enableProxy ? "完全控制，高级功能" : "需要启用代理服务"}
                  </div>
                </div>
              </div>
              {currentMode === "local" && <span className="text-lg">✓</span>}
              {!playerConfig.enableProxy && (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 直接播放模式提示 (usePlayUrl: false) */}
      {currentMode === "iframe" && disableParseUrl && (
        <div className="p-4 border-b border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            播放模式
          </h4>
          <div className="p-4 bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">直接播放</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  不使用解析接口，直接播放原始视频链接
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
