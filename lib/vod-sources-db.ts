import { readStore, writeStore } from "./json-store";
import { VodSource } from "@/types/drama";

export interface VodSourceDoc {
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
  selected_key?: string;
  updated_at: string;
}

const SOURCES_FILE = 'vod-sources.json';
const SELECTION_FILE = 'vod-selection.json';

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

// 排序辅助函数
function sortSources(a: VodSourceDoc, b: VodSourceDoc): number {
  const priorityA = a.priority ?? 0;
  const priorityB = b.priority ?? 0;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

// 获取所有启用的视频源（按 priority 排序，数值越小优先级越高）
export async function getVodSourcesFromDB(): Promise<VodSource[]> {
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  return docs
    .filter(doc => doc.enabled)
    .sort(sortSources)
    .map(docToVodSource);
}

// 获取所有视频源（包括禁用的，按 priority 排序）
export async function getAllVodSourcesFromDB(): Promise<VodSourceDoc[]> {
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  return docs.sort(sortSources);
}

// 添加或更新视频源
export async function saveVodSourceToDB(
  source: VodSource & { enabled?: boolean; sortOrder?: number }
): Promise<void> {
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  const now = new Date().toISOString();
  const index = docs.findIndex(doc => doc.key === source.key);

  const doc: VodSourceDoc = {
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

// 批量保存视频源（覆盖写入）
export async function saveVodSourcesToDB(sources: VodSource[]): Promise<void> {
  const now = new Date().toISOString();
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

  writeStore(SOURCES_FILE, docs);
}

// 删除视频源
export async function deleteVodSourceFromDB(key: string): Promise<void> {
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  const filtered = docs.filter(doc => doc.key !== key);
  writeStore(SOURCES_FILE, filtered);
}

// 启用/禁用视频源
export async function toggleVodSourceEnabled(key: string, enabled: boolean): Promise<void> {
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  const index = docs.findIndex(doc => doc.key === key);
  if (index >= 0) {
    docs[index].enabled = enabled;
    docs[index].updated_at = new Date().toISOString();
    writeStore(SOURCES_FILE, docs);
  }
}

// 获取选中的视频源
export async function getSelectedVodSourceFromDB(): Promise<VodSource | null> {
  const selection = readStore<VodSourceSelection | null>(SELECTION_FILE, null);
  const docs = readStore<VodSourceDoc[]>(SOURCES_FILE, []);
  const enabledDocs = docs.filter(doc => doc.enabled).sort(sortSources);

  if (selection?.selected_key) {
    const matched = enabledDocs.find(doc => doc.key === selection.selected_key);
    if (matched) {
      return docToVodSource(matched);
    }
  }

  // 如果没有选中的或选中的源不存在/不可用，返回第一个启用的源
  return enabledDocs.length > 0 ? docToVodSource(enabledDocs[0]) : null;
}

// 保存选中的视频源
export async function saveSelectedVodSourceToDB(key: string): Promise<void> {
  const selection: VodSourceSelection = {
    selected_key: key,
    updated_at: new Date().toISOString(),
  };
  writeStore(SELECTION_FILE, selection);
}
