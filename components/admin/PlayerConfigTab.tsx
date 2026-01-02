"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import type { PlayerConfig, IframePlayer } from "@/app/api/player-config/route";
import type { PlayerConfigTabProps } from "./types";

export function PlayerConfigTab({
  playerConfig,
  onConfigChange,
  onShowToast,
  onShowConfirm,
}: PlayerConfigTabProps) {
  const [editingPlayer, setEditingPlayer] = useState<IframePlayer | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerFormData, setPlayerFormData] = useState<IframePlayer>({
    id: "",
    name: "",
    url: "",
    priority: 1,
    timeout: 10000,
    enabled: true,
  });

  const handleSavePlayerConfig = async (newConfig: PlayerConfig) => {
    try {
      const response = await fetch("/api/player-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });

      const result = await response.json();

      if (result.code === 200) {
        onConfigChange(newConfig);
        onShowToast({ message: "保存成功", type: "success" });
      } else {
        onShowToast({
          message: result.message || "保存失败",
          type: "error",
        });
      }
    } catch (error) {
      console.error("保存播放器配置失败:", error);
      onShowToast({ message: "保存失败", type: "error" });
    }
  };

  const handlePlayerModeChange = (mode: "iframe" | "local" | "auto") => {
    handleSavePlayerConfig({ ...playerConfig, mode });
  };

  const handleToggleProxy = (enabled: boolean) => {
    handleSavePlayerConfig({ ...playerConfig, enableProxy: enabled });
  };

  const handleAddPlayer = () => {
    setPlayerFormData({
      id: `player${Date.now()}`,
      name: "",
      url: "",
      priority: playerConfig.iframePlayers.length + 1,
      timeout: 10000,
      enabled: true,
    });
    setIsAddingPlayer(true);
    setEditingPlayer(null);
  };

  const handleEditPlayer = (player: IframePlayer) => {
    setPlayerFormData({ ...player });
    setEditingPlayer(player);
    setIsAddingPlayer(false);
  };

  const handleDeletePlayer = (playerId: string) => {
    const playerToDelete = playerConfig.iframePlayers.find(
      (p) => p.id === playerId
    );
    onShowConfirm({
      title: "删除播放器",
      message: `确定要删除「${playerToDelete?.name}」吗？`,
      onConfirm: async () => {
        const newPlayers = playerConfig.iframePlayers.filter(
          (p) => p.id !== playerId
        );
        await handleSavePlayerConfig({
          ...playerConfig,
          iframePlayers: newPlayers,
        });
      },
      danger: true,
    });
  };

  const handleSavePlayer = async () => {
    if (!playerFormData.name || !playerFormData.url) {
      onShowToast({ message: "请填写完整信息", type: "warning" });
      return;
    }

    let newPlayers: IframePlayer[];

    if (isAddingPlayer) {
      newPlayers = [...playerConfig.iframePlayers, playerFormData];
    } else {
      newPlayers = playerConfig.iframePlayers.map((p) =>
        p.id === editingPlayer?.id ? playerFormData : p
      );
    }

    await handleSavePlayerConfig({
      ...playerConfig,
      iframePlayers: newPlayers,
    });
    handleCancelPlayerEdit();
  };

  const handleCancelPlayerEdit = () => {
    setIsAddingPlayer(false);
    setEditingPlayer(null);
  };

  const handleTogglePlayerEnabled = (playerId: string, enabled: boolean) => {
    const newPlayers = playerConfig.iframePlayers.map((p) =>
      p.id === playerId ? { ...p, enabled } : p
    );
    handleSavePlayerConfig({ ...playerConfig, iframePlayers: newPlayers });
  };

  const handleLocalPlayerSettingChange = (
    key: keyof PlayerConfig["localPlayerSettings"],
    value: boolean | number | string
  ) => {
    handleSavePlayerConfig({
      ...playerConfig,
      localPlayerSettings: {
        ...playerConfig.localPlayerSettings,
        [key]: value,
      },
    });
  };

  // 重置播放器配置（恢复默认）
  const handleResetPlayers = () => {
    onShowConfirm({
      title: "重置播放器配置",
      message:
        "确定要重置播放器配置吗？这将恢复到系统默认配置，当前自定义的播放器将被删除。",
      onConfirm: async () => {
        try {
          // 获取默认配置
          const response = await fetch("/api/player-config/default");
          const result = await response.json();

          if (result.code === 200 && result.data) {
            await handleSavePlayerConfig({
              ...playerConfig,
              iframePlayers: result.data.iframePlayers,
              localPlayerSettings: result.data.localPlayerSettings,
            });
            onShowToast({ message: "已重置为默认配置", type: "success" });
          } else {
            onShowToast({
              message: result.message || "重置失败",
              type: "error",
            });
          }
        } catch (error) {
          console.error("重置播放器配置失败:", error);
          onShowToast({ message: "重置失败", type: "error" });
        }
      },
      danger: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[***REMOVED***1a1a1a] rounded-xl p-6 border border-[***REMOVED***333]">
        <h2 className="text-xl font-bold text-white mb-6">播放器配置</h2>

        {/* 播放器模式选择 */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">播放器模式</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handlePlayerModeChange("iframe")}
              className={`p-4 rounded-lg border-2 transition ${
                playerConfig.mode === "iframe"
                  ? "border-[***REMOVED***E50914] bg-[***REMOVED***E50914]/10"
                  : "border-[***REMOVED***333] bg-[***REMOVED***141414] hover:border-[***REMOVED***555]"
              }`}
            >
              <div className="text-white font-medium mb-1">iframe模式</div>
              <div className="text-xs text-slate-400">
                兼容性好，多播放器切换
              </div>
            </button>
            <button
              onClick={() => handlePlayerModeChange("local")}
              className={`p-4 rounded-lg border-2 transition ${
                playerConfig.mode === "local"
                  ? "border-[***REMOVED***E50914] bg-[***REMOVED***E50914]/10"
                  : "border-[***REMOVED***333] bg-[***REMOVED***141414] hover:border-[***REMOVED***555]"
              }`}
            >
              <div className="text-white font-medium mb-1">本地HLS播放器</div>
              <div className="text-xs text-slate-400">完全控制，进度记忆</div>
            </button>
            <button
              onClick={() => handlePlayerModeChange("auto")}
              className={`p-4 rounded-lg border-2 transition ${
                playerConfig.mode === "auto"
                  ? "border-[***REMOVED***E50914] bg-[***REMOVED***E50914]/10"
                  : "border-[***REMOVED***333] bg-[***REMOVED***141414] hover:border-[***REMOVED***555]"
              }`}
            >
              <div className="text-white font-medium mb-1">自动模式</div>
              <div className="text-xs text-slate-400">智能选择最佳播放器</div>
            </button>
          </div>
        </div>

        {/* 代理设置 */}
        <div className="mb-6 flex items-center justify-between p-4 bg-[***REMOVED***141414] rounded-lg border border-[***REMOVED***333]">
          <div>
            <h3 className="text-white font-medium mb-1">启用视频代理</h3>
            <p className="text-xs text-slate-400">
              本地播放器需要启用代理（推荐）
            </p>
          </div>
          <button
            onClick={() => handleToggleProxy(!playerConfig.enableProxy)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              playerConfig.enableProxy ? "bg-[***REMOVED***E50914]" : "bg-[***REMOVED***333]"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                playerConfig.enableProxy ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* iframe播放器列表 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">iframe播放器列表</h3>
            <div className="flex gap-2">
              <button
                onClick={handleResetPlayers}
                className="px-4 py-2 bg-[***REMOVED***333] hover:bg-orange-600 text-slate-300 hover:text-white text-sm rounded-lg transition"
              >
                🔄 重置为默认
              </button>
              <button
                onClick={handleAddPlayer}
                className="px-4 py-2 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] text-white text-sm rounded-lg transition"
              >
                + 添加播放器
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {playerConfig.iframePlayers.map((player) => (
              <div
                key={player.id}
                className="p-4 bg-[***REMOVED***141414] rounded-lg border border-[***REMOVED***333] hover:border-[***REMOVED***555] transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-medium">
                        {player.name}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                        优先级: {player.priority}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                        超时: {player.timeout}ms
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 break-all">
                      {player.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() =>
                        handleTogglePlayerEnabled(player.id, !player.enabled)
                      }
                      className={`px-3 py-1 text-xs rounded transition ${
                        player.enabled
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-[***REMOVED***333] hover:bg-[***REMOVED***444] text-slate-300"
                      }`}
                    >
                      {player.enabled ? "已启用" : "已禁用"}
                    </button>
                    <button
                      onClick={() => handleEditPlayer(player)}
                      className="px-3 py-1 bg-[***REMOVED***E50914] hover:bg-[***REMOVED***B20710] text-white text-xs rounded transition"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 本地播放器设置 */}
        <div>
          <h3 className="text-white font-medium mb-4">本地播放器设置</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[***REMOVED***141414] rounded-lg border border-[***REMOVED***333]">
              <div>
                <span className="text-white text-sm">自动保存进度</span>
                <p className="text-xs text-slate-400 mt-1">记住上次播放位置</p>
              </div>
              <button
                onClick={() =>
                  handleLocalPlayerSettingChange(
                    "autoSaveProgress",
                    !playerConfig.localPlayerSettings.autoSaveProgress
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  playerConfig.localPlayerSettings.autoSaveProgress
                    ? "bg-[***REMOVED***E50914]"
                    : "bg-[***REMOVED***333]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    playerConfig.localPlayerSettings.autoSaveProgress
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-3 bg-[***REMOVED***141414] rounded-lg border border-[***REMOVED***333]">
              <label className="text-white text-sm block mb-2">
                进度保存间隔（秒）
              </label>
              <input
                type="number"
                value={playerConfig.localPlayerSettings.progressSaveInterval}
                onChange={(e) =>
                  handleLocalPlayerSettingChange(
                    "progressSaveInterval",
                    parseInt(e.target.value) || 5
                  )
                }
                className="w-full px-3 py-2 bg-slate-900/50 border border-[***REMOVED***333] rounded text-white focus:outline-none focus:ring-2 focus:ring-[***REMOVED***E50914]"
                min="1"
                max="60"
              />
            </div>

            <div className="p-3 bg-[***REMOVED***141414] rounded-lg border border-[***REMOVED***333]">
              <label className="text-white text-sm block mb-2">主题颜色</label>
              <input
                type="color"
                value={playerConfig.localPlayerSettings.theme}
                onChange={(e) =>
                  handleLocalPlayerSettingChange("theme", e.target.value)
                }
                className="w-20 h-10 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 播放器编辑弹框 */}
      <Modal
        isOpen={!!(editingPlayer || isAddingPlayer)}
        onClose={handleCancelPlayerEdit}
        title={isAddingPlayer ? "添加iframe播放器" : "编辑iframe播放器"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              播放器名称
            </label>
            <input
              type="text"
              value={playerFormData.name}
              onChange={(e) =>
                setPlayerFormData({ ...playerFormData, name: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 备用播放器1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              播放器URL
            </label>
            <input
              type="text"
              value={playerFormData.url}
              onChange={(e) =>
                setPlayerFormData({ ...playerFormData, url: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://jx.example.com/?url="
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              优先级（数字越小越优先）
            </label>
            <input
              type="number"
              value={playerFormData.priority}
              onChange={(e) =>
                setPlayerFormData({
                  ...playerFormData,
                  priority: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              超时时间（毫秒）
            </label>
            <input
              type="number"
              value={playerFormData.timeout}
              onChange={(e) =>
                setPlayerFormData({
                  ...playerFormData,
                  timeout: parseInt(e.target.value) || 10000,
                })
              }
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1000"
              step="1000"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSavePlayer}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            保存
          </button>
          <button
            onClick={handleCancelPlayerEdit}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition font-medium"
          >
            取消
          </button>
        </div>
      </Modal>
    </div>
  );
}
