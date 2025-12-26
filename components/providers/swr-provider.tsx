"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

/**
 * SWR 全局配置 Provider
 *
 * 配置说明：
 * - revalidateOnFocus: 聚焦时不重新请求（避免切换标签页刷新）
 * - revalidateOnReconnect: 重连时不重新请求
 * - dedupingInterval: 60秒内重复请求去重
 * - errorRetryCount: 错误最多重试3次
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000,
        errorRetryCount: 3,
        // 自定义错误重试间隔
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          // 404 不重试
          if (error.status === 404) return;
          // 最多重试3次
          if (retryCount >= 3) return;
          // 延迟重试
          setTimeout(() => revalidate({ retryCount }), 3000);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
