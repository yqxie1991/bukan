import { getDatabase } from "./db";
import { ShortDramaSource } from "@/types/shorts-source";
import { COLLECTIONS } from "./constants/db";
import type { AnyBulkWriteOperation } from "mongodb";

export interface ShortDramaSourceDoc {
  _id?: string;
  key: string;
  name: string;
  api: string;
  type_id?: number; // 短剧分类 ID
  priority?: number; // 优先级
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// 短剧源选择配置类型
export interface ShortDramaSourceSelection {
  _id?: string;
  id: number;
  selected_key?: string;
  updated_at: string;
}

// 将数据库文档转换为 ShortDramaSource 类型
function docToShortDramaSource(doc: ShortDramaSourceDoc): ShortDramaSource {
  return {
    key: doc.key,
    name: doc.name,
    api: doc.api,
    typeId: doc.type_id,
    priority: doc.priority ?? 0,
  };
}

// 获取所有启用的短剧源（按 priority 排序）
export async function getShortsSourcesFromDB(): Promise<ShortDramaSource[]> {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );

  const docs = await collection
    .find({ enabled: true })
    .sort({ priority: 1, sort_order: 1, _id: 1 })
    .toArray();

  return docs.map(docToShortDramaSource);
}

// 获取所有短剧源（包括禁用的）
export async function getAllShortsSourcesFromDB(): Promise<
  ShortDramaSourceDoc[]
> {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );

  const docs = await collection
    .find()
    .sort({ priority: 1, sort_order: 1, _id: 1 })
    .toArray();

  return docs;
}

// 批量保存短剧源
export async function saveShortsSourcesToDB(sources: ShortDramaSource[]) {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );
  const now = new Date().toISOString();

  const docs: ShortDramaSourceDoc[] = sources.map((source, index) => ({
    key: source.key,
    name: source.name,
    api: source.api,
    type_id: source.typeId,
    priority: source.priority ?? index,
    enabled: true,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));

  const operations: AnyBulkWriteOperation<ShortDramaSourceDoc>[] = [
    { deleteMany: { filter: {} } },
    ...docs.map((doc) => ({ insertOne: { document: doc } })),
  ];

  if (operations.length >= 1) {
    await collection.bulkWrite(operations, { ordered: true });
  }
}

// 删除短剧源
export async function deleteShortsSourceFromDB(key: string) {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );
  await collection.deleteOne({ key });
}

// 获取选中的短剧源（默认返回第一个）
export async function getSelectedShortsSourceFromDB(): Promise<ShortDramaSource | null> {
  const db = await getDatabase();
  const selectionCollection = db.collection<ShortDramaSourceSelection>(
    COLLECTIONS.SHORTS_SOURCE_SELECTION
  );
  const shortsSourcesCollection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );

  // 获取选中的 key
  const selection = await selectionCollection.findOne({ id: 1 });

  if (selection?.selected_key) {
    const doc = await shortsSourcesCollection.findOne({
      key: selection.selected_key,
      enabled: true,
    });
    if (doc) {
      return docToShortDramaSource(doc);
    }
  }

  // 如果没有选中的或选中的源不存在，尝试返回第一个启用的源
  const firstDoc = await shortsSourcesCollection
    .find({ enabled: true })
    .sort({ sort_order: 1, _id: 1 })
    .limit(1)
    .toArray();

  if (firstDoc.length > 0) {
    return docToShortDramaSource(firstDoc[0]);
  }

  return null;
}

// 根据 key 获取短剧源
export async function getShortsSourceByKey(
  key: string
): Promise<ShortDramaSource | null> {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceDoc>(
    COLLECTIONS.SHORTS_SOURCES
  );

  const doc = await collection.findOne({ key, enabled: true });

  if (doc) {
    return docToShortDramaSource(doc);
  }

  return null;
}

// 保存选中的短剧源
export async function saveSelectedShortsSourceToDB(key: string) {
  const db = await getDatabase();
  const collection = db.collection<ShortDramaSourceSelection>(
    COLLECTIONS.SHORTS_SOURCE_SELECTION
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
