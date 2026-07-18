'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SourceInfo {
  source_key: string;
  source_name: string;
  vod_id: string | number;
  vod_name: string;
  match_confidence: 'high' | 'medium' | 'low';
  priority?: number;  // 视频源优先级，数值越小优先级越高
}

interface SourceSelectorProps {
  sources: SourceInfo[];
  currentSourceKey: string | null;
  onSourceChange: (sourceKey: string, vodId: string | number) => void;
  // 触发搜索多源（无缓存时点击按钮或主动刷新时调用）
  onRefresh?: () => Promise<void>;
  // 是否正在搜索
  isRefreshing?: boolean;
}

export function SourceSelector({ sources, currentSourceKey, onSourceChange, onRefresh, isRefreshing }: SourceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 是否移动端视口（<768px）。SSR 安全：初始 false，hydration 后按 matchMedia 更新
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // 菜单 ref：移动端 Portal 到 body 后，需单独 ref 用于点击外部关闭判断
  const menuRef = useRef<HTMLDivElement>(null);

  // 响应式视口判断
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 按 priority 排序，数值越小越靠前，同 priority 按置信度排序
  const sortedSources = [...sources].sort((a, b) => {
    const priorityA = a.priority ?? 999;
    const priorityB = b.priority ?? 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // 同 priority 按置信度排序：high > medium > low
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.match_confidence] - confidenceOrder[a.match_confidence];
  });

  const currentSource = sortedSources.find(s => s.source_key === currentSourceKey);

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const badges = {
      high: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', label: '精准' },
      medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', label: '相似' },
      low: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50', label: '模糊' },
    };
    const badge = badges[confidence];
    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border} font-medium`}>
        {badge.label}
      </span>
    );
  };

  // 菜单容器：移动端 fixed 贴底弹层（Portal 到 body），桌面端 absolute 右对齐下拉
  // PC 端顶部贴齐导航栏底部（top-full 而非 mt-3 间隙）
  const menuClassName = isMobile
    ? 'fixed inset-x-2 bottom-2 z-[2000] max-h-[80vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in'
    : 'absolute right-0 top-full w-80 md:w-96 max-h-[60vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in z-50';

  const menu = isOpen ? (
    <div ref={menuRef} className={menuClassName}>
      {/* 头部 */}
      <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>选择播放源</span>
          </h3>
          <span className="text-xs text-gray-500">
            {sources.filter(s => s.match_confidence === 'high').length} 个精准匹配
          </span>
        </div>
      </div>

      {/* 源列表 - 无源时显示空状态提示 */}
      {sources.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-400 mb-2">未加载播放源数据</p>
          <p className="text-xs text-gray-500">点击下方「刷新播放源」按钮重新搜索</p>
        </div>
      ) : (
        <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: isMobile ? 'calc(80vh - 120px)' : '60vh' }}>
        {sortedSources.map((source) => {
          const isCurrent = source.source_key === currentSourceKey;
          return (
            <button
              key={source.source_key}
              onClick={() => {
                if (!isCurrent) {
                  onSourceChange(source.source_key, source.vod_id);
                }
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-red-600 text-white font-medium shadow-lg shadow-red-500/20'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
              disabled={isCurrent}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 源名称 */}
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm truncate ${isCurrent ? 'text-white' : 'text-white'}`}>
                      {source.source_name}
                    </span>
                    {isCurrent && (
                      <svg className="w-4 h-4 shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {/* 视频名称 */}
                  <p className={`text-xs mt-0.5 truncate ${isCurrent ? 'text-red-100' : 'text-gray-500'}`} title={source.vod_name}>
                    {source.vod_name}
                  </p>
                </div>

                {/* 匹配度标签 */}
                <div className="flex-shrink-0">
                  {getConfidenceBadge(source.match_confidence)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* 底部：刷新按钮 + 提示 */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 space-y-2">
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-white text-sm">搜索中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-white text-sm">刷新播放源</span>
              </>
            )}
          </button>
        )}
        <p className="text-xs text-gray-500 flex items-start space-x-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>不同播放源的清晰度和加载速度可能不同</span>
        </p>
      </div>
    </div>
  ) : null;

  // 点击按钮逻辑：
  // - 搜索中：不响应
  // - 有源：切换下拉
  // - 无源且有 onRefresh：触发搜索，搜索完成后自动打开下拉
  const handleButtonClick = async () => {
    if (isRefreshing) return;
    if (sources.length > 0) {
      setIsOpen(!isOpen);
      return;
    }
    if (onRefresh) {
      await onRefresh();
      // 搜索完成后自动打开下拉（让用户看到结果）
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative flex items-center h-[48px] md:h-[64px]">
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="group flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-foreground/5 hover:bg-primary/10 rounded-full transition-all hover:scale-105 text-foreground text-xs md:text-sm font-medium shadow sm:shadow-lg backdrop-blur-sm disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="切换视频源"
        aria-expanded={isOpen}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className={`w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        )}
        <span className="hidden sm:inline">
          {isRefreshing ? '搜索中...' : `${sources.length} 个播放源`}
        </span>
        <span className="sm:hidden">{sources.length}</span>
        {currentSource && !isRefreshing && (
          <span className="hidden md:inline text-muted-foreground">
            · {currentSource.source_name}
          </span>
        )}
      </button>

      {/* 下拉菜单：移动端 Portal 到 body 以绕开 nav 的 backdrop-filter 包含块 */}
      {menu && (isMobile
        ? createPortal(menu, document.body)
        : menu)}
    </div>
  );
}
