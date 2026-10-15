import crypto from 'crypto';

/**
 * 内部服务间调用凭证
 *
 * 背景：`/api/douban/match-vod*` 会通过 `${INTERNAL_ORIGIN}/api/drama/list`
 * 自调用本服务以完成多源匹配（match-vod 的 source 来自数据库而非请求体，
 * 故不应加会话鉴权）。但在为 drama 端点补上 SSRF 防护后，
 * 需要一个「仅服务端可持有」的凭证来区分内部自调用与外部请求。
 *
 * 机制：首次调用时生成随机 token 并缓存于进程内；
 * 若配置了 INTERNAL_TOKEN 环境变量则以其为准（便于多实例共享）。
 */

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

let cachedToken: string | null = null;

/**
 * 获取当前实例的内部调用 token
 */
function getInternalToken(): string {
  // 显式配置优先，支持多实例/容器间共享同一凭证
  if (process.env.INTERNAL_TOKEN) {
    return process.env.INTERNAL_TOKEN;
  }
  if (!cachedToken) {
    cachedToken = crypto.randomBytes(24).toString('hex');
  }
  return cachedToken;
}

/**
 * 判断请求是否来自服务内部自调用
 *
 * 使用恒定时间比较，避免通过响应时间差异逐字节猜测 token。
 */
export function isInternalRequest(request: Request): boolean {
  const provided = request.headers.get(INTERNAL_TOKEN_HEADER);
  if (!provided) {
    return false;
  }
  const expected = getInternalToken();
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // 长度不同时也执行一次比较，保持恒定时间
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * 为服务端自调用请求附加内部凭证头
 *
 * @param init 原有 fetch 选项
 * @returns 附加了内部 token 的新选项
 */
export function withInternalToken(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      [INTERNAL_TOKEN_HEADER]: getInternalToken(),
    },
  };
}