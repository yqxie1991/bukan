import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// 进程级内存缓存，避免高频读磁盘
const memoryCache = new Map<string, { data: unknown; mtime: number }>();

// 确保 data 目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 从 JSON 文件中读取数据，如果文件不存在或读取解析失败则返回默认值
 * 包含进程级缓存及文件修改时间校验
 */
export function readStore<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);

  // 检查进程内存缓存
  const cached = memoryCache.get(filename);
  if (cached) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs === cached.mtime) {
        return cached.data as T;
      }
    } catch {
      // 文件可能被删除，清空缓存并走默认逻辑
    }
  }

  // 从磁盘读取
  try {
    if (!fs.existsSync(filePath)) {
      // 文件不存在，写入默认值并返回
      writeStore(filename, defaultValue);
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as T;
    const stat = fs.statSync(filePath);
    memoryCache.set(filename, { data, mtime: stat.mtimeMs });
    return data;
  } catch (error) {
    console.warn(`[json-store] 读取文件 ${filename} 失败，使用默认值:`, error);
    return defaultValue;
  }
}

/**
 * 安全地写入 JSON 数据（采用原子级写入：先写临时文件再进行重命名替换，防止损坏）
 */
export function writeStore<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = filePath + '.tmp';

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);

    // 更新进程级内存缓存
    const stat = fs.statSync(filePath);
    memoryCache.set(filename, { data, mtime: stat.mtimeMs });
  } catch (error) {
    console.error(`[json-store] 写入文件 ${filename} 失败:`, error);
    // 清理临时文件
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    }
    throw error;
  }
}
