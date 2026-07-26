"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { PlayerConfig } from "@/types/player";
import type { VodSource } from "@/types/drama";
import { ModeSwitch } from "./settings/ModeSwitch";
import { IframePlayerList } from "./settings/IframePlayerList";

interface PlayerSettingsPanelProps {
  playerConfig: PlayerConfig;
  currentMode: "iframe" | "local";
  currentIframePlayerIndex: number;
  vodSource?: VodSource | null;
  onModeChange: (mode: "iframe" | "local") => void;
  onIframePlayerChange: (index: number) => void;
}

export function PlayerSettingsPanel({
  playerConfig,
  currentMode,
  currentIframePlayerIndex,
  vodSource,
  onModeChange,
  onIframePlayerChange,
}: PlayerSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (mode: "iframe" | "local") => {
    const shouldUsePlayUrl = vodSource?.playUrl && vodSource.usePlayUrl !== false;
    if (mode === "iframe" && shouldUsePlayUrl) {
      onIframePlayerChange(0);
    }
    onModeChange(mode);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const disableParseUrl = vodSource?.usePlayUrl === false;

  const enabledIframePlayers = (() => {
    if (disableParseUrl) {
      return [];
    }

    const backupPlayers = playerConfig.iframePlayers
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    const shouldUsePlayUrl = vodSource?.playUrl && vodSource.usePlayUrl !== false;

    if (shouldUsePlayUrl && vodSource?.playUrl) {
      const vodSourcePlayer = {
        id: `vod_source_${vodSource.key}`,
        name: `${vodSource.name}播放器`,
        url: vodSource.playUrl,
        priority: 0,
        timeout: 10000,
        enabled: true,
      };
      return [vodSourcePlayer, ...backupPlayers];
    }

    return backupPlayers;
  })();

  const menuClassName = isMobile
    ? "fixed inset-x-2 bottom-2 z-[2000] max-h-[80vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in"
    : "absolute right-0 top-full w-80 md:w-96 max-h-[60vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in z-50";

  return (
    <div className="relative flex items-center h-[48px] md:h-[64px]" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-foreground/5 hover:bg-primary/10 rounded-full transition-all hover:scale-105 text-foreground text-xs md:text-sm font-medium shadow sm:shadow-lg backdrop-blur-sm"
        aria-label="播放器设置"
        aria-expanded={isOpen}
      >
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:text-primary transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen &&
        (() => {
          const menuEl = (
            <div ref={menuRef} className={menuClassName}>
              <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-transparent">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span>播放器设置</span>
                  </h3>
                  <span className="text-xs text-gray-500">
                    {currentMode === "iframe" ? "iframe" : "本地"}模式
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(80vh-120px)] md:max-h-[60vh] overflow-y-auto">
                <ModeSwitch
                  currentMode={currentMode}
                  playerConfig={playerConfig}
                  onModeChange={handleModeChange}
                  disableParseUrl={disableParseUrl}
                />

                <IframePlayerList
                  currentMode={currentMode}
                  enabledIframePlayers={enabledIframePlayers}
                  currentIframePlayerIndex={currentIframePlayerIndex}
                  onIframePlayerChange={onIframePlayerChange}
                />

                <div className="p-4 bg-gradient-to-b from-transparent to-gray-900/30">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>快捷键</span>
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "← / →", desc: "上一集 / 下一集" },
                      { key: "S", desc: "打开/关闭设置" },
                      { key: "ESC", desc: "返回首页" },
                    ].map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-xs group hover:bg-gray-800/30 p-2 rounded transition-colors"
                      >
                        <kbd className="px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 font-mono font-semibold group-hover:border-gray-600">
                          {shortcut.key}
                        </kbd>
                        <span className="text-gray-400 group-hover:text-gray-300">
                          {shortcut.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
          return isMobile ? createPortal(menuEl, document.body) : menuEl;
        })()}
    </div>
  );
}
