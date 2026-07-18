"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, RefreshCw, CheckCircle2, XCircle, Clock, Server, Layers } from "lucide-react";
import type { ToastState } from "./types";

interface DatabaseStatus {
  connected: boolean;
  latency: number;
  database?: string;
  collections?: string[];
  collectionCount?: number;
  serverInfo?: {
    version: string;
    gitVersion?: string;
  };
  uri?: string;
  error?: string;
  timestamp?: string;
}

interface DatabaseSettingsTabProps {
  onShowToast: (toast: ToastState) => void;
}

export function DatabaseSettingsTab({ onShowToast }: DatabaseSettingsTabProps) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastTestError, setLastTestError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/database/status");
      const result = await response.json();
      
      if (result.data) {
        setStatus(result.data);
        if (result.data.error) {
          setLastTestError(result.data.error);
        } else {
          setLastTestError(null);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "获取状态失败";
      setStatus({
        connected: false,
        latency: 0,
        error: errorMsg,
      });
      setLastTestError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTestConnection = async () => {
    setTesting(true);
    setLastTestError(null);
    try {
      const response = await fetch("/api/database/test", { method: "POST" });
      const result = await response.json();
      
      if (result.data?.success) {
        onShowToast({
          message: `连接测试成功！延迟: ${result.data.latency}ms`,
          type: "success",
        });
        setLastTestError(null);
        // 刷新状态
        await fetchStatus();
      } else {
        const errorMsg = result.data?.error || "连接测试失败";
        setLastTestError(errorMsg);
        onShowToast({
          message: errorMsg,
          type: "error",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "连接测试失败";
      setLastTestError(errorMsg);
      onShowToast({
        message: errorMsg,
        type: "error",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 数据库连接状态卡片 */}
      <div className="bg-card-bg rounded-xl p-6 border border-border-color">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Database size={24} />
            数据库状态
          </h2>
          <div className="flex gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  测试连接
                </>
              )}
            </button>
          </div>
        </div>

        {loading && !status ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-primary" />
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* 连接状态指示器 */}
            <div className={`p-4 rounded-lg border ${
              status.connected 
                ? "bg-green-900/20 border-green-600/50" 
                : "bg-red-900/20 border-red-600/50"
            }`}>
              <div className="flex items-center gap-3">
                {status.connected ? (
                  <CheckCircle2 size={24} className="text-green-500" />
                ) : (
                  <XCircle size={24} className="text-red-500" />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${status.connected ? "text-green-400" : "text-primary"}`}>
                    {status.connected ? "连接正常" : "连接失败"}
                  </div>
                  {status.error && (
                    <div className="text-sm text-primary mt-1 font-mono break-all">{status.error}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 详细信息网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 延迟 */}
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Clock size={16} />
                  响应延迟
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {status.latency}<span className="text-sm text-muted-foreground ml-1">ms</span>
                </div>
              </div>

              {/* 数据库名称 */}
              {status.database && (
                <div className="p-4 bg-surface rounded-lg border border-border-color">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Database size={16} />
                    数据库名称
                  </div>
                  <div className="text-lg font-medium text-foreground">{status.database}</div>
                </div>
              )}

              {/* 集合数量 */}
              {status.collectionCount !== undefined && (
                <div className="p-4 bg-surface rounded-lg border border-border-color">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Layers size={16} />
                    集合数量
                  </div>
                  <div className="text-2xl font-bold text-foreground">{status.collectionCount}</div>
                </div>
              )}

              {/* 服务器版本 */}
              {status.serverInfo?.version && (
                <div className="p-4 bg-surface rounded-lg border border-border-color">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Server size={16} />
                    MongoDB 版本
                  </div>
                  <div className="text-lg font-medium text-foreground">{status.serverInfo.version}</div>
                </div>
              )}
            </div>

            {/* 集合列表 */}
            {status.collections && status.collections.length > 0 && (
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Layers size={18} />
                  集合列表
                </h3>
                <div className="flex flex-wrap gap-2">
                  {status.collections.map((collection) => (
                    <span
                      key={collection}
                      className="px-3 py-1 bg-foreground/10 text-foreground text-sm rounded-lg"
                    >
                      {collection}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 连接 URI（已脱敏） */}
            {status.uri && (
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <h3 className="text-foreground font-medium mb-2">连接 URI</h3>
                <code className="text-sm text-muted-foreground break-all">{status.uri}</code>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">无法获取数据库状态</div>
        )}
      </div>
    </div>
  );
}
