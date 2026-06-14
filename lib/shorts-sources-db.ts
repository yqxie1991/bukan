import { readStore, writeStore } from "./json-store";
import { ShortDramaSource } from "@/types/shorts-source";

export interface ShortDramaSourceDoc {
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
  selected_key?: string;
  updated_at: string;
}

const SOURCES_FILE = 'shorts-sources.json';
const SELECTION_FILE = 'shorts-selection.json';

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

// 排序辅助函数
function sortShorts(a: ShortDramaSourceDoc, b: ShortDramaSourceDoc): number {
  const priorityA = a.priority ?? 0;
  const priorityB = b.priority ?? 0;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

// 获取所有启用的短剧源（按 priority 排序）
export async function getShortsSourcesFromDB(): Promise<ShortDramaSource[]> {
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  return docs
    .filter(doc => doc.enabled)
    .sort(sortShorts)
    .map(docToShortDramaSource);
}

// 获取所有短剧源（包括禁用的）
export async function getAllShortsSourcesFromDB(): Promise<ShortDramaSourceDoc[]> {
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  return docs.sort(sortShorts);
}

// 批量保存短剧源
export async function saveShortsSourcesToDB(sources: ShortDramaSource[]): Promise<void> {
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

  writeStore(SOURCES_FILE, docs);
}

// 添加或更新单个短剧源
export async function saveShortsSourceToDB(
  source: ShortDramaSource & { enabled?: boolean; sortOrder?: number }
): Promise<void> {
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  const now = new Date().toISOString();
  const index = docs.findIndex(doc => doc.key === source.key);

  const doc: ShortDramaSourceDoc = {
    key: source.key,
    name: source.name,
    api: source.api,
    type_id: source.typeId,
    priority: source.priority ?? 0,
    enabled: source.enabled !== undefined ? source.enabled : true,
    sort_order: source.sortOrder || 0,
    created_at: index >= 0 ? docs[index].created_at : now,
    updated_at: now,
  };

  if (index >= 0) {
    docs[index] = doc;
  } else {
    docs.push(doc);
  }

  writeStore(SOURCES_FILE, docs);
}

// 删除短剧源
export async function deleteShortsSourceFromDB(key: string): Promise<void> {
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  const filtered = docs.filter(doc => doc.key !== key);
  writeStore(SOURCES_FILE, filtered);
}

// 获取选中的短剧源（默认返回第一个）
export async function getSelectedShortsSourceFromDB(): Promise<ShortDramaSource | null> {
  const selection = readStore<ShortDramaSourceSelection | null>(SELECTION_FILE, null);
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  const enabledDocs = docs.filter(doc => doc.enabled).sort(sortShorts);

  if (selection?.selected_key) {
    const matched = enabledDocs.find(doc => doc.key === selection.selected_key);
    if (matched) {
      return docToShortDramaSource(matched);
    }
  }

  // 如果没有选中的或选中的源不存在，尝试返回第一个启用的源
  return enabledDocs.length > 0 ? docToShortDramaSource(enabledDocs[0]) : null;
}

// 根据 key 获取短剧源
export async function getShortsSourceByKey(key: string): Promise<ShortDramaSource | null> {
  const docs = readStore<ShortDramaSourceDoc[]>(SOURCES_FILE, []);
  const doc = docs.find(d => d.key === key && d.enabled);
  return doc ? docToShortDramaSource(doc) : null;
}

// 保存选中的短剧源
export async function saveSelectedShortsSourceToDB(key: string): Promise<void> {
  const selection: ShortDramaSourceSelection = {
    selected_key: key,
    updated_at: new Date().toISOString(),
  };
  writeStore(SELECTION_FILE, selection);
}
