"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type Artplayer from "artplayer";
import type HlsType from "hls.js";
import type { LocalPlayerSettings } from "@/types/player";

import type { PlayerError, ErrorType, HlsErrorData } from "@/lib/player/types";
import { checkCorsSupport } from "@/lib/player/cors-check";
import { createHlsConfig } from "@/lib/player/hls-config";
import { handleHlsError } from "@/lib/player/hls-error-handler";
import { PlayerLoading } from "./PlayerLoading";
import { PlayerErrorDisplay } from "./PlayerError";

import type { DanmakuItem } from "@/lib/player/danmaku-service";
import { useDanmaku } from "@/hooks/player/useDanmaku";
import { Loader2 } from "lucide-react";

interface LocalHlsPlayerProps {
  videoUrl: string;
  title: string;
  settings: LocalPlayerSettings;
  externalDanmaku?: DanmakuItem[];
  onDanmakuCountChange?: (count: number) => void;
  onProgress?: (time: number) => void;
  onEnded?: () => void;
  onError?: () => void;
}

export function LocalHlsPlayer({
  videoUrl,
  title,
  settings,
  externalDanmaku,
  onDanmakuCountChange,
  onProgress,
  onEnded,
  onError,
}: LocalHlsPlayerProps) {
  // 状态
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PlayerError | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useDirectPlay, setUseDirectPlay] = useState(true);
  const [, setPlayMode] = useState<"direct" | "proxy" | "detecting">("detecting");

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  const networkRetryCount = useRef<number>(0);
  const mediaRetryCount = useRef<number>(0);
  const keyErrorCount = useRef<number>(0);
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // 弹幕钩子
  const { autoLoadStatus, danmakuPluginRef, loadAutoDanmaku } = useDanmaku({
    title,
    artRef,
    externalDanmaku,
    onDanmakuCountChange,
  });

  // 回调 refs
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const settingsRef = useRef(settings);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
    settingsRef.current = settings;
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!videoUrl) return;
    
    const isHttpsEnv = typeof window !== "undefined" && window.location.protocol === "https:";
    const isHttpVideo = videoUrl.startsWith("http://");
    
    if (isHttpsEnv && isHttpVideo) {
      console.log("🔒 HTTPS 页面加载 HTTP 视频，强制切换为代理播放模式以防止混合内容拦截 (Mixed Content)");
      setUseDirectPlay(false);
      setPlayMode("proxy");
    } else {
      setUseDirectPlay(true);
      setPlayMode("detecting");
    }
    
    setError(null);
    setIsLoading(true);
    networkRetryCount.current = 0;
    mediaRetryCount.current = 0;
    keyErrorCount.current = 0;
  }, [videoUrl]);

  const getProxiedUrl = useCallback(
    (url: string) => {
      if (!url) return "";
      if (url.startsWith("/api/video-proxy/")) return url;
      if (useDirectPlay) return url;
      return `/api/video-proxy/${encodeURIComponent(url)}`;
    },
    [useDirectPlay]
  );

  const setPlayerError = useCallback(
    (type: ErrorType, message: string, canRetry: boolean = false) => {
      if (!isMountedRef.current) return;
      setError({ type, message, canRetry });
      setIsLoading(false);
      if (!canRetry) {
        onErrorRef.current?.();
      }
    },
    []
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCount((prev) => prev + 1);
    networkRetryCount.current = 0;
    mediaRetryCount.current = 0;
    keyErrorCount.current = 0;
  }, []);

  const cleanupPlayer = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    if (artRef.current) {
      try {
        const videoElement = artRef.current.video;
        artRef.current.destroy();
        if (videoElement) {
          videoElement.pause();
          videoElement.src = "";
          videoElement.load();
          videoElement.removeAttribute("src");
        }
      } catch {}
      artRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || !videoUrl) return;

    isMountedRef.current = true;

    const initPlayer = async () => {
      try {
        setPlayMode(useDirectPlay ? "direct" : "proxy");
        
        if (useDirectPlay) {
          const corsResult = await checkCorsSupport(videoUrl);
          if (!isMountedRef.current) return;

          if (!corsResult.success) {
            if (corsResult.reason === "cors") {
              setUseDirectPlay(false);
              setPlayMode("proxy");
              setRetryCount((prev) => prev + 1);
              return;
            }
          }
        }

        const [ArtplayerModule, HlsModule, DanmukuModule] = await Promise.all([
          import("artplayer"),
          import("hls.js"),
          import("artplayer-plugin-danmuku"),
        ]);

        if (!isMountedRef.current || !containerRef.current) return;

        const Artplayer = ArtplayerModule.default;
        const Hls = HlsModule.default;
        const artplayerPluginDanmuku = DanmukuModule.default;

        cleanupPlayer();

        const hlsConfig = createHlsConfig(Hls);

        const danmakuPlugin = artplayerPluginDanmuku({
          danmuku: [],
          speed: 5,
          margin: [5, "20%"],
          opacity: 1,
          color: "#FFFFFF",
          mode: 0,
          modes: [0, 1, 2],
          fontSize: "4%",
          antiOverlap: true,
          synchronousPlayback: true,
          width: 512,
          filter: (danmu) => danmu.text.length <= 100,
          beforeVisible: () => true,
          visible: true,
          emitter: true,
          maxLength: 200,
          lockTime: 5,
          theme: "dark",
          beforeEmit: () => Promise.resolve(true),
        } as Parameters<typeof artplayerPluginDanmuku>[0]);
        danmakuPluginRef.current = danmakuPlugin;

        const art = new Artplayer({
          container: containerRef.current,
          url: getProxiedUrl(videoUrl),
          type: "m3u8",
          volume: 0.8,
          isLive: false,
          muted: false,
          autoplay: false,
          pip: true,
          autoSize: false,
          autoMini: true,
          screenshot: true,
          setting: true,
          loop: true,
          flip: true,
          playbackRate: true,
          aspectRatio: true,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: true,
          miniProgressBar: true,
          mutex: true,
          backdrop: true,
          playsInline: true,
          autoPlayback: true,
          airplay: true,
          theme: settingsRef.current.theme || "#ef4444",
          lang: navigator.language.toLowerCase(),
          lock: true,
          fastForward: true,
          autoOrientation: true,
          moreVideoAttr: {
            crossOrigin: "anonymous",
          },
          customType: {
            m3u8: (video: HTMLVideoElement, url: string) => {
              if (!isMountedRef.current) return;

              const hls = new Hls(hlsConfig);
              hlsRef.current = hls;

              hls.loadSource(url);
              hls.attachMedia(video);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (isMountedRef.current && video && document.contains(video)) {
                  video.play().catch((e) => {
                    if (e.name !== "NotAllowedError" && e.name !== "AbortError") {
                      console.log("[Autoplay Failed]", e);
                    }
                  });
                }
              });

              hls.on(Hls.Events.ERROR, (_event: string, data: HlsErrorData) => {
                handleHlsError(
                  data,
                  hls,
                  Hls,
                  useDirectPlay,
                  setUseDirectPlay,
                  setPlayMode,
                  setRetryCount,
                  setPlayerError,
                  keyErrorCount,
                  networkRetryCount,
                  mediaRetryCount,
                  timersRef,
                  isMountedRef
                );
              });
            },
          },
          settings: [
            {
              name: "playbackRate",
              html: "播放速度",
              selector: [
                { html: "0.5x", value: 0.5 },
                { html: "0.75x", value: 0.75 },
                { html: "正常", value: 1, default: true },
                { html: "1.25x", value: 1.25 },
                { html: "1.5x", value: 1.5 },
                { html: "2x", value: 2 },
              ],
              onSelect: function (item) {
                if (art && "value" in item && typeof item.value === "number") {
                  art.playbackRate = item.value;
                }
              },
            },
          ],
          plugins: [danmakuPlugin],
        });

        artRef.current = art;

        art.on("ready", () => {
          setIsLoading(false);
          loadAutoDanmaku();
        });

        art.on("video:loadedmetadata", () => {
          if (settingsRef.current.autoSaveProgress) {
            const saved = localStorage.getItem(`video_progress_${videoUrl}`);
            if (saved) {
              try {
                const progress = JSON.parse(saved);
                if (progress.time > 10 && progress.time < art.duration - 10) {
                  art.currentTime = progress.time;
                }
              } catch {}
            }
          }
        });

        art.on("video:timeupdate", () => {
          const currentTime = art.currentTime;
          onProgressRef.current?.(currentTime);

          const currentSettings = settingsRef.current;
          if (
            currentSettings.autoSaveProgress &&
            Math.floor(currentTime) % currentSettings.progressSaveInterval === 0
          ) {
            localStorage.setItem(
              `video_progress_${videoUrl}`,
              JSON.stringify({ time: currentTime, timestamp: Date.now() })
            );
          }
        });

        art.on("video:ended", () => {
          if (settingsRef.current.autoSaveProgress) {
            localStorage.removeItem(`video_progress_${videoUrl}`);
          }
          onEndedRef.current?.();
        });

        art.on("video:error", () => {
          setPlayerError("media", "视频播放失败", false);
        });
      } catch (err) {
        setPlayerError("unknown", "播放器加载失败，请刷新重试", true);
      }
    };

    initPlayer();

    return () => {
      isMountedRef.current = false;
      cleanupPlayer();
    };
  }, [
    isClient,
    videoUrl,
    retryCount,
    useDirectPlay,
    getProxiedUrl,
    setPlayerError,
    cleanupPlayer,
    loadAutoDanmaku,
  ]);

  if (!isClient) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-white">初始化播放器...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {autoLoadStatus.loading && autoLoadStatus.message && (
        <div className="absolute top-3 right-3 z-40">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs backdrop-blur-sm border bg-black/70 border-white/20 text-white/90">
            <Loader2 size={12} className="animate-spin text-white/70" />
            <span>{autoLoadStatus.message}</span>
          </div>
        </div>
      )}

      {isLoading && <PlayerLoading />}
      {error && (
        <PlayerErrorDisplay
          error={error}
          retryCount={retryCount}
          onRetry={handleRetry}
          onReload={() => window.location.reload()}
        />
      )}
    </div>
  );
}
