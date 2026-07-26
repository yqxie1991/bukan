import type HlsType from "hls.js";
import type { ErrorType, HlsErrorData } from "@/lib/player/types";

export function handleHlsError(
  data: HlsErrorData,
  hls: HlsType,
  Hls: any,
  useDirectPlay: boolean,
  setUseDirectPlay: (v: boolean) => void,
  setPlayMode: (v: "direct" | "proxy" | "detecting") => void,
  setRetryCount: (fn: (prev: number) => number) => void,
  setPlayerError: (type: ErrorType, message: string, canRetry: boolean) => void,
  keyErrorCount: { current: number },
  networkRetryCount: { current: number },
  mediaRetryCount: { current: number },
  timersRef: { current: Set<NodeJS.Timeout> },
  isMountedRef: { current: boolean }
) {
  const MAX_KEY_ERROR = 5;
  const MAX_NETWORK_RETRY = 3;
  const MAX_MEDIA_RETRY = 2;

  // 密钥错误
  if (data.details === "keyLoadError" || data.details === "keyLoadTimeOut") {
    keyErrorCount.current++;
    if (keyErrorCount.current > MAX_KEY_ERROR) {
      const errorMsg =
        data.response?.code === 404
          ? "视频加密密钥不存在（404），无法播放此视频"
          : "视频加密密钥加载失败，无法播放";
      setPlayerError("key", errorMsg, false);
      hls.stopLoad();
    }
    return;
  }

  // 清单错误
  if (data.details === "manifestLoadError") {
    const is404 = data.response?.code === 404;
    const is403 = data.response?.code === 403;
    const statusCode = data.response?.code;

    if (useDirectPlay && !is404 && !is403 && !statusCode) {
      console.log("🔄 直接播放失败（可能是CORS），切换到代理模式...");
      setUseDirectPlay(false);
      setPlayMode("proxy");
      setRetryCount((prev) => prev + 1);
      return;
    }

    let errorMsg: string;
    let canRetry = false;

    if (is404) {
      errorMsg = "视频文件不存在（404）";
    } else if (is403) {
      errorMsg = "视频链接已过期或无效（403），请返回重新选择";
    } else if (statusCode) {
      errorMsg = `视频清单加载失败 (HTTP ${statusCode})`;
      canRetry = true;
    } else {
      errorMsg = "视频清单加载失败，请检查网络连接";
      canRetry = true;
    }

    setPlayerError("manifest", errorMsg, canRetry);
    return;
  }

  // 片段错误
  if (data.details === "fragLoadError" && data.response?.code === 404) {
    setPlayerError(
      "fragment",
      "视频片段不存在（404），该视频可能已损坏",
      false
    );
    return;
  }

  // 致命错误
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        networkRetryCount.current++;
        if (networkRetryCount.current > MAX_NETWORK_RETRY) {
          const errorMsg =
            data.response?.code === 404
              ? "视频资源不存在（404）"
              : "网络连接失败，请检查网络连接";
          setPlayerError("network", errorMsg, true);
          hls.stopLoad();
        } else {
          const timer = setTimeout(() => {
            if (isMountedRef.current && hls) {
              hls.startLoad();
            }
            timersRef.current.delete(timer);
          }, 1000 * networkRetryCount.current);
          timersRef.current.add(timer);
        }
        break;

      case Hls.ErrorTypes.MEDIA_ERROR:
        mediaRetryCount.current++;
        if (mediaRetryCount.current > MAX_MEDIA_RETRY) {
          setPlayerError("media", "视频格式错误或编码不支持", false);
          hls.stopLoad();
        } else {
          const timer = setTimeout(() => {
            if (isMountedRef.current && hls) {
              hls.recoverMediaError();
            }
            timersRef.current.delete(timer);
          }, 500);
          timersRef.current.add(timer);
        }
        break;

      default:
        setPlayerError(
          "unknown",
          `视频加载失败: ${data.details || "未知错误"}`,
          true
        );
        break;
    }
  }
}
