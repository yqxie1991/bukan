"use client";

import { useState } from "react";
import { VodSource } from "@/types/drama";
import { Modal } from "@/components/Modal";
import type { VodSourcesTabProps } from "./types";
import {
  decryptConfig,
  parseEncryptedString,
  fetchAndDecryptSubscription,
  isSubscriptionUrl,
  type ConfigPayload,
} from "@/lib/crypto";

export function VodSourcesTab({
  sources,
  selectedKey,
  onSourcesChange,
  onSelectedKeyChange,
  onShowToast,
  onShowConfirm,
}: VodSourcesTabProps) {
  const [editingSource, setEditingSource] = useState<VodSource | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<VodSource>({
    key: "",
    name: "",
    api: "",
    playUrl: "",
    usePlayUrl: true,
    priority: 0,
    type: "json",
  });

  // 加密导入相关状态
  const [showEncryptedImportModal, setShowEncryptedImportModal] =
    useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");
  const [importPreview, setImportPreview] = useState<VodSource[] | null>(null);
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
    if (!importPassword || !importData) {
      setDecryptError("请输入密码和加密数据");
      return;
    }

    setIsDecrypting(true);
    setDecryptError("");
    setImportPreview(null);

    try {
      let payload: ConfigPayload;

      if (isSubscriptionUrl(importData)) {
        // 从 URL 获取并解密
        payload = await fetchAndDecryptSubscription(importData, importPassword);
      } else {
        // 解析加密字符串并解密
        const encryptedPackage = parseEncryptedString(importData);
        payload = await decryptConfig(encryptedPackage, importPassword);
      }

      if (payload.vodSources && payload.vodSources.length > 0) {
        setImportPreview(payload.vodSources);
      } else {
        setDecryptError("配置中没有 VOD 源数据");
      }
    } catch (error) {
      setDecryptError(error instanceof Error ? error.message : "解密失败");
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
      const response = await fetch("/api/vod-sources", {
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
          message: result.message || "导入视频源失败",
          type: "error",
        });
        return;
      }

      onSourcesChange(importPreview);
      if (importPreview.length > 0) {
        onSelectedKeyChange(importPreview[0].key);
      }

      onShowToast({
        message: `已成功导入 ${importPreview.length} 个视频源`,
        type: "success",
      });
      resetEncryptedImportModal();
    } catch (error) {
      console.error("导入失败:", error);
      onShowToast({ message: "导入失败", type: "error" });
    }
  };

  const handleEdit = (source: VodSource) => {
    setFormData({ ...source });
    setEditingSource(source);
    setIsAddMode(false);
  };

  const handleDelete = (key: string) => {
    const sourceToDelete = sources.find((s) => s.key === key);
    onShowConfirm({
      title: "删除视频源",
      message: `确定要删除「${sourceToDelete?.name}」吗？`,
      onConfirm: async () => {
        try {
          const newSources = sources.filter((s) => s.key !== key);
          const newSelected =
            selectedKey === key && newSources.length > 0
              ? newSources[0].key
              : selectedKey;

          const response = await fetch("/api/vod-sources", {
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
    // playUrl 是可选的，不需要必填
    if (!formData.key || !formData.name || !formData.api) {
      onShowToast({ message: "请填写 Key、名称和 API 地址", type: "warning" });
      return;
    }

    let newSources: VodSource[];

    if (isAddMode) {
      if (sources.some((s) => s.key === formData.key)) {
        onShowToast({ message: "视频源key已存在", type: "error" });
        return;
      }
      newSources = [...sources, formData];
    } else {
      newSources = sources.map((s) =>
        s.key === editingSource?.key ? formData : s
      );
    }

    try {
      const response = await fetch("/api/vod-sources", {
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
      const response = await fetch("/api/vod-sources", {
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
      console.error("选择视频源失败:", error);
      onShowToast({ message: "选择失败", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={() => setShowEncryptedImportModal(true)}
          className="px-6 py-2 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] text-white rounded-lg transition font-medium flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
          导入订阅配置
        </button>
      </div>

      {/* Edit/Add Modal */}
      <Modal
        isOpen={!!(editingSource || isAddMode)}
        onClose={handleCancel}
        title={isAddMode ? "添加视频源" : "编辑视频源"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Key (唯一标识)
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              disabled={!isAddMode}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: rycjapi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 如意资源站"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API地址
            </label>
            <input
              type="text"
              value={formData.api}
              onChange={(e) =>
                setFormData({ ...formData, api: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              播放地址{" "}
              <span className="text-slate-500 font-normal">(可选)</span>
            </label>
            <input
              type="text"
              value={formData.playUrl || ""}
              onChange={(e) =>
                setFormData({ ...formData, playUrl: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="留空则直接使用原始播放链接"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              优先级{" "}
              <span className="text-slate-500 font-normal">
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
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.usePlayUrl ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, usePlayUrl: e.target.checked })
                }
                className="w-5 h-5 rounded bg-slate-900/50 border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300">
                使用播放地址解析
                <span className="text-slate-500 ml-2">
                  (关闭则直接播放原始 m3u8 链接)
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] text-white rounded-lg transition font-medium"
          >
            保存
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-[***REMOVED***333] hover:bg-[***REMOVED***444] text-white rounded-lg transition font-medium"
          >
            取消
          </button>
        </div>
      </Modal>

      {/* Sources List */}
      <div className="bg-[***REMOVED***1a1a1a] rounded-xl p-6 border border-[***REMOVED***333]">
        <h2 className="text-xl font-bold text-white mb-4">已配置的视频源</h2>
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.key}
              className={`p-4 rounded-lg border transition ${
                selectedKey === source.key
                  ? "bg-[***REMOVED***E50914]/10 border-[***REMOVED***E50914]"
                  : "bg-[***REMOVED***141414] border-[***REMOVED***333] hover:border-[***REMOVED***555]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded font-mono">
                      ***REMOVED***{source.priority ?? 0}
                    </span>
                    <h3 className="text-lg font-semibold text-white">
                      {source.name}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                      {source.key}
                    </span>
                    {selectedKey === source.key && (
                      <span className="text-xs px-2 py-1 bg-[***REMOVED***E50914] text-white rounded">
                        当前使用
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>API: {source.api}</p>
                    {source.playUrl && (
                      <p>
                        播放: {source.playUrl}
                        {source.usePlayUrl === false && (
                          <span className="ml-2 text-yellow-500">(未启用)</span>
                        )}
                      </p>
                    )}
                    {!source.playUrl && (
                      <p className="text-slate-500">播放: 直接使用原始链接</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {selectedKey !== source.key && (
                    <button
                      onClick={() => handleSelectSource(source.key)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                    >
                      设为当前
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(source)}
                    className="px-3 py-1 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] text-white text-sm rounded transition"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(source.key)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">📺 暂无视频源配置</p>
              <p className="text-sm">请点击上方「导入订阅配置」按钮导入配置</p>
            </div>
          )}
        </div>
      </div>

      {/* Encrypted Import Modal */}
      <Modal
        isOpen={showEncryptedImportModal}
        onClose={resetEncryptedImportModal}
        title="导入订阅配置"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              解密密码 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="输入加密时使用的密码"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              加密数据 / 订阅URL <span className="text-red-400">*</span>
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="粘贴加密字符串，或输入订阅 URL (https://...)"
            />
            <p className="text-xs text-slate-500 mt-1">
              支持加密字符串或订阅 URL 两种方式导入
            </p>
          </div>

          {decryptError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ❌ {decryptError}
            </div>
          )}

          <button
            onClick={handleDecryptPreview}
            disabled={isDecrypting || !importPassword || !importData}
            className="w-full px-4 py-2 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] disabled:bg-[***REMOVED***333] disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
          >
            {isDecrypting ? "解密中..." : "🔓 解密预览"}
          </button>

          {importPreview && importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-300">
                  预览 ({importPreview.length} 个视频源)
                </h4>
                <span className="text-xs text-green-400">✅ 解密成功</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                {importPreview.map((source, index) => (
                  <div
                    key={source.key || index}
                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                  >
                    <div>
                      <span className="text-white">{source.name}</span>
                      <span className="text-slate-500 text-xs ml-2">
                        {source.key}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      ***REMOVED***{source.priority || 0}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConfirmEncryptedImport}
                className="w-full px-4 py-2 bg-[***REMOVED***46d369] hover:bg-[***REMOVED***3cb85e] text-black font-medium rounded-lg transition"
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
