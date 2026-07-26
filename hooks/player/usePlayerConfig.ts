"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PlayerConfig } from "@/types/player";

// 智能选择最佳播放器模式
function selectBestPlayerMode(config: PlayerConfig): "iframe" | "local" {
  const hasEnabledIframePlayers = config.iframePlayers.some((p) => p.enabled);
  const proxyEnabled = config.enableProxy;
  const supportsHLS = typeof window !== "undefined" && "MediaSource" in window;

  if (proxyEnabled && supportsHLS) {
    return "local";
  }

  if (hasEnabledIframePlayers) {
    return "iframe";
  }

  return "local";
}

export function usePlayerConfig(externalMode?: "iframe" | "local") {
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig | null>(null);
  const [currentMode, setCurrentMode] = useState<"iframe" | "local" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const previousModeRef = useRef<"iframe" | "local" | undefined>(undefined);
  const switchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/player-config");
        const result = await response.json();

        if (!isMountedRef.current) return;

        if (result.code === 200 && result.data) {
          setPlayerConfig(result.data);

          if (externalMode) {
            setCurrentMode(externalMode);
          } else if (result.data.mode === "auto") {
            const selectedMode = selectBestPlayerMode(result.data);
            setCurrentMode(selectedMode);
          } else {
            setCurrentMode(result.data.mode);
          }
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        if (process.env.NODE_ENV === "development") {
          console.error("[Player Config Load Failed]", error);
        }
        setCurrentMode(externalMode || "iframe");
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadConfig();
  }, [externalMode]);

  useEffect(() => {
    if (externalMode === undefined) return;

    if (externalMode !== previousModeRef.current) {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }

      if (currentMode && currentMode !== externalMode) {
        setCurrentMode(null);

        switchTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setCurrentMode(externalMode);
          previousModeRef.current = externalMode;
          switchTimerRef.current = null;
        }, 100);
      } else if (!currentMode) {
        setCurrentMode(externalMode);
        previousModeRef.current = externalMode;
      }
    }

    return () => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
    };
  }, [externalMode, currentMode]);

  const handlePlayerError = useCallback(() => {
    setCurrentMode((prevMode) => {
      if (prevMode === "local") {
        return "iframe";
      }
      return prevMode;
    });
  }, []);

  return {
    playerConfig,
    currentMode,
    isLoading,
    handlePlayerError,
  };
}
