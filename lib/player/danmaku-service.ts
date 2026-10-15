"use client";

// 弹幕开关：暂时关闭，后续找到合适接口后只需将其设为 true
const DANMU_ENABLED = false;

// 弹幕 API 配置
const DANMU_API_URL =
  process.env.NEXT_PUBLIC_DANMU_API_URL || "https://danmuapi1-eight.vercel.app";
const DANMU_API_TOKEN = process.env.NEXT_PUBLIC_DANMU_API_TOKEN || "woshinidie";

// 类型定义
export interface Anime {
  animeId: number;
  bangumiId: string;
  animeTitle: string;
  type: string;
  typeDescription: string;
  imageUrl: string;
  startDate: string;
  episodeCount: number;
  rating: number;
  source: string;
}

export interface SearchAnimeResponse {
  errorCode: number;
  success: boolean;
  errorMessage: string;
  animes: Anime[];
}

export interface Episode {
  seasonId: string;
  episodeId: number;
  episodeTitle: string;
  episodeNumber: string;
  airDate: string;
}

export interface Season {
  id: string;
  airDate: string;
  name: string;
  episodeCount: number;
}

export interface Bangumi {
  animeId: number;
  bangumiId: string;
  animeTitle: string;
  imageUrl: string;
  isOnAir: boolean;
  airDay: number;
  type: string;
  typeDescription: string;
  seasons: Season[];
  episodes: Episode[];
}

export interface BangumiResponse {
  errorCode: number;
  success: boolean;
  errorMessage: string;
  bangumi: Bangumi;
}

export interface RawComment {
  cid: number;
  p: string; // "time,mode,color,source"
  m: string; // message
  t: number; // time in seconds
}

export interface CommentResponse {
  count: number;
  comments: RawComment[];
}

// ArtPlayer 弹幕格式
export interface DanmakuItem {
  text: string;
  time: number;
  color: string;
  mode: 0 | 1 | 2; // 0: 滚动, 1: 顶部, 2: 底部
  border?: boolean;
}

// 匹配请求
export interface MatchRequest {
  fileName: string;
  fileHash?: string;
  fileSize?: number;
  videoDuration?: number;
  matchMode?: string;
}

export interface MatchResponse {
  errorCode: number;
  success: boolean;
  errorMessage: string;
  isMatched: boolean;
  animeId?: number;
  episodeId?: number;
  animeTitle?: string;
  episodeTitle?: string;
}

// 获取 API 基础 URL
function getApiBaseUrl(): string {
  return `${DANMU_API_URL}/${DANMU_API_TOKEN}`;
}

/**
 * 搜索动漫
 */
export async function searchAnime(keyword: string): Promise<Anime[]> {
  if (!DANMU_ENABLED) return [];
  if (!keyword || keyword.trim() === "") {
    return [];
  }

  try {
    const url = `${getApiBaseUrl()}/api/v2/search/anime?keyword=${encodeURIComponent(
      keyword
    )}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`搜索动漫失败: HTTP ${response.status}`);
      return [];
    }

    const data: SearchAnimeResponse = await response.json();

    if (data.success && data.animes) {
      return data.animes;
    }

    return [];
  } catch (error) {
    console.warn("搜索动漫出错 (可能网络连接失败或接口失效):", error);
    return [];
  }
}

/**
 * 获取动漫详情（包含剧集列表）
 */
export async function getBangumi(animeId: number): Promise<Bangumi | null> {
  if (!DANMU_ENABLED) return null;
  try {
    const url = `${getApiBaseUrl()}/api/v2/bangumi/${animeId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`获取动漫详情失败: HTTP ${response.status}`);
      return null;
    }

    const data: BangumiResponse = await response.json();

    if (data.success && data.bangumi) {
      return data.bangumi;
    }

    return null;
  } catch (error) {
    console.warn("获取动漫详情出错 (可能网络连接失败或接口失效):", error);
    return null;
  }
}

/**
 * 获取弹幕数据
 */
export async function getComments(episodeId: number): Promise<DanmakuItem[]> {
  if (!DANMU_ENABLED) return [];
  try {
    const url = `${getApiBaseUrl()}/api/v2/comment/${episodeId}?format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`获取弹幕失败: HTTP ${response.status}`);
      return [];
    }

    const data: CommentResponse = await response.json();

    if (data.comments && data.comments.length > 0) {
      return data.comments.map(convertToDanmakuItem);
    }

    return [];
  } catch (error) {
    console.warn("获取弹幕出错 (可能网络连接失败或接口失效):", error);
    return [];
  }
}

/**
 * 自动匹配动漫
 */
export async function matchAnime(
  fileName: string
): Promise<MatchResponse | null> {
  if (!DANMU_ENABLED) return null;
  try {
    const url = `${getApiBaseUrl()}/api/v2/match`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        matchMode: "hashAndFileName",
      } as MatchRequest),
    });

    if (!response.ok) {
      console.error(`自动匹配失败: HTTP ${response.status}`);
      return null;
    }

    const data: MatchResponse = await response.json();
    return data;
  } catch (error) {
    console.warn("自动匹配出错 (可能网络连接失败或接口失效):", error);
    return null;
  }
}

/**
 * 将 API 弹幕格式转换为 ArtPlayer 格式
 * API 格式: p = "224.00,1,16777215,[renren]"
 * 顺序: time, mode, color, source
 * Mode: 1=滚动, 4=底部, 5=顶部
 */
function convertToDanmakuItem(comment: RawComment): DanmakuItem {
  const parts = comment.p.split(",");
  const timeFromP = parseFloat(parts[0]) || comment.t;
  const modeFromP = parseInt(parts[1]) || 1;
  const colorFromP = parseInt(parts[2]) || 16777215;

  // 转换 mode: API的1=滚动, 4=底部, 5=顶部 -> ArtPlayer的0=滚动, 1=顶部, 2=底部
  let artMode: 0 | 1 | 2 = 0;
  if (modeFromP === 5) {
    artMode = 1; // 顶部
  } else if (modeFromP === 4) {
    artMode = 2; // 底部
  }

  // 转换颜色：数字转十六进制
  const colorHex = "#" + colorFromP.toString(16).padStart(6, "0").toUpperCase();

  return {
    text: comment.m,
    time: timeFromP,
    color: colorHex,
    mode: artMode,
  };
}

/**
 * 从视频标题中提取搜索关键词
 * 例如: "进击的巨人 S01E05" -> "进击的巨人"
 */
export function extractSearchKeyword(title: string): string {
  if (!title) return "";

  // 移除常见的文件扩展名
  let keyword = title.replace(/\.(mp4|mkv|avi|wmv|flv|m3u8|ts)$/i, "");

  // 移除季集信息
  keyword = keyword.replace(
    /[.\s_-]*(S\d+E\d+|第\d+[季集话]|EP?\d+|\d+集)/gi,
    ""
  );

  // 移除分辨率信息
  keyword = keyword.replace(/[.\s_-]*(1080p|720p|4K|2160p|HDR)/gi, "");

  // 移除编码和音频信息
  keyword = keyword.replace(
    /[.\s_-]*(HEVC|H\.?265|H\.?264|AAC|DDP|DD5\.1|WEB-DL)/gi,
    ""
  );

  // 移除年份括号
  keyword = keyword.replace(/[\[(（]?\d{4}[\])）]?/g, "");

  // 清理特殊字符
  keyword = keyword.replace(/[._\[\]【】()（）]/g, " ");

  // 移除多余空格
  keyword = keyword.replace(/\s+/g, " ").trim();

  return keyword;
}

/**
 * 自动加载弹幕结果
 */
export interface AutoLoadResult {
  success: boolean;
  danmaku: DanmakuItem[];
  matchedTitle?: string;
  episodeTitle?: string;
  message: string;
}

/**
 * 自动匹配并加载弹幕
 * 根据视频标题自动匹配动漫和剧集，然后加载弹幕
 */
export async function autoLoadDanmaku(videoTitle: string): Promise<AutoLoadResult> {
  if (!DANMU_ENABLED) {
    return {
      success: false,
      danmaku: [],
      message: "弹幕功能已暂时屏蔽",
    };
  }
  if (!videoTitle || videoTitle.trim() === "") {
    return {
      success: false,
      danmaku: [],
      message: "视频标题为空",
    };
  }

  console.log(`🔍 自动匹配弹幕: ${videoTitle}`);

  try {
    // 尝试自动匹配
    const matchResult = await matchAnime(videoTitle);

    if (matchResult && matchResult.success && matchResult.isMatched && matchResult.episodeId) {
      console.log(`✅ 匹配成功: ${matchResult.animeTitle} - ${matchResult.episodeTitle}`);

      // 获取弹幕
      const danmaku = await getComments(matchResult.episodeId);

      if (danmaku.length > 0) {
        return {
          success: true,
          danmaku,
          matchedTitle: matchResult.animeTitle,
          episodeTitle: matchResult.episodeTitle,
          message: `已加载 ${danmaku.length} 条弹幕`,
        };
      } else {
        return {
          success: false,
          danmaku: [],
          matchedTitle: matchResult.animeTitle,
          episodeTitle: matchResult.episodeTitle,
          message: "匹配成功但该剧集暂无弹幕",
        };
      }
    }

    // 匹配失败，尝试通过搜索找到第一个结果
    const keyword = extractSearchKeyword(videoTitle);
    if (keyword) {
      const animes = await searchAnime(keyword);
      if (animes.length > 0) {
        // 获取第一个匹配的动漫的剧集
        const bangumi = await getBangumi(animes[0].animeId);
        if (bangumi && bangumi.episodes.length > 0) {
          // 尝试从视频标题提取集数
          const episodeMatch = videoTitle.match(/(?:E|EP|第)(\d+)(?:集|话)?/i) ||
            videoTitle.match(/S\d+E(\d+)/i);
          let targetEpisode = bangumi.episodes[0];

          if (episodeMatch) {
            const episodeNum = parseInt(episodeMatch[1]);
            const found = bangumi.episodes.find(
              (ep) => parseInt(ep.episodeNumber) === episodeNum
            );
            if (found) {
              targetEpisode = found;
            }
          }

          const danmaku = await getComments(targetEpisode.episodeId);
          if (danmaku.length > 0) {
            return {
              success: true,
              danmaku,
              matchedTitle: animes[0].animeTitle,
              episodeTitle: targetEpisode.episodeTitle,
              message: `已加载 ${danmaku.length} 条弹幕 (搜索匹配)`,
            };
          }
        }
      }
    }

    return {
      success: false,
      danmaku: [],
      message: "未找到匹配的弹幕，请手动搜索",
    };
  } catch (error) {
    console.error("自动加载弹幕出错:", error);
    return {
      success: false,
      danmaku: [],
      message: "自动加载失败，请手动搜索",
    };
  }
}

