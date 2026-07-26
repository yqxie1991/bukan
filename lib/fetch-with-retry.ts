/**
 * 带重试逻辑的 fetch 工具
 * 适用于不稳定的外部服务（如豆瓣微服务）
 * 
 * 特性：
 * - 可配置重试次数（默认 2 次）
 * - 指数退避延迟（500ms, 1000ms, 2000ms...）
 * - 只对网络错误和 5xx 重试，4xx 不重试
 * - 支持 AbortSignal 超时
 * - 轻量实现，不引入额外依赖
 */

interface FetchWithRetryOptions extends RequestInit {
  /** 最大重试次数（默认 2） */
  maxRetries?: number;
  /** 基础退避延迟毫秒数（默认 500） */
  baseDelay?: number;
  /** 请求超时毫秒数（默认 8000） */
  timeout?: number;
}

/**
 * 判断是否应该重试
 * - 网络错误（fetch 抛出异常）→ 重试
 * - 5xx 服务器错误 → 重试
 * - 4xx 客户端错误 → 不重试
 * - 其他状态 → 不重试
 */
function shouldRetry(error: unknown, response?: Response): boolean {
  // 网络错误（无 response）
  if (!response) return true;
  // 5xx 服务器错误
  if (response.status >= 500) return true;
  // 其他情况不重试
  return false;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 2,
    baseDelay = 500,
    timeout = 8000,
    ...fetchOptions
  } = options;

  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 创建超时 signal
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 合并外部 signal
      const signal = options.signal
        ? combineSignals(options.signal, controller.signal)
        : controller.signal;

      const response = await fetch(url, {
        ...fetchOptions,
        signal,
      });

      clearTimeout(timeoutId);

      // 成功或不需要重试的错误
      if (response.ok || !shouldRetry(null, response)) {
        return response;
      }

      lastResponse = response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;

      // 如果是外部 signal 主动取消，不重试
      if (options.signal?.aborted) {
        throw error;
      }
    }

    // 还有重试机会时等待退避
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 所有重试用完
  if (lastResponse && !lastResponse.ok) {
    return lastResponse;
  }
  throw lastError;
}

/**
 * 合并两个 AbortSignal
 */
function combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const abort = () => controller.abort();

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }

  signal1.addEventListener("abort", abort, { once: true });
  signal2.addEventListener("abort", abort, { once: true });

  return controller.signal;
}
