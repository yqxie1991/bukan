"use client";

import React, { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 可选的降级 UI，默认显示内置错误页面 */
  fallback?: React.ReactNode;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 显示级别：page=全页, inline=行内卡片 */
  level?: "page" | "inline";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件渲染错误，防止整页白屏崩溃
 * 提供友好的降级 UI 和一键重试
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] 捕获到渲染错误:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const level = this.props.level || "page";

      if (level === "inline") {
        return (
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-card-bg border border-border-color">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-3">模块加载出错</p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              重试
            </button>
          </div>
        );
      }

      // 全页级别的降级 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* 错误图标 */}
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              页面出了点问题
            </h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              别担心，点击下方按钮即可恢复。
              {process.env.NODE_ENV === "development" && this.state.error && (
                <span className="block mt-2 text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </span>
              )}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                重新加载
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-surface text-muted-foreground rounded-xl font-medium hover:text-foreground transition-colors border border-border-color"
              >
                刷新整个页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
