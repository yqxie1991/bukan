/**
 * 多源匹配结果的 localStorage 缓存
 *
 * 背景：此前缓存统一存于单一全局 key `multi_source_matches`，且播放页写入时
 * 未携带 douban_id，而详情页读取时校验 `data.douban_id === doubanId`，
 * 两者不一致导致缓存永不命中——用户每次进入详情页都会对全部视频源
 * 发起一轮并发搜索，形成上游请求洪水。
 *
 * 本模块统一：
 * - 按 doubanId 隔离 key（消除多标签页互相覆盖）
 * - 统一 30 分钟 TTL
 * - 兼容旧的全局 key（保留一个发布周期的只读回退）
 * - 播放页在缺少 douban_id 时仍可按 vod_id 检索全局 key
 */

/** 缓存有效期：30 分钟 */
export const MATCH_CACHE_TTL_MS = 30 * 60 * 1000;

/** 旧版全局 key（兼容读取；同时作为播放页无 douban_id 时的回退写入目标） */
const LEGACY_CACHE_KEY = 'multi_source_matches';

/**
 * 生成指定影片的缓存 key
 */
export function getMatchCacheKey(doubanId: string | number): string {
  return `multi_source_matches_${doubanId}`;
}

export interface CachedMatchData {
  title?: string;
  douban_id?: string | number;
  matches: unknown[];
  timestamp: number;
}

function readKey(key: string): CachedMatchData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMatchData;
    if (!parsed || !Array.isArray(parsed.matches) || parsed.matches.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isFresh(data: CachedMatchData | null): data is CachedMatchData {
  if (!data) return false;
  return Date.now() - data.timestamp < MATCH_CACHE_TTL_MS;
}

interface MinimalMatch {
  vod_id?: string | number;
  source_key?: string;
}

/**
 * 读取指定影片（按 doubanId）的匹配缓存，供详情页使用
 *
 * 优先读取按 doubanId 隔离的新 key；其次回退旧全局 key
 * （旧数据若缺少 douban_id 则无法确认归属，一律不采信）。
 */
export function readMatchCache(doubanId: string | number): CachedMatchData | null {
  const scoped = readKey(getMatchCacheKey(doubanId));
  if (isFresh(scoped) && String(scoped.douban_id) === String(doubanId)) {
    return scoped;
  }

  // 兼容回退：旧 key 若带有匹配的 douban_id 仍可使用
  const legacy = readKey(LEGACY_CACHE_KEY);
  if (isFresh(legacy) && String(legacy.douban_id) === String(doubanId)) {
    return legacy;
  }

  return null;
}

/**
 * 读取包含指定 vod_id 的匹配缓存，供播放页使用
 *
 * 播放页可能通过 URL 携带 douban_id（此时走隔离 key），
 * 否则回退检索旧全局 key，按 vod_id 判断归属。
 */
export function readMatchCacheForVideo(
  doubanId: string | number | null,
  vodId: string | number
): CachedMatchData | null {
  if (doubanId !== null && doubanId !== undefined && doubanId !== '') {
    const scoped = readMatchCache(doubanId);
    if (scoped) {
      const contains = scoped.matches.some(
        (m) => String((m as MinimalMatch).vod_id) === String(vodId)
      );
      if (contains) return scoped;
    }
  }

  const legacy = readKey(LEGACY_CACHE_KEY);
  if (isFresh(legacy)) {
    const contains = legacy.matches.some(
      (m) => String((m as MinimalMatch).vod_id) === String(vodId)
    );
    if (contains) return legacy;
  }

  return null;
}

/**
 * 按 vod_id + source_key 在缓存中查找条目（用于回填 vodName）
 */
export function findMatchInCaches(
  vodId: string | number,
  sourceKey: string,
  doubanId?: string | number | null
): MinimalMatch | null {
  const candidates: (CachedMatchData | null)[] = [];

  if (doubanId !== null && doubanId !== undefined && doubanId !== '') {
    candidates.push(readKey(getMatchCacheKey(doubanId)));
  }
  candidates.push(readKey(LEGACY_CACHE_KEY));

  for (const data of candidates) {
    if (!isFresh(data)) continue;
    const found = data.matches.find(
      (m) => String((m as MinimalMatch).vod_id) === String(vodId) &&
        (m as MinimalMatch).source_key === sourceKey
    );
    if (found) return found as MinimalMatch;
  }

  return null;
}

/**
 * 写入指定影片的匹配缓存
 *
 * @param doubanId 豆瓣 ID；播放页无法确定时传 null，将写入兼容用的全局 key
 */
export function writeMatchCache(
  doubanId: string | number | null,
  title: string,
  matches: unknown[]
): void {
  if (typeof window === 'undefined' || matches.length === 0) return;

  const key =
    doubanId === null || doubanId === undefined || doubanId === ''
      ? LEGACY_CACHE_KEY
      : getMatchCacheKey(doubanId);

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        title,
        // 关键：写入归属字段，详情页才能校验命中
        douban_id: doubanId === null || doubanId === undefined ? undefined : doubanId,
        matches,
        timestamp: Date.now(),
      })
    );
  } catch {
    // localStorage 写入失败不影响功能
  }
}
