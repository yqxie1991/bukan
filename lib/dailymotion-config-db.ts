import { getDatabase } from './db';
import { createCache } from './cache';
import type { DailymotionConfigData, DailymotionChannelConfig } from '@/types/dailymotion-config';

// 缓存键
const CACHE_KEY_CONFIG = 'dailymotion:config';
const CACHE_TTL = 3600; // 1小时

// 创建缓存实例
const cache = createCache(CACHE_TTL);

export interface DailymotionChannelDoc {
  _id?: string;
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailymotionConfigDoc {
  _id?: string;
  id: number; // 固定为 1，单例配置
  defaultChannelId?: string;
  updatedAt: string;
}

// 将数据库文档转换为配置对象
function docsToConfig(
  channels: DailymotionChannelDoc[],
  configDoc: DailymotionConfigDoc | null
): DailymotionConfigData {
  return {
    channels: channels.map((doc) => ({
      id: doc.id,
      username: doc.username,
      displayName: doc.displayName,
      avatarUrl: doc.avatarUrl,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
    })),
    defaultChannelId: configDoc?.defaultChannelId,
  };
}

// 获取所有频道配置（带缓存）
export async function getDailymotionConfigFromDB(): Promise<DailymotionConfigData> {
  try {
    // 尝试从缓存获取
    const cached = await cache.get<DailymotionConfigData>(CACHE_KEY_CONFIG);
    if (cached) {
      console.log('✅ 从缓存获取 Dailymotion 配置');
      return cached;
    }

    // 从数据库获取
    const db = await getDatabase();
    const channelsCollection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const configCollection = db.collection<DailymotionConfigDoc>('dailymotion_config');

    // 获取所有频道
    const channels = await channelsCollection.find().sort({ createdAt: 1 }).toArray();

    // 获取配置
    const configDoc = await configCollection.findOne({ id: 1 });

    // 如果没有任何频道，返回默认配置（但不写入数据库）
    // 这样避免在 MongoDB 查询出问题时覆盖真实数据
    if (channels.length === 0) {
      console.log('⚠️ 数据库中没有 Dailymotion 频道，返回默认配置（未写入数据库）');
      const defaultConfig: DailymotionConfigData = {
        channels: [
          {
            id: 'default',
            username: 'kchow125',
            displayName: 'KChow125',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ],
        defaultChannelId: 'default',
      };

      return defaultConfig;
    }

    const config = docsToConfig(channels, configDoc);

    // 缓存结果
    await cache.set(CACHE_KEY_CONFIG, config);

    console.log('✅ 从数据库获取 Dailymotion 配置');
    return config;
  } catch (error) {
    console.error('❌ 获取 Dailymotion 配置失败:', error);
    throw error;
  }
}

// 保存完整配置到数据库（使用 bulkWrite 提高原子性）
export async function saveDailymotionConfigToDB(config: DailymotionConfigData): Promise<void> {
  try {
    const db = await getDatabase();
    const channelsCollection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const configCollection = db.collection<DailymotionConfigDoc>('dailymotion_config');
    const now = new Date().toISOString();

    // 获取现有频道ID列表
    const existingChannels = await channelsCollection.find({}, { projection: { id: 1 } }).toArray();
    const existingIds = new Set(existingChannels.map(c => c.id));
    const newIds = new Set(config.channels.map(c => c.id));

    // 使用 bulkWrite 批量操作（更安全）
    const operations = [];

    // 删除不在新配置中的频道
    for (const existingId of existingIds) {
      if (!newIds.has(existingId)) {
        operations.push({ deleteOne: { filter: { id: existingId } } });
      }
    }

    // 更新或插入新频道
    for (const channel of config.channels) {
      operations.push({
        updateOne: {
          filter: { id: channel.id },
          update: {
            $set: {
              id: channel.id,
              username: channel.username,
              displayName: channel.displayName,
              avatarUrl: channel.avatarUrl,
              isActive: channel.isActive,
              createdAt: channel.createdAt,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await channelsCollection.bulkWrite(operations);
    }

    // 更新配置文档
    await configCollection.updateOne(
      { id: 1 },
      {
        $set: {
          id: 1,
          defaultChannelId: config.defaultChannelId,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // 清除缓存
    await cache.del(CACHE_KEY_CONFIG);

    console.log('✅ Dailymotion 配置已保存到数据库');
  } catch (error) {
    console.error('❌ 保存 Dailymotion 配置失败:', error);
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
    const db = await getDatabase();
    const channelsCollection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const configCollection = db.collection<DailymotionConfigDoc>('dailymotion_config');
    const now = new Date().toISOString();

    const newChannel: DailymotionChannelDoc = {
      id: `channel_${Date.now()}`,
      username,
      displayName,
      avatarUrl,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await channelsCollection.insertOne(newChannel);

    // 检查是否需要设置默认频道
    const existingConfig = await configCollection.findOne({ id: 1 });
    if (!existingConfig) {
      // 配置不存在，创建新配置
      await configCollection.insertOne({
        id: 1,
        defaultChannelId: newChannel.id,
        updatedAt: now,
      });
    } else if (!existingConfig.defaultChannelId) {
      // 配置存在但没有默认频道，设置当前频道为默认
      await configCollection.updateOne(
        { id: 1 },
        { $set: { defaultChannelId: newChannel.id, updatedAt: now } }
      );
    }
    // 如果已有默认频道，则不做任何操作

    // 清除缓存
    await cache.del(CACHE_KEY_CONFIG);

    console.log(`✅ 添加 Dailymotion 频道: ${displayName}`);

    return {
      id: newChannel.id,
      username: newChannel.username,
      displayName: newChannel.displayName,
      avatarUrl: newChannel.avatarUrl,
      isActive: newChannel.isActive,
      createdAt: newChannel.createdAt,
    };
  } catch (error) {
    console.error(`❌ 添加 Dailymotion 频道失败: ${displayName}`, error);
    throw error;
  }
}

// 更新频道
export async function updateDailymotionChannelInDB(
  id: string,
  updates: Partial<Omit<DailymotionChannelConfig, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const now = new Date().toISOString();

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          ...updates,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`频道不存在: ${id}`);
    }

    // 清除缓存
    await cache.del(CACHE_KEY_CONFIG);

    console.log(`✅ 更新 Dailymotion 频道: ${id}`);
  } catch (error) {
    console.error(`❌ 更新 Dailymotion 频道失败: ${id}`, error);
    throw error;
  }
}

// 删除频道
export async function deleteDailymotionChannelFromDB(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    const channelsCollection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const configCollection = db.collection<DailymotionConfigDoc>('dailymotion_config');

    const result = await channelsCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      throw new Error(`频道不存在: ${id}`);
    }

    // 如果删除的是默认频道，选择第一个作为新的默认频道
    const config = await configCollection.findOne({ id: 1 });
    if (config?.defaultChannelId === id) {
      const firstChannel = await channelsCollection.findOne({}, { sort: { createdAt: 1 } });
      await configCollection.updateOne(
        { id: 1 },
        {
          $set: {
            defaultChannelId: firstChannel?.id ?? undefined,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    }

    // 清除缓存
    await cache.del(CACHE_KEY_CONFIG);

    console.log(`✅ 删除 Dailymotion 频道: ${id}`);
  } catch (error) {
    console.error(`❌ 删除 Dailymotion 频道失败: ${id}`, error);
    throw error;
  }
}

// 设置默认频道
export async function setDefaultDailymotionChannelInDB(channelId: string): Promise<void> {
  try {
    const db = await getDatabase();
    const channelsCollection = db.collection<DailymotionChannelDoc>('dailymotion_channels');
    const configCollection = db.collection<DailymotionConfigDoc>('dailymotion_config');
    const now = new Date().toISOString();

    // 验证频道是否存在
    const channel = await channelsCollection.findOne({ id: channelId });
    if (!channel) {
      throw new Error(`频道不存在: ${channelId}`);
    }

    await configCollection.updateOne(
      { id: 1 },
      {
        $set: {
          id: 1,
          defaultChannelId: channelId,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // 清除缓存
    await cache.del(CACHE_KEY_CONFIG);

    console.log(`✅ 设置默认 Dailymotion 频道: ${channelId}`);
  } catch (error) {
    console.error(`❌ 设置默认 Dailymotion 频道失败: ${channelId}`, error);
    throw error;
  }
}

// 清除所有 Dailymotion 相关缓存
export async function clearDailymotionCache(): Promise<void> {
  await cache.delPattern('dailymotion:*');
  console.log('✅ 清除所有 Dailymotion 缓存');
}
