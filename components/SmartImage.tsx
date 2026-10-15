'use client';

import { useState } from 'react';
import { getImageUrl, getImageProxyFallbackUrl } from '@/lib/utils/image-utils';

interface SmartImageProps {
  /** 原始图片地址（豆瓣外链或本地路径） */
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  onLoad?: () => void;
  /** 图片最终回退到占位图时触发 */
  onGiveUp?: () => void;
}

/**
 * 带回退链的图片组件
 *
 * 加载路径（逐级回退，避免任何环节失败导致裂图）：
 *   stage 0 → weserv CDN 客户端直连（服务器零出站流量）
 *   stage 1 → /api/image-proxy 服务端代理（weserv 不可达时兜底）
 *   stage 2 → 本地占位图
 */
export default function SmartImage({
  src,
  alt,
  className = '',
  loading,
  fetchPriority,
  decoding,
  onLoad,
  onGiveUp,
}: SmartImageProps) {
  // 0: weserv 直连, 1: 服务端代理, 2: 占位图
  const [stage, setStage] = useState(0);

  // 原始地址为空时直接使用占位图，不再尝试回退
  if (!src || src.trim() === '') {
    return <img src="/movie-default-bg.jpg" alt={alt} className={className} loading={loading} decoding={decoding} />;
  }

  const currentSrc =
    stage === 0
      ? getImageUrl(src)
      : stage === 1
        ? getImageProxyFallbackUrl(src)
        : '/movie-default-bg.jpg';

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      onLoad={onLoad}
      onError={() => {
        if (stage < 2) {
          setStage(stage + 1);
        } else {
          onGiveUp?.();
        }
      }}
    />
  );
}
