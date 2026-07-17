"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Star, Download, X, Lock } from "lucide-react";
import type { DailymotionChannelConfig } from "@/types/dailymotion-config";
import type { DailymotionChannelsTabProps } from "./types";
import { isSubscriptionUrl } from "@/lib/utils";

export function DailymotionChannelsTab({
  channels,
  defaultChannelId,
  onChannelsChange,
  onShowToast,
  onShowConfirm,
  unifiedImport,
}: DailymotionChannelsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    avatarUrl: "",
  });
  const [importing, setImporting] = useState(false);

  // 加密导入相关状态
  const [showEncryptedImportModal, setShowEncryptedImportModal] =
    useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");
  const [importPreview, setImportPreview] = useState<
    Omit<DailymotionChannelConfig, "id" | "createdAt">[] | null
  >(null);
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

  // 解密预览 - 使用服务器端 API（支持 HTTP 环境）
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
          let dailymotionChannelsList: any[] = [];
          
          // 格式 A: 标准打包格式
          if (parsedPayload.dailymotionChannels && Array.isArray(parsedPayload.dailymotionChannels)) {
            dailymotionChannelsList = parsedPayload.dailymotionChannels;
          } 
          // 格式 B: 单页导出的 channels 字段
          else if (parsedPayload.channels && Array.isArray(parsedPayload.channels)) {
            dailymotionChannelsList = parsedPayload.channels;
          }
          // 格式 C: 单页导出的 sources 字段
          else if (parsedPayload.sources && Array.isArray(parsedPayload.sources)) {
            dailymotionChannelsList = parsedPayload.sources;
          }
          // 格式 D: 纯数组格式 (直接是列表)
          else if (Array.isArray(parsedPayload)) {
            dailymotionChannelsList = parsedPayload;
          }

          if (dailymotionChannelsList.length === 0) {
            throw new Error("JSON 中没有找到有效的 Dailymotion 频道配置 (请检查是否包含 dailymotionChannels、channels、sources 键或本身是列表)");
          }

          setImportPreview(dailymotionChannelsList);
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
      // 使用服务器端 API 进行解密（不依赖 Web Crypto API）
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

      let dailymotionChannelsList: any[] = [];
      if (payload.dailymotionChannels && Array.isArray(payload.dailymotionChannels)) {
        dailymotionChannelsList = payload.dailymotionChannels;
      } else if (payload.channels && Array.isArray(payload.channels)) {
        dailymotionChannelsList = payload.channels;
      } else if (payload.sources && Array.isArray(payload.sources)) {
        dailymotionChannelsList = payload.sources;
      } else if (Array.isArray(payload)) {
        dailymotionChannelsList = payload;
      }

      if (dailymotionChannelsList.length > 0) {
        setImportPreview(dailymotionChannelsList);
      } else {
        setDecryptError("配置中没有找到有效的 Dailymotion 频道配置");
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
      // 先从服务器获取最新的数据库数据，避免使用可能包含未保存默认配置的客户端状态
      const freshResponse = await fetch("/api/dailymotion-config");
      const freshResult = await freshResponse.json();

      // 获取数据库中实际存在的用户名列表
      // 注意：如果数据库为空，服务器会返回一个虚拟的 default 频道，需要完全排除这种情况
      const serverChannels =
        freshResult.code === 200 && freshResult.data?.channels
          ? freshResult.data.channels
          : [];

      // 检查是否是虚拟默认配置（数据库实际为空）
      const isVirtualDefaultOnly =
        serverChannels.length === 1 && serverChannels[0].id === "default";

      const existingUsernames = new Set<string>(
        isVirtualDefaultOnly
          ? [] // 数据库为空，没有真实的已存在用户名
          : serverChannels.map((c: { username: string }) => c.username)
      );

      let addedCount = 0;

      // 依次添加频道
      for (const preset of importPreview) {
        // 检查是否已存在于数据库或本次导入中已添加
        if (existingUsernames.has(preset.username)) continue;

        const response = await fetch("/api/dailymotion-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            ...preset,
          }),
        });

        const result = await response.json();
        if (result.code === 200) {
          onChannelsChange(result.data.channels, result.data.defaultChannelId);
          // 记录已添加的用户名，避免重复
          existingUsernames.add(preset.username);
          addedCount++;
        }
      }

      onShowToast({
        message: `已成功导入 ${addedCount} 个频道配置`,
        type: "success",
      });
      resetEncryptedImportModal();
    } catch (error) {
      onShowToast({
        message: error instanceof Error ? error.message : "导入失败",
        type: "error",
      });
    }
  };

  // 清空全部频道
  const handleDeleteAll = () => {
    if (channels.length === 0) {
      onShowToast({ message: "暂无频道可清空", type: "error" });
      return;
    }

    onShowConfirm({
      title: "清空全部频道",
      message: `确定要清空全部 ${channels.length} 个 Dailymotion 频道吗？此操作不可恢复！`,
      danger: true,
      onConfirm: async () => {
        try {
          // 逐个删除所有频道
          for (const channel of channels) {
            await fetch("/api/dailymotion-config", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "delete",
                id: channel.id,
              }),
            });
          }
          onChannelsChange([], undefined);
          onShowToast({ message: "已清空全部频道", type: "success" });
        } catch (error) {
          onShowToast({ message: "清空失败", type: "error" });
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({ username: "", displayName: "", avatarUrl: "" });

    setShowModal(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.username.trim() || !formData.displayName.trim()) {
      onShowToast({ message: "请填写必填字段", type: "error" });
      return;
    }

    try {
      const response = await fetch("/api/dailymotion-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          ...formData,
        }),
      });

      const result = await response.json();
      if (result.code === 200) {
        onChannelsChange(result.data.channels, result.data.defaultChannelId);
        onShowToast({ message: "频道添加成功", type: "success" });
        resetForm();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      onShowToast({
        message: error instanceof Error ? error.message : "添加失败",
        type: "error",
      });
    }
  };

  const handleUpdate = async () => {
    if (!formData.username.trim() || !formData.displayName.trim()) {
      onShowToast({ message: "请填写必填字段", type: "error" });
      return;
    }

    try {
      const response = await fetch("/api/dailymotion-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingId,
          ...formData,
        }),
      });

      const result = await response.json();
      if (result.code === 200) {
        onChannelsChange(result.data.channels, result.data.defaultChannelId);
        onShowToast({ message: "频道更新成功", type: "success" });
        resetForm();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      onShowToast({
        message: error instanceof Error ? error.message : "更新失败",
        type: "error",
      });
    }
  };

  const handleDelete = (channel: DailymotionChannelConfig) => {
    onShowConfirm({
      title: "删除频道",
      message: `确定要删除频道"${channel.displayName}"吗？`,
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch("/api/dailymotion-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete",
              id: channel.id,
            }),
          });

          const result = await response.json();
          if (result.code === 200) {
            onChannelsChange(
              result.data.channels,
              result.data.defaultChannelId
            );
            onShowToast({ message: "频道删除成功", type: "success" });
          } else {
            throw new Error(result.message);
          }
        } catch (error) {
          onShowToast({
            message: error instanceof Error ? error.message : "删除失败",
            type: "error",
          });
        }
      },
    });
  };

  const handleSetDefault = async (channelId: string) => {
    try {
      const response = await fetch("/api/dailymotion-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setDefault",
          id: channelId,
        }),
      });

      const result = await response.json();
      if (result.code === 200) {
        onChannelsChange(result.data.channels, result.data.defaultChannelId);
        onShowToast({ message: "默认频道设置成功", type: "success" });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      onShowToast({
        message: error instanceof Error ? error.message : "设置失败",
        type: "error",
      });
    }
  };

  const startEdit = (channel: DailymotionChannelConfig) => {
    setEditingId(channel.id);
    setFormData({
      username: channel.username,
      displayName: channel.displayName,
      avatarUrl: channel.avatarUrl || "",
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Sources List Container - matching VodSourcesTab */}
      <div className="bg-card-bg rounded-xl p-6 border border-border-color">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              Dailymotion 频道管理
            </h2>
            {channels.length > 0 && (
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {channels.length} 个
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {channels.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-foreground/10 hover:bg-red-600 text-foreground rounded-lg transition font-medium text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                清空全部
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
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
              <Download size={16} />
              导入配置
            </button>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <div
              className="bg-card-bg rounded-xl max-w-2xl w-full border border-border-color shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border-color">
                <h3 className="text-xl font-bold text-foreground">
                  {editingId ? "编辑频道" : "添加新频道"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      用户名 <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="例如: kchow125"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      显示名称 <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          displayName: e.target.value,
                        })
                      }
                      placeholder="例如: KChow125"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      头像 URL（可选）
                    </label>
                    <input
                      type="text"
                      value={formData.avatarUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, avatarUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-border-color">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition"
                >
                  {editingId ? "更新" : "添加"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Channels List */}
        <div className="space-y-3">
          {channels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-5xl mb-4">📺</div>
              <p className="text-lg mb-2">暂无频道配置</p>
              <p className="text-sm">点击上方「导入配置」按钮开始配置</p>
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                className={`p-4 rounded-lg border transition ${
                  channel.id === defaultChannelId
                    ? "bg-primary/10 border-primary"
                    : "bg-surface border-border-color hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {channel.avatarUrl ? (
                      <img
                        src={channel.avatarUrl}
                        alt={channel.displayName}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center text-muted-foreground">
                        {channel.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground font-semibold">
                          {channel.displayName}
                        </h3>
                        {channel.id === defaultChannelId && (
                          <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                            默认
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        @{channel.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {channel.id !== defaultChannelId && (
                      <button
                        onClick={() => handleSetDefault(channel.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-primary-foreground text-sm rounded transition"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(channel)}
                      className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded transition"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(channel)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-primary-foreground text-sm rounded transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Encrypted Import Modal */}
      {showEncryptedImportModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={resetEncryptedImportModal}
        >
          <div
            className="bg-card-bg rounded-xl max-w-2xl w-full border border-border-color shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border-color">
              <h3 className="text-xl font-bold text-foreground">导入订阅配置</h3>
              <button
                onClick={resetEncryptedImportModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  解密密码 <span className="text-muted-foreground font-normal">(未加密配置无需填写)</span>
                </label>
                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
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
                  className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-foreground font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  placeholder="粘贴加密字符串，或输入订阅 URL (https://...)"
                />
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
                      预览 ({importPreview.length} 个频道)
                    </h4>
                    <span className="text-xs text-green-400">✅ 解析成功</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-surface rounded-lg border border-border-color">
                    {importPreview.map((channel, index) => (
                      <div
                        key={channel.username || index}
                        className="flex items-center gap-3 p-2 bg-surface rounded"
                      >
                        <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-muted-foreground text-sm">
                          {channel.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-foreground">
                            {channel.displayName}
                          </span>
                          <span className="text-muted-foreground text-xs ml-2">
                            @{channel.username}
                          </span>
                        </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
