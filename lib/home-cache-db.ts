import { getDatabase } from "./db";
import { getHeroMovies, getNewContent } from "./douban-service";
import { COLLECTIONS } from "./constants/db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const IMAGE_CACHE_DIR = path.join(process.cwd(), "public", "cache", "images");
let isCronStarted = false;

/**
 * 确保本地图片缓存文件夹存在
 */
async function ensureImageDir() {
  try {
    await fs.mkdir(IMAGE_CACHE_DIR, { recursive: true });
  } catch (err) {
    // 目录已存在
  }
}

/**
 * 下载豆瓣原始图片并保存至本地静态目录
 * @param imageUrl 豆瓣 CDN 图片地址
 * @param prefix 图片命名的文件前缀 (比如 影片ID_类型)
 * @returns 返回本地访问 of 的相对 URL，如 '/cache/images/1292052_cover_f90b.jpg'
 */
async function saveImageToLocal(imageUrl: string, prefix: string): Promise<string> {
  if (!imageUrl) return "";
  await ensureImageDir();

  try {
    const urlObj = new URL(imageUrl);
    let ext = path.extname(urlObj.pathname) || ".jpg";
    // 规范化文件后缀
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) {
      ext = ".jpg";
    }

    // 利用图片 URL 的 MD5 校验和确保文件名唯一性且避免重复下载
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex").substring(0, 8);
    const fileName = `${prefix}_${hash}${ext}`;
    const filePath = path.join(IMAGE_CACHE_DIR, fileName);
    const localUrl = `/cache/images/${fileName}`;

    // 1. 如果图片已存在，则直接返回本地 URL
    try {
      await fs.access(filePath);
      return localUrl;
    } catch {
      // 本地不存在，继续下载
    }

    // 2. 发起下载（需注入 Referer 绕过豆瓣防盗链）
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://movie.douban.com/",
      },
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
    // 智能降级：失败则返回原图链接，利用系统原图代理中转，不让界面裂图
    return imageUrl;
  }
}

/**
 * 从本地数据库读取缓存数据
 * @param key 'hero' | 'categories'
 */
export async function getHomeCache(key: "hero" | "categories") {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.HOME_CACHE);

    const cache = await collection.findOne({ key });
    if (!cache) return null;

    // 校验是否已经跨天（判定是否跨过 0 点）
    const updatedAtDate = new Date(cache.updated_at);
    const nowDate = new Date();
    
    const isExpired =
      updatedAtDate.getFullYear() !== nowDate.getFullYear() ||
      updatedAtDate.getMonth() !== nowDate.getMonth() ||
      updatedAtDate.getDate() !== nowDate.getDate();

    if (isExpired) {
      console.log(`⏰ [Home Cache] 检测到本地缓存 [${key}] 已过0点，判定为失效`);
      return null;
    }

    return cache.data;
  } catch (error) {
    console.error(`读取缓存失败 [key: ${key}]:`, error);
    return null;
  }
}

/**
 * 启动 0 点自动更新定时任务
 * 每分钟检测一次时间，到 00:00 准时自动在服务端完成元数据与图片的同步
 */
export function startCronJob() {
  if (isCronStarted) return;
  isCronStarted = true;

  console.log("⏰ [Home Cache] 首页 0 点自动更新定时任务已启动。");

  setInterval(async () => {
    const now = new Date();
    // 当本地时间的 时 和 分 均为 00:00 时触发更新
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      console.log("⏰ [Home Cache] 检测到当前时间为 00:00，开始自动同步首屏数据并缓存本地图片...");
      try {
        await syncHomeData("hero");
        await syncHomeData("categories");
        console.log("⏰ [Home Cache] 0 点自动更新首页缓存成功。");
      } catch (err) {
        console.error("⏰ [Home Cache] 0 点自动更新缓存失败:", err);
      }
    }
  }, 60000); // 1 分钟检测一次
}

/**
 * 递归深度搜索数据库缓存数据中所有被激活的本地缓存图片相对路径
 */
async function getAllActiveImagePaths(): Promise<Set<string>> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTIONS.HOME_CACHE);
  
  const allCaches = await collection.find({}).toArray();
  const activePaths = new Set<string>();

  const extractPaths = (obj: any) => {
    if (!obj) return;
    if (typeof obj === "string" && obj.startsWith("/cache/images/")) {
      activePaths.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(extractPaths);
    } else if (typeof obj === "object") {
      Object.values(obj).forEach(extractPaths);
    }
  };

  allCaches.forEach((cache) => {
    extractPaths(cache.data);
  });

  return activePaths;
}

/**
 * 异步扫描并清理不再在最新缓存中的孤立历史海报图片，避免占用磁盘空间
 */
async function cleanOrphanImages() {
  try {
    const activePaths = await getAllActiveImagePaths();
    
    try {
      await fs.access(IMAGE_CACHE_DIR);
    } catch {
      return; // 目录不存在无需清理
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
 * 强制同步微服务最新数据，下载海报并更新本地 MongoDB
 * @param key 'hero' | 'categories'
 */
export async function syncHomeData(key: "hero" | "categories") {
  const db = await getDatabase();
  const collection = db.collection(COLLECTIONS.HOME_CACHE);
  const now = new Date().toISOString();

  let freshData: any;

  if (key === "hero") {
    const rawHero = await getHeroMovies();
    // 本地化 Banner 横竖版海报及封面
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
    // 本地化各分类行前 20 条数据的封面图片
    freshData = await Promise.all(
      rawCategories.map(async (cat) => {
        const slicedData = cat.data.slice(0, 20); // 截取前20条
        const localizedData = await Promise.all(
          slicedData.map(async (item) => {
            const localCover = await saveImageToLocal(
              item.cover,
              `${item.id}_cover`
            );
            return {
              ...item,
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

  // 1. 存入 MongoDB 集合
  await collection.updateOne(
    { key },
    {
      $set: {
        key,
        data: freshData,
        updated_at: now,
      },
    },
    { upsert: true }
  );

  // 2. 异步触发孤立海报清理（在后台静默执行，不阻碍 API 的响应响应）
  cleanOrphanImages().catch(console.error);

  return freshData;
}
