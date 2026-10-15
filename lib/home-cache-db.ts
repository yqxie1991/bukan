import { readStore, writeStore } from "./json-store";
import { getHeroMovies, getNewContent } from "./douban-service";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const IMAGE_CACHE_DIR = path.join(process.cwd(), "public", "cache", "images");
const CACHE_FILE = 'home-cache.json';

// 首页二级内存缓存防线，防止频繁穿透慢速豆瓣微服务
export const MEMORY_CACHE: Record<string, { data: unknown; updatedAt: number }> = {};
export const MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30分钟内存有效缓存

/**
 * 确保本地图片缓存文件夹存在
 */
async function ensureImageDir() {
  try {
    await fs.mkdir(IMAGE_CACHE_DIR, { recursive: true });
  } catch {
    // 目录已存在
  }
}

/**
 * 下载豆瓣原始图片并保存至本地静态目录
 */
async function saveImageToLocal(imageUrl: string, prefix: string): Promise<string> {
  if (!imageUrl) return "";
  await ensureImageDir();

  try {
    const urlObj = new URL(imageUrl);
    let ext = path.extname(urlObj.pathname) || ".jpg";
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) {
      ext = ".jpg";
    }

    const hash = crypto.createHash("md5").update(imageUrl).digest("hex").substring(0, 8);
    const fileName = `${prefix}_${hash}${ext}`;
    const filePath = path.join(IMAGE_CACHE_DIR, fileName);
    const localUrl = `/cache/images/${fileName}`;

    try {
      await fs.access(filePath);
      return localUrl;
    } catch {
      // 本地不存在，继续下载
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://movie.douban.com/",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    console.log(`✓ 本地化图片成功: ${localUrl}`);
    return localUrl;
  } catch (error) {
    console.error(`✗ 下载图片失败 [${imageUrl}]:`, error);
    return imageUrl;
  }
}

/**
 * 底层通用获取原生缓存文档接口（供内部及影片详情API使用）
 */
export async function getHomeCacheRaw(key: string): Promise<{ key: string; data: unknown; updated_at: string } | null> {
  const cache = readStore<Record<string, { data: unknown; updated_at: string }>>(CACHE_FILE, {});
  const item = cache[key];
  if (!item) return null;
  return {
    key,
    data: item.data,
    updated_at: item.updated_at,
  };
}

/**
 * 底层通用写入原生缓存文档接口
 */
export async function saveHomeCacheRaw(key: string, data: unknown): Promise<void> {
  const cache = readStore<Record<string, { data: unknown; updated_at: string }>>(CACHE_FILE, {});
  cache[key] = {
    data,
    updated_at: new Date().toISOString(),
  };
  writeStore(CACHE_FILE, cache);
}

/**
 * 获取首页缓存
 */
export async function getHomeCache(key: "hero" | "categories") {
  const now = Date.now();
  const memCached = MEMORY_CACHE[key];
  if (memCached && (now - memCached.updatedAt) < MEMORY_CACHE_TTL) {
    console.log(`⚡ [Home Cache] 内存缓存秒开命中 [key: ${key}]`);
    return memCached.data;
  }

  try {
    const cache = await getHomeCacheRaw(key);
    
    if (cache && cache.data) {
      MEMORY_CACHE[key] = { data: cache.data, updatedAt: now };

      // 跨天判定统一走显式时区（默认 Asia/Shanghai），避免容器 UTC 时区导致过期判定推迟 8 小时
      const updatedDay = getDayStringInTz(new Date(cache.updated_at));
      const todayDay = getDayStringInTz(new Date(now));

      if (updatedDay !== todayDay) {
        console.log(`⏰ [Home Cache] 检测到数据库缓存 [${key}] 已过0点，将在后台异步刷新同步，不阻塞当前返回`);
        syncHomeData(key).catch((err) => {
          console.error(`后台异步刷新首屏缓存失败 [key: ${key}]:`, err);
        });
      }

      return cache.data;
    }

    return null;
  } catch (error) {
    console.error(`读取数据库缓存失败，尝试使用陈旧的内存缓存进行容灾 [key: ${key}]:`, error);
    if (memCached) {
      console.log(`🛡️ [Home Cache] 内存缓存容灾兜底成功 [key: ${key}]`);
      return memCached.data;
    }
    return null;
  }
}

/**
 * 获取指定时区下的日期字符串（YYYY-MM-DD）
 *
 * Docker 容器若未设置 TZ，默认 UTC，会导致「0 点自动更新」实际发生在北京时间早上 8 点。
 * 故统一以显式目标时区（默认 Asia/Shanghai）计算日期边界，与服务器本地时区解耦。
 */
function getDayStringInTz(date: Date = new Date()): string {
  const timeZone = process.env.HOME_CACHE_TIMEZONE || 'Asia/Shanghai';
  try {
    // en-CA locale 输出即为 YYYY-MM-DD 格式
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    // 运行环境缺少时区数据时回退到本地时区
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * 启动 0 点自动更新定时任务
 *
 * 防重入标记挂在 globalThis 上：home/hero 与 home/categories 两个路由在 dev 模式或
 * 独立打包时各自持有一份模块实例，模块级变量会各自启动一个 setInterval 导致重复同步。
 *
 * 触发条件改为「今日尚未同步」而非「恰好处于 00:00 那一分钟」：
 * setInterval 在负载下会漂移，一旦错过该分钟窗口会导致整天不更新。
 */
export function startCronJob() {
  const globalRef = globalThis as unknown as {
    __homeCacheCronStarted?: boolean;
    __homeCacheLastSyncDay?: string;
  };

  if (globalRef.__homeCacheCronStarted) return;
  globalRef.__homeCacheCronStarted = true;

  console.log("⏰ [Home Cache] 首页 0 点自动更新定时任务已启动。");

  // 启动时若今日尚未同步（例如容器在 0 点后重启），补一次检查
  globalRef.__homeCacheLastSyncDay = undefined;

  setInterval(async () => {
    const today = getDayStringInTz();

    // 今日已同步，等待下一个自然日
    if (globalRef.__homeCacheLastSyncDay === today) return;

    // 尚未到换日时刻：不执行（跨天前的轮询）
    const nowInTz = new Date(
      new Date().toLocaleString('en-US', { timeZone: process.env.HOME_CACHE_TIMEZONE || 'Asia/Shanghai' })
    );
    if (nowInTz.getHours() !== 0) return;

    // 先占位再执行，避免长任务期间被后续 tick 重复触发
    globalRef.__homeCacheLastSyncDay = today;

    console.log("⏰ [Home Cache] 检测到已进入新的自然日，开始自动同步首屏数据并缓存本地图片...");
    try {
      await syncHomeData("hero");
      await syncHomeData("categories");
      console.log("⏰ [Home Cache] 0 点自动更新首页缓存成功。");
    } catch (err) {
      console.error("⏰ [Home Cache] 0 点自动更新缓存失败:", err);
      // 失败时回滚标记，留待下一个 tick 重试
      globalRef.__homeCacheLastSyncDay = undefined;
    }
  }, 60000);
}

/**
 * 扫描全部激活的本地缓存图片相对路径
 */
async function getAllActiveImagePaths(): Promise<Set<string>> {
  const cache = readStore<Record<string, { data: unknown; updated_at: string }>>(CACHE_FILE, {});
  const activePaths = new Set<string>();

  const extractPaths = (obj: unknown) => {
    if (!obj) return;
    if (typeof obj === "string" && obj.startsWith("/cache/images/")) {
      activePaths.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(extractPaths);
    } else if (typeof obj === "object") {
      Object.values(obj).forEach(extractPaths);
    }
  };

  Object.values(cache).forEach((item) => {
    extractPaths(item.data);
  });

  return activePaths;
}

/**
 * 异步扫描并清理不再在最新缓存中的孤立历史海报图片
 */
async function cleanOrphanImages() {
  try {
    const activePaths = await getAllActiveImagePaths();
    
    try {
      await fs.access(IMAGE_CACHE_DIR);
    } catch {
      return;
    }

    const files = await fs.readdir(IMAGE_CACHE_DIR);
    let deletedCount = 0;
    
    for (const file of files) {
      const relativePath = `/cache/images/${file}`;
      if (!activePaths.has(relativePath)) {
        await fs.unlink(path.join(IMAGE_CACHE_DIR, file));
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 磁盘回收：成功清理了 ${deletedCount} 张无用历史海报图片`);
    }
  } catch (error) {
    console.error("异步清理历史海报图片时出错:", error);
  }
}

/**
 * 强制同步微服务最新数据，下载海报并更新本地存储
 */
export async function syncHomeData(key: "hero" | "categories") {
  let freshData: unknown;
  const doubanIdsToSync: string[] = [];

  if (key === "hero") {
    const rawHero = await getHeroMovies();
    rawHero.forEach((h) => {
      if (h.id) doubanIdsToSync.push(String(h.id));
    });
    freshData = await Promise.all(
      rawHero.map(async (hero) => {
        const localHorizontal = await saveImageToLocal(
          hero.poster_horizontal,
          `${hero.id}_horizontal`
        );
        const localVertical = await saveImageToLocal(
          hero.poster_vertical,
          `${hero.id}_vertical`
        );
        const localCover = await saveImageToLocal(
          hero.cover,
          `${hero.id}_cover`
        );

        return {
          ...hero,
          poster_horizontal: localHorizontal,
          poster_vertical: localVertical,
          cover: localCover,
        };
      })
    );
  } else {
    const rawCategories = await getNewContent();
    freshData = await Promise.all(
      rawCategories.map(async (cat) => {
        const slicedData = cat.data.slice(0, 20);
        slicedData.forEach((item) => {
          const typedItem = item as unknown as Record<string, unknown>;
          if (typedItem.id && !doubanIdsToSync.includes(String(typedItem.id))) {
            doubanIdsToSync.push(String(typedItem.id));
          }
        });
        const localizedData = await Promise.all(
          slicedData.map(async (item) => {
            const typedItem = item as unknown as Record<string, unknown>;
            const localCover = await saveImageToLocal(
              String(typedItem.cover || ""),
              `${typedItem.id}_cover`
            );
            return {
              ...typedItem,
              cover: localCover,
            };
          })
        );
        return {
          name: cat.name,
          data: localizedData,
        };
      })
    );
  }

  // 1. 存入本地 JSON 缓存
  await saveHomeCacheRaw(key, freshData);

  // 1.5 同步更新内存缓存
  MEMORY_CACHE[key] = { data: freshData, updatedAt: Date.now() };

  // 2. 异步触发孤立海报清理
  cleanOrphanImages().catch(console.error);

  // 3. 异步触发前 20 部影片的完整详情本地刮削缓存
  if (doubanIdsToSync.length > 0) {
    syncAllDetailsAsync(doubanIdsToSync).catch(console.error);
  }

  return freshData;
}

/**
 * 异步批量同步影片的详情数据到本地缓存，限流并发
 */
async function syncAllDetailsAsync(doubanIds: string[]) {
  try {
    const { getSubjectDetail } = await import("./douban-service");
    
    console.log(`⏰ [Home Cache] 开始在后台异步刮削并缓存 ${doubanIds.length} 部影片的详情元数据...`);

    const batchSize = 5;
    for (let i = 0; i < doubanIds.length; i += batchSize) {
      const batch = doubanIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (id) => {
          try {
            const detail = await getSubjectDetail(id);
            if (detail) {
              await saveHomeCacheRaw(`detail_${id}`, detail);
            }
          } catch (err) {
            console.error(`✗ 后台同步影片详情失败 [id: ${id}]:`, err);
          }
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    console.log(`✓ [Home Cache] 前台首屏 ${doubanIds.length} 部影片的完整详情数据均已在本地缓存成功。`);
  } catch (error) {
    console.error("后台同步批量影片详情整体出错:", error);
  }
}
