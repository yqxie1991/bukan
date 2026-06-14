import { readStore, writeStore } from "./json-store";
import type {
  DailymotionConfigData,
  DailymotionChannelConfig,
} from "@/types/dailymotion-config";

const CONFIG_FILE = 'dailymotion-config.json';

const DEFAULT_CONFIG: DailymotionConfigData = {
  channels: [],
  defaultChannelId: undefined,
};

// 排序辅助：按创建时间升序排序
function sortChannels(channels: DailymotionChannelConfig[]): DailymotionChannelConfig[] {
  return [...channels].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// 获取所有频道配置
export async function getDailymotionConfigFromDB(): Promise<DailymotionConfigData> {
  try {
    const config = readStore<DailymotionConfigData>(CONFIG_FILE, DEFAULT_CONFIG);
    config.channels = sortChannels(config.channels || []);
    return config;
  } catch (error) {
    console.error("❌ 获取 Dailymotion 配置失败:", error);
    throw error;
  }
}

// 保存完整配置到数据库
export async function saveDailymotionConfigToDB(config: DailymotionConfigData): Promise<void> {
  try {
    writeStore(CONFIG_FILE, config);
    console.log("✅ Dailymotion 配置已保存");
  } catch (error) {
    console.error("❌ 保存 Dailymotion 配置失败:", error);
    throw error;
  }
}

// 添加频道
export async function addDailymotionChannelToDB(
  username: string,
  displayName: string,
  avatarUrl?: string
): Promise<DailymotionChannelConfig> {
  try {
    const config = readStore<DailymotionConfigData>(CONFIG_FILE, DEFAULT_CONFIG);
    const now = new Date().toISOString();

    const newChannel: DailymotionChannelConfig = {
      id: `channel_${Date.now()}`,
      username,
      displayName,
      avatarUrl,
      isActive: true,
      createdAt: now,
    };

    config.channels = config.channels || [];
    config.channels.push(newChannel);

    // 如果没有默认频道，设置当前频道为默认
    if (!config.defaultChannelId) {
      config.defaultChannelId = newChannel.id;
    }

    writeStore(CONFIG_FILE, config);
    console.log(`✅ 添加 Dailymotion 频道: ${displayName}`);
    return newChannel;
  } catch (error) {
    console.error(`❌ 添加 Dailymotion 频道失败: ${displayName}`, error);
    throw error;
  }
}

// 更新频道
export async function updateDailymotionChannelInDB(
  id: string,
  updates: Partial<Omit<DailymotionChannelConfig, "id" | "createdAt">>
): Promise<void> {
  try {
    const config = readStore<DailymotionConfigData>(CONFIG_FILE, DEFAULT_CONFIG);
    const index = config.channels?.findIndex(c => c.id === id) ?? -1;

    if (index === -1) {
      throw new Error(`频道不存在: ${id}`);
    }

    config.channels[index] = {
      ...config.channels[index],
      ...updates,
    };

    writeStore(CONFIG_FILE, config);
    console.log(`✅ 更新 Dailymotion 频道: ${id}`);
  } catch (error) {
    console.error(`❌ 更新 Dailymotion 频道失败: ${id}`, error);
    throw error;
  }
}

// 删除频道
export async function deleteDailymotionChannelFromDB(id: string): Promise<void> {
  try {
    const config = readStore<DailymotionConfigData>(CONFIG_FILE, DEFAULT_CONFIG);
    const channels = config.channels || [];
    const index = channels.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`频道不存在: ${id}`);
    }

    config.channels = channels.filter(c => c.id !== id);

    // 如果删除的是默认频道，选择第一个作为新的默认频道
    if (config.defaultChannelId === id) {
      const sorted = sortChannels(config.channels);
      config.defaultChannelId = sorted.length > 0 ? sorted[0].id : undefined;
    }

    writeStore(CONFIG_FILE, config);
    console.log(`✅ 删除 Dailymotion 频道: ${id}`);
  } catch (error) {
    console.error(`❌ 删除 Dailymotion 频道失败: ${id}`, error);
    throw error;
  }
}

// 设置默认频道
export async function setDefaultDailymotionChannelInDB(channelId: string): Promise<void> {
  try {
    const config = readStore<DailymotionConfigData>(CONFIG_FILE, DEFAULT_CONFIG);
    const exists = config.channels?.some(c => c.id === channelId);

    if (!exists) {
      throw new Error(`频道不存在: ${channelId}`);
    }

    config.defaultChannelId = channelId;
    writeStore(CONFIG_FILE, config);
    console.log(`✅ 设置默认 Dailymotion 频道: ${channelId}`);
  } catch (error) {
    console.error(`❌ 设置默认 Dailymotion 频道失败: ${channelId}`, error);
    throw error;
  }
}
