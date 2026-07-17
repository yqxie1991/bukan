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
}

export function SourceSelector({ sources, currentSourceKey, onSourceChange }: SourceSelectorProps) {
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

  // 如果只有一个或没有源，不显示
  if (sources.length <= 1) {
    return null;
  }

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

  // 菜单内容：移动端 fixed 贴底弹层（Portal 到 body，绕开 nav 的 backdrop-filter 包含块），
  // 桌面端 absolute 右对齐下拉（相对按钮，视口足够宽不溢出）
  const menuClassName = isMobile
    ? 'fixed inset-x-2 bottom-2 z-[2000] max-h-[80vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in'
    : 'absolute right-0 mt-3 w-80 z-50 max-h-[60vh] bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in';

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

      {/* 源列表 */}
      <div className="overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(80vh - 120px)' : '60vh' }}>
        {sortedSources.map((source, index) => {
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
              className={`w-full text-left px-4 py-3 transition-all ${isCurrent
                ? 'bg-red-600/20 border-l-4 border-red-600'
                : 'hover:bg-white/5 border-l-4 border-transparent'
                } ${index !== sortedSources.length - 1 ? 'border-b border-gray-800/50' : ''}`}
              disabled={isCurrent}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 源名称 */}
                  <div className="flex items-center space-x-2 mb-1">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-red-400' : 'text-white'
                      }`}>
                      {source.source_name}
                    </p>
                    {isCurrent && (
                      <span className="flex-shrink-0 text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {/* 视频名称 */}
                  <p className="text-xs text-gray-400 truncate" title={source.vod_name}>
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

      {/* 底部提示 */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        <p className="text-xs text-gray-500 flex items-start space-x-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>不同播放源的清晰度和加载速度可能不同</span>
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-2 px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-105 text-white text-xs md:text-sm font-medium shadow-lg backdrop-blur-sm"
        aria-label="切换视频源"
        aria-expanded={isOpen}
      >
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
        <span className="hidden sm:inline">{sources.length} 个播放源</span>
        <span className="sm:hidden">{sources.length}</span>
        {currentSource && (
          <span className="hidden md:inline text-gray-400">
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
