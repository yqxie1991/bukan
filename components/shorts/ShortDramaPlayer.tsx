"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type Artplayer from "artplayer";

interface ShortDramaPlayerProps {
  videoUrl: string;
  isActive: boolean;
  onEnded: () => void;
  onProgress?: (progress: number, duration: number) => void;
}

export function ShortDramaPlayer({
  videoUrl,
  isActive,
  onEnded,
  onProgress,
}: ShortDramaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化播放器
  useEffect(() => {
    if (!containerRef.current || !videoUrl) return;

    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);

    const initPlayer = async () => {
      try {
        const [ArtplayerModule, HlsModule] = await Promise.all([
          import("artplayer"),
          import("hls.js"),
        ]);

        if (!isMountedRef.current || !containerRef.current) return;

        const Artplayer = ArtplayerModule.default;
        const Hls = HlsModule.default;

        // 清理旧实例
        if (artRef.current) {
          artRef.current.destroy();
          artRef.current = null;
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const art = new Artplayer({
          container: containerRef.current,
          url: videoUrl,
          type: "m3u8",
          volume: 0.8,
          muted: false,
          autoplay: false,
          pip: false,
          fullscreen: true,
          fullscreenWeb: false,
          screenshot: false,
          setting: true,
          playbackRate: true,
          aspectRatio: false,
          loop: false,
          mutex: true,
          backdrop: true,
          playsInline: true,
          theme: "#e50914", // Netflix红色
          lang: "zh-cn",
          lock: false,
          fastForward: true,
          autoOrientation: true,
          miniProgressBar: true,
          moreVideoAttr: {
            crossOrigin: "anonymous",
          },
          settings: [
            {
              name: "playbackRate",
              html: "倍速播放",
              selector: [
                { html: "0.5x", value: 0.5 },
                { html: "0.75x", value: 0.75 },
                { html: "1x 正常", value: 1, default: true },
                { html: "1.25x", value: 1.25 },
                { html: "1.5x", value: 1.5 },
                { html: "2x", value: 2 },
                { html: "3x", value: 3 },
              ],
              onSelect: function (item) {
                if (art && "value" in item && typeof item.value === "number") {
                  art.playbackRate = item.value;
                }
                return item.html;
              },
            },
          ],
          customType: {
            m3u8: (video: HTMLVideoElement, url: string) => {
              if (!isMountedRef.current) return;

              if (Hls.isSupported()) {
                const hls = new Hls({
                  enableWorker: true,
                  lowLatencyMode: false,
                  maxBufferLength: 30,
                  maxMaxBufferLength: 60,
                });
                hlsRef.current = hls;

                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                  setIsLoading(false);
                });

                hls.on(Hls.Events.ERROR, (_: string, data: any) => {
                  if (data.fatal) {
                    setError("视频加载失败");
                    setIsLoading(false);
                  }
                });
              } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = url;
                setIsLoading(false);
              } else {
                setError("浏览器不支持此视频格式");
                setIsLoading(false);
              }
            },
          },
        });

        artRef.current = art;

        // 监听事件
        art.on("ready", () => {
          setIsLoading(false);
        });

        art.on("video:timeupdate", () => {
          if (onProgress && art.duration > 0) {
            onProgress(art.currentTime, art.duration);
          }
        });

        art.on("video:ended", () => {
          onEnded();
        });

        art.on("video:error", () => {
          setError("视频播放失败");
        });
      } catch (err) {
        console.error("[ShortDramaPlayer Init Error]", err);
        setError("播放器初始化失败");
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      isMountedRef.current = false;
      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // 控制播放/暂停
  useEffect(() => {
    const art = artRef.current;
    if (!art) return;

    if (isActive && !isLoading) {
      // 先尝试有声音播放
      art.muted = false;
      art.play().catch(() => {
        // 浏览器阻止自动播放，改为静音播放
        art.muted = true;
        art.play().catch(() => {
          // 静音也失败，用户需要手动点击播放
        });
      });
    } else if (!isActive && art.playing) {
      art.pause();
    }
  }, [isActive, isLoading]);

  // 重试
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    if (artRef.current) {
      artRef.current.destroy();
      artRef.current = null;
    }
    // 触发重新初始化
    const container = containerRef.current;
    if (container) {
      container.innerHTML = "";
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Artplayer 容器 - z-index 低于 overlay */}
      <div
        ref={containerRef}
        className="w-full h-full z-10 [&_.art-video-player]:!h-full [&_.art-video]:object-contain"
        style={{ height: "100%" }}
      />

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none z-20">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">{error}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
