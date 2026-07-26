"use client";

import { useState, useEffect, useRef } from "react";
import type { VodSource } from "@/types/drama";

interface UseVideoUrlParserProps {
  videoUrl: string;
  vodSource?: VodSource | null;
}

export function useVideoUrlParser({ videoUrl, vodSource }: UseVideoUrlParserProps) {
  const [parsedVideoUrl, setParsedVideoUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const lastParsedUrlRef = useRef<string>("");
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const parseVideoUrl = async () => {
      setParseError(null);

      if (lastParsedUrlRef.current === videoUrl) {
        return;
      }

      if (!vodSource?.parseProxy) {
        setParsedVideoUrl(videoUrl);
        lastParsedUrlRef.current = videoUrl;
        return;
      }

      setIsParsing(true);
      try {
        const response = await fetch("/api/drama/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: videoUrl,
            source: vodSource,
          }),
        });

        if (!isMountedRef.current) return;

        const result = await response.json();
        if (result.code === 200 && result.data?.url) {
          setParsedVideoUrl(result.data.url);
          lastParsedUrlRef.current = videoUrl;
        } else {
          const errorMsg = result.msg || result.data?.error || "视频解析失败";
          console.warn("[Video Parse]", errorMsg);
          setParseError(errorMsg);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        console.warn("[Video Parse] 请求失败:", error);
        setParseError("视频解析请求失败，请检查网络连接");
      } finally {
        if (isMountedRef.current) {
          setIsParsing(false);
        }
      }
    };

    parseVideoUrl();
  }, [videoUrl, vodSource]);

  const resetParseError = () => {
    setParseError(null);
    setParsedVideoUrl(null);
    lastParsedUrlRef.current = "";
  };

  return {
    parsedVideoUrl,
    isParsing,
    parseError,
    resetParseError,
  };
}
