"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, RefreshCw, CheckCircle2, XCircle, Clock, Server, Layers, AlertTriangle } from "lucide-react";
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

interface ErrorSuggestion {
  title: string;
  suggestions: string[];
}

// 根据错误信息生成解决建议
function getErrorSuggestions(error: string): ErrorSuggestion {
  const errorLower = error.toLowerCase();
  
  // 连接超时
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      title: '连接超时',
      suggestions: [
        '检查 MongoDB 服务是否正在运行',
        '确认 MONGODB_URI 中的主机地址和端口是否正确',
        '检查防火墙是否阻止了连接',
        '如果使用 Atlas，确保 IP 已加入白名单',
      ]
    };
  }
  
  // 认证失败
  if (errorLower.includes('authentication') || errorLower.includes('auth') || errorLower.includes('unauthorized')) {
    return {
      title: '认证失败',
      suggestions: [
        '检查连接字符串中的用户名和密码是否正确',
        '确认用户是否有访问该数据库的权限',
        '如果密码包含特殊字符，需要进行 URL 编码',
        '在 Atlas 中检查 Database Access 用户配置',
      ]
    };
  }
  
  // DNS/网络解析
  if (errorLower.includes('getaddrinfo') || errorLower.includes('enotfound') || errorLower.includes('dns')) {
    return {
      title: 'DNS 解析失败',
      suggestions: [
        '检查 MONGODB_URI 中的主机名是否正确',
        '确认网络连接正常',
        'Docker 环境中使用容器名 "mongodb" 而非 "localhost"',
        '如果使用 Atlas，检查集群 URL 是否完整',
      ]
    };
  }
  
  // 连接被拒绝
  if (errorLower.includes('econnrefused') || errorLower.includes('connection refused')) {
    return {
      title: '连接被拒绝',
      suggestions: [
        '确认 MongoDB 服务已启动',
        '检查端口号是否正确（默认 27017）',
        'Docker 环境确认 MongoDB 容器正在运行',
        '检查 MongoDB 是否绑定到正确的网络接口',
      ]
    };
  }
  
  // 网络不可达
  if (errorLower.includes('enetunreach') || errorLower.includes('network unreachable')) {
    return {
      title: '网络不可达',
      suggestions: [
        '检查网络连接是否正常',
        '确认 VPN 或代理配置',
        'Docker 网络配置是否正确',
      ]
    };
  }
  
  // URI 配置错误
  if (errorLower.includes('uri') || errorLower.includes('invalid') || errorLower.includes('parse')) {
    return {
      title: 'URI 格式错误',
      suggestions: [
        '检查 MONGODB_URI 格式是否正确',
        '本地: mongodb://localhost:27017/dbname',
        'Atlas: mongodb+srv://user:pass@cluster.mongodb.net/dbname',
        '确保特殊字符已正确编码',
      ]
    };
  }
  
  // 环境变量未设置
  if (errorLower.includes('mongodb_uri') || errorLower.includes('环境变量')) {
    return {
      title: '环境变量未配置',
      suggestions: [
        '在 .env 文件中设置 MONGODB_URI',
        '或在部署平台配置环境变量',
        '修改后需要重启服务',
      ]
    };
  }
  
  // 默认建议
  return {
    title: '连接错误',
    suggestions: [
      '检查 MONGODB_URI 环境变量配置',
      '确认 MongoDB 服务正在运行',
      '查看服务端日志获取更多信息',
    ]
  };
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

  // 获取错误建议
  const errorSuggestion = lastTestError ? getErrorSuggestions(lastTestError) : null;

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

            {/* 错误诊断和建议 */}
            {!status.connected && errorSuggestion && (
              <div className="p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-orange-300 font-medium mb-2">
                      {errorSuggestion.title} - 建议操作
                    </h4>
                    <ul className="space-y-1.5">
                      {errorSuggestion.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-orange-400 font-bold">{index + 1}.</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

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

      {/* MongoDB 配置指南 */}
      <div className="bg-card-bg rounded-xl p-6 border border-border-color">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Database size={20} />
          MongoDB 配置指南
        </h3>
        
        <div className="space-y-6 text-sm">
          {/* 支持说明 */}
          <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p className="text-blue-300">
              本项目使用 <strong>MongoDB</strong> 作为数据库，支持以下部署方式：
            </p>
            <ul className="mt-2 space-y-1 text-foreground">
              <li>• 本地 MongoDB 实例</li>
              <li>• Docker 容器化部署</li>
              <li>• MongoDB Atlas 云服务（推荐生产环境）</li>
            </ul>
          </div>

          {/* 环境变量说明 */}
          <div>
            <h4 className="text-foreground font-medium mb-3">环境变量配置</h4>
            <p className="text-muted-foreground mb-3">
              数据库连接通过环境变量配置，修改后需要重启服务生效。在 <code className="text-foreground bg-foreground/10 px-1 rounded">.env</code> 文件或部署平台设置：
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-surface rounded-lg border border-border-color">
                <div className="font-mono text-green-400 text-xs mb-1"># 必需</div>
                <div className="font-mono text-foreground">
                  MONGODB_URI=&lt;连接字符串&gt;
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border-color">
                <div className="font-mono text-green-400 text-xs mb-1"># 可选（默认: kerkerker）</div>
                <div className="font-mono text-foreground">
                  MONGODB_DB_NAME=kerkerker
                </div>
              </div>
            </div>
          </div>

          {/* 部署方式 */}
          <div>
            <h4 className="text-foreground font-medium mb-3">连接字符串示例</h4>
            <div className="space-y-4">
              {/* Docker 部署 */}
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-primary-foreground text-xs rounded">Docker</span>
                  <span className="text-foreground font-medium">Docker Compose 部署</span>
                </div>
                <code className="block text-xs text-muted-foreground break-all">
                  MONGODB_URI=mongodb://mongodb:27017/kerkerker
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  使用 docker-compose 时，MongoDB 容器名为 mongodb
                </p>
              </div>

              {/* 本地开发 */}
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-green-600 text-primary-foreground text-xs rounded">本地</span>
                  <span className="text-foreground font-medium">本地 MongoDB</span>
                </div>
                <code className="block text-xs text-muted-foreground break-all">
                  MONGODB_URI=mongodb://localhost:27017/kerkerker
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  需要先安装并启动本地 MongoDB 服务
                </p>
              </div>

              {/* MongoDB Atlas */}
              <div className="p-4 bg-surface rounded-lg border border-border-color">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-primary-foreground text-xs rounded">推荐</span>
                  <span className="text-foreground font-medium">MongoDB Atlas 云服务</span>
                </div>
                <code className="block text-xs text-muted-foreground break-all">
                  MONGODB_URI=mongodb+srv://&lt;用户名&gt;:&lt;密码&gt;@&lt;集群&gt;.mongodb.net/kerkerker
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  从 Atlas 控制台获取连接字符串，支持免费 M0 套餐
                </p>
              </div>
            </div>
          </div>

          {/* Atlas 配置步骤 */}
          <div>
            <h4 className="text-foreground font-medium mb-3">MongoDB Atlas 快速配置</h4>
            <ol className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>访问 <a href="https://www.mongodb.com/atlas" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">mongodb.com/atlas</a> 注册账号</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>创建免费 M0 集群（选择离用户最近的区域）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>在 Database Access 创建数据库用户</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>在 Network Access 添加 IP 白名单（或设置 0.0.0.0/0 允许所有）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>点击 Connect → Drivers → 复制连接字符串</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">6.</span>
                <span>替换 &lt;password&gt; 为你的密码，设置到 MONGODB_URI</span>
              </li>
            </ol>
          </div>

          {/* 注意事项 */}
          <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-yellow-300 font-medium mb-2">⚠️ 注意事项</p>
            <ul className="space-y-1 text-foreground text-xs">
              <li>• 生产环境建议使用 MongoDB Atlas 或独立部署的 MongoDB</li>
              <li>• 请确保连接字符串中的密码不包含特殊字符，或进行 URL 编码</li>
              <li>• Vercel 等无服务器平台必须使用云端 MongoDB（如 Atlas）</li>
              <li>• 修改连接配置后需要重启应用才能生效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
