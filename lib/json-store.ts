import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
 *
 * 健壮性措施：
 * 1. 临时文件名带进程与随机后缀，避免多进程/多实例互相覆盖同一 .tmp 文件
 * 2. rename 在 Windows 上可能因目标文件被短暂占用（编辑器/杀毒扫描）抛 EPERM，
 *    故做有限次退避重试；仅在最终失败时清理临时文件并抛出
 */
export function writeStore<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');

    // rename 重试：EPERM/EBUSY 通常是瞬时的（目标文件被短暂占用）
    const maxAttempts = 3;
    let renamed = false;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        fs.renameSync(tmpPath, filePath);
        renamed = true;
        break;
      } catch (error) {
        lastError = error;
        const code = (error as NodeJS.ErrnoException)?.code;
        // 仅对文件占用类错误重试，其他错误立即失败
        if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') {
          break;
        }
        // 同步退避等待 50ms（本模块为同步 API，不能用 await setTimeout）
        if (attempt < maxAttempts - 1) {
          sleepSync(50);
        }
      }
    }

    if (!renamed) {
      throw lastError ?? new Error('rename 失败');
    }

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

/**
 * 同步阻塞指定的毫秒数
 * 用于同步文件操作之间的退避等待（Atomics.wait 不占用事件循环之外的任何资源）
 */
function sleepSync(ms: number): void {
  const sharedArrayBuffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sharedArrayBuffer), 0, 0, ms);
}
