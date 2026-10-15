"use client";

import { useState } from "react";
import { ShortDramaSource } from "@/types/shorts-source";
import { Modal } from "@/components/Modal";
import type { ShortsSourcesTabProps } from "./types";
import { isSubscriptionUrl } from "@/lib/utils";

export function ShortsSourcesTab({
  sources,
  selectedKey,
  onSourcesChange,
  onSelectedKeyChange,
  onShowToast,
  onShowConfirm,
}: ShortsSourcesTabProps) {
  const [editingSource, setEditingSource] = useState<ShortDramaSource | null>(
    null
  );
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<ShortDramaSource>({
    key: "",
    name: "",
    api: "",
    typeId: undefined,
    priority: 0,
  });

  // 加密导入相关状态
  const [showEncryptedImportModal, setShowEncryptedImportModal] =
    useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");
  const [importPreview, setImportPreview] = useState<ShortDramaSource[] | null>(
    null
  );
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState("");

  // 重置加密导入弹窗状态
  const resetEncryptedImportModal = () => {
    setShowEncryptedImportModal(false);
    setImportPassword("");
    setImportData("");
    setImportPreview(null);
    setIsDecrypting(false);
    setDecryptError("");
  };

  // 解密预览
  const handleDecryptPreview = async () => {
    if (!importData) {
      setDecryptError("请输入配置数据或订阅 URL");
      return;
    }

    setIsDecrypting(true);
    setDecryptError("");
    setImportPreview(null);

    let isJson = false;
    let jsonErrorMsg = "";

    // 1. 尝试直接作为明文 JSON 解析
    try {
      let rawText = importData.trim();
      let isPlainJson = false;
      let parsedPayload: any = null;

      if (isSubscriptionUrl(rawText)) {
        try {
          const response = await fetch(rawText);
          if (response.ok) {
            const text = await response.text();
            parsedPayload = JSON.parse(text);
            isPlainJson = true;
          }
        } catch (e) {
          console.log("尝试直接拉取 URL 失败，将尝试走解密逻辑", e);
        }
      } else {
        parsedPayload = JSON.parse(rawText);
        isPlainJson = true;
      }

      if (isPlainJson && parsedPayload) {
        const isEncrypted = parsedPayload && typeof parsedPayload === 'object' && parsedPayload.version && parsedPayload.algorithm && parsedPayload.data;
        if (!isEncrypted) {
          isJson = true;
          let shortsSourcesList: any[] = [];
          
          // 格式 A: 标准打包格式
          if (parsedPayload.shortsSources && Array.isArray(parsedPayload.shortsSources)) {
            shortsSourcesList = parsedPayload.shortsSources;
          } 
          // 格式 B: 单页导出的 sources 字段
          else if (parsedPayload.sources && Array.isArray(parsedPayload.sources)) {
            shortsSourcesList = parsedPayload.sources;
          }
          // 格式 C: 纯数组格式 (直接是列表)
          else if (Array.isArray(parsedPayload)) {
            shortsSourcesList = parsedPayload;
          }

          if (shortsSourcesList.length === 0) {
            throw new Error("JSON 中没有找到有效的短剧源配置 (请检查是否包含 shortsSources、sources 键或本身是列表)");
          }

          setImportPreview(shortsSourcesList);
          setIsDecrypting(false);
          return; // 解析成功，直接返回
        }
      }
    } catch (parseError) {
      jsonErrorMsg = parseError instanceof Error ? parseError.message : "未知 JSON 格式错误";
      console.log("解析明文 JSON 失败", parseError);
    }

    // 2. 如果本身是合法的 JSON，但提取数据失败，不走解密模式，直接报告格式错误
    if (isJson) {
      setDecryptError(`明文配置解析失败: ${jsonErrorMsg}`);
      setIsDecrypting(false);
      return;
    }

    // 3. 若非合法 JSON，且没有密码，且【不是订阅 URL】，则无法进行加密包解密
    if (!importPassword && !isSubscriptionUrl(importData)) {
      setDecryptError("未识别为合法的明文 JSON 配置，如果是加密配置请输入解密密码");
      setIsDecrypting(false);
      return;
    }

    // 4. 原解密流程
    try {
      const response = await fetch("/api/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSubscriptionUrl(importData)
            ? { password: importPassword || "", subscriptionUrl: importData }
            : { password: importPassword, encryptedData: importData }
        ),
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message || "解密或代理获取失败");
      }

      const payload = result.data;

      let shortsSourcesList: any[] = [];
      if (payload.shortsSources && Array.isArray(payload.shortsSources)) {
        shortsSourcesList = payload.shortsSources;
      } else if (payload.sources && Array.isArray(payload.sources)) {
        shortsSourcesList = payload.sources;
      } else if (Array.isArray(payload)) {
        shortsSourcesList = payload;
      }

      if (shortsSourcesList.length > 0) {
        setImportPreview(shortsSourcesList);
      } else {
        setDecryptError("配置中没有找到有效的短剧源配置");
      }
    } catch (error) {
      setDecryptError(error instanceof Error ? error.message : "解密/代理获取失败");
    } finally {
      setIsDecrypting(false);
    }
  };

  // 确认导入加密配置
  const handleConfirmEncryptedImport = async () => {
    if (!importPreview || importPreview.length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/shorts-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: importPreview,
          selected: importPreview[0]?.key || null,
        }),
      });

      const result = await response.json();

      if (result.code !== 200) {
        onShowToast({
          message: result.message || "导入短剧源失败",
          type: "error",
        });
        return;
      }

      onSourcesChange(importPreview);
      if (importPreview.length > 0) {
        onSelectedKeyChange(importPreview[0].key);
      }

      onShowToast({
        message: `已成功导入 ${importPreview.length} 个短剧源`,
        type: "success",
      });
      resetEncryptedImportModal();
    } catch (error) {
      console.error("导入失败:", error);
      onShowToast({ message: "导入失败", type: "error" });
    }
  };

  const handleAdd = () => {
    setFormData({
      key: "",
      name: "",
      api: "",
      typeId: undefined,
      priority: sources.length,
    });
    setIsAddMode(true);
    setEditingSource(null);
  };

  const handleEdit = (source: ShortDramaSource) => {
    setFormData({ ...source });
    setEditingSource(source);
    setIsAddMode(false);
  };

  const handleDelete = (key: string) => {
    const sourceToDelete = sources.find((s) => s.key === key);
    onShowConfirm({
      title: "删除短剧源",
      message: `确定要删除「${sourceToDelete?.name}」吗？`,
      onConfirm: async () => {
        try {
          const newSources = sources.filter((s) => s.key !== key);
          const newSelected =
            selectedKey === key && newSources.length > 0
              ? newSources[0].key
              : selectedKey;

          const response = await fetch("/api/shorts-sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sources: newSources,
              selected: newSelected,
            }),
          });

          const result = await response.json();

          if (result.code === 200) {
            onSourcesChange(newSources);
            onSelectedKeyChange(newSelected);
            onShowToast({ message: "删除成功", type: "success" });
          } else {
            onShowToast({
              message: result.message || "删除失败",
              type: "error",
            });
          }
        } catch (error) {
          console.error("删除失败:", error);
          onShowToast({ message: "删除失败", type: "error" });
        }
      },
      danger: true,
    });
  };

  const handleSave = async () => {
    if (!formData.key || !formData.name || !formData.api) {
      onShowToast({ message: "请填写 Key、名称和 API 地址", type: "warning" });
      return;
    }

    let newSources: ShortDramaSource[];

    if (isAddMode) {
      if (sources.some((s) => s.key === formData.key)) {
        onShowToast({ message: "短剧源 key 已存在", type: "error" });
        return;
      }
      newSources = [...sources, formData];
    } else {
      newSources = sources.map((s) =>
        s.key === editingSource?.key ? formData : s
      );
    }

    try {
      const response = await fetch("/api/shorts-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: newSources,
          selected: selectedKey,
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        onSourcesChange(newSources);
        handleCancel();
        onShowToast({ message: "保存成功", type: "success" });
      } else {
        onShowToast({
          message: result.message || "保存失败",
          type: "error",
        });
      }
    } catch (error) {
      console.error("保存失败:", error);
      onShowToast({ message: "保存失败", type: "error" });
    }
  };

  const handleCancel = () => {
    setEditingSource(null);
    setIsAddMode(false);
  };

  const handleSelectSource = async (key: string) => {
    try {
      const response = await fetch("/api/shorts-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected: key }),
      });

      const result = await response.json();

      if (result.code === 200) {
        onSelectedKeyChange(key);
      } else {
        onShowToast({
          message: result.message || "选择失败",
          type: "error",
        });
      }
    } catch (error) {
      console.error("选择短剧源失败:", error);
      onShowToast({ message: "选择失败", type: "error" });
    }
  };

  // 删除所有短剧源
  const handleDeleteAll = () => {
    if (sources.length === 0) {
      onShowToast({ message: "没有可删除的短剧源", type: "warning" });
      return;
    }

    onShowConfirm({
      title: "清空所有短剧源",
      message: `确定要删除所有 ${sources.length} 个短剧源吗？此操作不可撤销。`,
      onConfirm: async () => {
        try {
          const response = await fetch("/api/shorts-sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sources: [],
              selected: null,
            }),
          });

          const result = await response.json();

          if (result.code === 200) {
            onSourcesChange([]);
            onSelectedKeyChange("");
            onShowToast({ message: "已清空所有短剧源", type: "success" });
          } else {
            onShowToast({
              message: result.message || "清空失败",
              type: "error",
            });
          }
        } catch (error) {
          console.error("清空短剧源失败:", error);
          onShowToast({ message: "清空失败", type: "error" });
        }
      },
      danger: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Edit/Add Modal */}
      <Modal
        isOpen={!!(editingSource || isAddMode)}
        onClose={handleCancel}
        title={isAddMode ? "添加短剧源" : "编辑短剧源"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Key (唯一标识) <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              disabled={!isAddMode}
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: wwzy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              名称 <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 旺旺资源"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              API 地址 <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.api}
              onChange={(e) =>
                setFormData({ ...formData, api: e.target.value })
              }
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.example.com/provide/vod/"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              分类 ID <span className="text-muted-foreground font-normal">(可选)</span>
            </label>
            <input
              type="number"
              value={formData.typeId ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  typeId: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="短剧分类 ID"
            />
            <p className="text-xs text-muted-foreground mt-1">
              不同资源站的短剧分类 ID 不同，留空则获取全部
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              优先级{" "}
              <span className="text-muted-foreground font-normal">
                (数值越小优先级越高)
              </span>
            </label>
            <input
              type="number"
              value={formData.priority ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: parseInt(e.target.value) || 0,
                })
              }
              min={0}
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium"
          >
            保存
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition font-medium"
          >
            取消
          </button>
        </div>
      </Modal>

      {/* Sources List */}
      <div className="bg-card-bg rounded-xl p-6 border border-border-color">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">已配置的短剧源</h2>
            {sources.length > 0 && (
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {sources.length} 个
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormData({
                  key: `shorts_${Math.random().toString(36).substr(2, 5)}`,
                  name: "",
                  api: "",
                  priority: sources.length,
                });
                setIsAddMode(true);
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-primary-foreground rounded-lg transition font-medium text-sm flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              手动添加
            </button>
            <button
              onClick={() => setShowEncryptedImportModal(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium text-sm flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导入配置
            </button>
            {sources.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-foreground/10 hover:bg-primary text-muted-foreground hover:text-primary-foreground rounded-lg transition font-medium text-sm flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                清空全部
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.key}
              className={`p-4 rounded-lg border transition ${
                selectedKey === source.key
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border-color hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-2 py-1 bg-foreground/10 text-foreground rounded font-mono">
                      #{source.priority ?? 0}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">
                      {source.name}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-foreground/10 text-foreground rounded">
                      {source.key}
                    </span>
                    {selectedKey === source.key && (
                      <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                        默认
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>API: {source.api}</p>
                    {source.typeId !== undefined && (
                      <p>分类 ID: {source.typeId}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {selectedKey !== source.key && (
                    <button
                      onClick={() => handleSelectSource(source.key)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-primary-foreground text-sm rounded transition"
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(source)}
                    className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded transition"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(source.key)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-primary-foreground text-sm rounded transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-lg mb-2">暂无短剧源配置</p>
              <p className="text-sm">点击上方「导入配置」按钮开始配置</p>
            </div>
          )}
        </div>
      </div>

      {/* Encrypted Import Modal */}
      <Modal
        isOpen={showEncryptedImportModal}
        onClose={resetEncryptedImportModal}
        title="导入短剧源订阅配置"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              解密密码 <span className="text-muted-foreground font-normal">(未加密配置无需填写)</span>
            </label>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="如果是加密配置，请输入密码；未加密则留空"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              加密数据 / 订阅URL <span className="text-primary">*</span>
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="粘贴加密字符串，或输入订阅 URL (https://...)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              支持加密字符串或订阅 URL 两种方式导入
            </p>
          </div>

          {decryptError && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm">
              ❌ {decryptError}
            </div>
          )}

          <button
            onClick={handleDecryptPreview}
            disabled={isDecrypting || !importData}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-foreground/10 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition font-medium"
          >
            {isDecrypting ? "解析中..." : "🔍 解析/解密预览"}
          </button>

          {importPreview && importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  预览 ({importPreview.length} 个短剧源)
                </h4>
                <span className="text-xs text-green-400">✅ 解析成功</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-surface rounded-lg border border-border-color">
                {importPreview.map((source, index) => (
                  <div
                    key={source.key || index}
                    className="flex items-center justify-between p-2 bg-foreground/5 rounded"
                  >
                    <div>
                      <span className="text-foreground">{source.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {source.key}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      #{source.priority || 0}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConfirmEncryptedImport}
                className="w-full px-4 py-2 bg-[#46d369] hover:bg-[#3cb85e] text-black font-medium rounded-lg transition"
              >
                ✅ 确认导入
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
