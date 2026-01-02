import { getDatabase } from "./db";
import { VodSource } from "@/types/drama";
import { COLLECTIONS } from "./constants/db";
import type { AnyBulkWriteOperation } from "mongodb";

export interface VodSourceDoc {
  _id?: string;
  key: string;
  name: string;
  api: string;
  play_url?: string; // 播放地址前缀
  use_play_url?: boolean; // 是否使用播放地址
  priority?: number; // 优先级，数值越小优先级越高
  search_proxy?: string; // 搜索代理 URL
  parse_proxy?: string; // 视频解析代理 URL
  parse_token?: string; // 视频解析 token
  parse_id?: string; // 视频解析 id 参数
  type: "json"; // 仅支持 JSON
  enabled: boolean;
  sort_order: number;
  created_at: string; // ISO 字符串格式
  updated_at: string; // ISO 字符串格式
}

// VOD 源选择配置类型
export interface VodSourceSelection {
  _id?: string;
  id: number;
  selected_key?: string;
  updated_at: string;
}

// 将数据库文档转换为 VodSource 类型
function docToVodSource(doc: VodSourceDoc): VodSource {
  return {
    key: doc.key,
    name: doc.name,
    api: doc.api,
    playUrl: doc.play_url,
    usePlayUrl: doc.use_play_url ?? true,
    priority: doc.priority ?? 0,
    type: "json",
    searchProxy: doc.search_proxy,
    parseProxy: doc.parse_proxy,
    parseToken: doc.parse_token,
    parseId: doc.parse_id,
  };
}

// 获取所有启用的视频源（按 priority 排序，数值越小优先级越高）
export async function getVodSourcesFromDB(): Promise<VodSource[]> {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);

  const docs = await collection
    .find({ enabled: true })
    .sort({ priority: 1, sort_order: 1, _id: 1 })
    .toArray();

  return docs.map(docToVodSource);
}

// 获取所有视频源（包括禁用的，按 priority 排序）
export async function getAllVodSourcesFromDB(): Promise<VodSourceDoc[]> {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);

  const docs = await collection
    .find()
    .sort({ priority: 1, sort_order: 1, _id: 1 })
    .toArray();

  return docs;
}

// 添加或更新视频源
export async function saveVodSourceToDB(
  source: VodSource & { enabled?: boolean; sortOrder?: number }
) {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);
  const now = new Date().toISOString();

  const doc: Omit<VodSourceDoc, "_id" | "created_at"> & {
    created_at?: string;
  } = {
    key: source.key,
    name: source.name,
    api: source.api,
    play_url: source.playUrl,
    use_play_url: source.usePlayUrl ?? true,
    priority: source.priority ?? 0,
    search_proxy: source.searchProxy,
    parse_proxy: source.parseProxy,
    parse_token: source.parseToken,
    parse_id: source.parseId,
    type: source.type,
    enabled: source.enabled !== undefined ? source.enabled : true,
    sort_order: source.sortOrder || 0,
    updated_at: now,
  };

  await collection.updateOne(
    { key: source.key },
    {
      $set: doc,
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );
}

// 批量保存视频源（原子操作）
export async function saveVodSourcesToDB(sources: VodSource[]) {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);
  const now = new Date().toISOString();

  // 构建文档列表
  const docs: VodSourceDoc[] = sources.map((source, index) => ({
    key: source.key,
    name: source.name,
    api: source.api,
    play_url: source.playUrl,
    use_play_url: source.usePlayUrl ?? true,
    priority: source.priority ?? index,
    search_proxy: source.searchProxy,
    parse_proxy: source.parseProxy,
    parse_token: source.parseToken,
    parse_id: source.parseId,
    type: source.type,
    enabled: true,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));

  // 使用 bulkWrite 顺序执行（ordered: true）
  // 注意：失败时停止后续操作，但已执行操作不会回滚
  const operations: AnyBulkWriteOperation<VodSourceDoc>[] = [
    { deleteMany: { filter: {} } },
    ...docs.map((doc) => ({ insertOne: { document: doc } })),
  ];

  if (operations.length >= 1) {
    await collection.bulkWrite(operations, { ordered: true });
  }
}

// 删除视频源
export async function deleteVodSourceFromDB(key: string) {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);
  await collection.deleteOne({ key });
}

// 启用/禁用视频源
export async function toggleVodSourceEnabled(key: string, enabled: boolean) {
  const db = await getDatabase();
  const collection = db.collection<VodSourceDoc>(COLLECTIONS.VOD_SOURCES);
  const now = new Date().toISOString();

  await collection.updateOne({ key }, { $set: { enabled, updated_at: now } });
}

// 获取选中的视频源
export async function getSelectedVodSourceFromDB(): Promise<VodSource | null> {
  const db = await getDatabase();
  const selectionCollection = db.collection<VodSourceSelection>(
    COLLECTIONS.VOD_SOURCE_SELECTION
  );
  const vodSourcesCollection = db.collection<VodSourceDoc>(
    COLLECTIONS.VOD_SOURCES
  );

  // 获取选中的 key
  const selection = await selectionCollection.findOne({ id: 1 });

  if (selection?.selected_key) {
    const doc = await vodSourcesCollection.findOne({
      key: selection.selected_key,
      enabled: true,
    });
    if (doc) {
      return docToVodSource(doc);
    }
  }

  // 如果没有选中的或选中的源不存在，返回第一个启用的源
  const firstDoc = await vodSourcesCollection
    .find({ enabled: true })
    .sort({ sort_order: 1, _id: 1 })
    .limit(1)
    .toArray();

  return firstDoc.length > 0 ? docToVodSource(firstDoc[0]) : null;
}

// 保存选中的视频源
export async function saveSelectedVodSourceToDB(key: string) {
  const db = await getDatabase();
  const collection = db.collection<VodSourceSelection>(
    COLLECTIONS.VOD_SOURCE_SELECTION
  );
  const now = new Date().toISOString();

  await collection.updateOne(
    { id: 1 },
    {
      $set: {
        id: 1,
        selected_key: key,
        updated_at: now,
      },
    },
    { upsert: true }
  );
}
