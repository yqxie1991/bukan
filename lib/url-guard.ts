import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * 外部 URL 安全校验（SSRF 防护）
 *
 * 所有可由客户端传入目标地址的代理端点（video-proxy / image-proxy、drama 系列）
 * 必须先经由此模块校验，避免被用作内网探测与数据外带通道。
 *
 * 防护策略（按判定顺序）：
 *   1. 协议白名单：仅 http / https
 *   2. 主机名黑名单：localhost、云元数据服务专有域名
 *   3. IP 值判定：把 host 解析为 IP 后按「IP 值」判定，而非字符串前缀。
 *      这一步是关键 —— `new URL()` 会把 0x7f.1/ 2130706433 / 127.1 等非标准写法
 *      归一化为 127.0.0.1，但**不会**处理 IPv4-mapped IPv6（`[::ffff:127.0.0.1]`），
 *      字符串前缀匹配会漏掉 `::ffff:` 整个族。
 *   4. DNS 解析后校验：域名解析到内网 IP 时同样拒绝，阻断 localtest.me、
 *      *.nip.io 这类公开 DNS 递归服务绕过。
 *
 * 已知局限：DNS 校验与实际连接之间存在 TOCTOU 窗口（DNS 重绑定）。
 * 如需彻底消除，应使用自定义 dispatcher 将「已校验的 IP + 原 Host 头」直连。
 */

// 阻止的主机名（防止 SSRF 攻击）
export const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS 元数据服务
  'metadata.google.internal', // GCP 元数据服务
  'metadata.goog',
  '100.100.100.200', // 阿里云元数据服务
]);

/**
 * 判断一个 IP 字符串是否属于「不可对外抓取」的地址
 *
 * 覆盖：回环、私网、链路本地、ULA、CGNAT/Tailscale、协议保留段、
 * IPv4-mapped IPv6（递归剥到 IPv4 后按 IPv4 规则判定）
 */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;

    if (a === 0) return true;                // 0.0.0.0/8「本网络」
    if (a === 10) return true;               // 10/8 私网
    if (a === 127) return true;              // 127/8 回环
    if (a === 169 && b === 254) return true; // 169.254/16 链路本地（含云元数据）
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16/12 私网
    if (a === 192 && b === 168) return true; // 192.168/16 私网
    if (a === 192 && b === 0) return true;   // 192.0.0/24 协议保留（含 192.0.2.0/24 TEST-NET）
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT / Tailscale
    if (a >= 224) return true;               // 224/4 组播 + 240/4 保留
    return false;
  }

  if (version === 6) {
    const v = ip.toLowerCase().split('%')[0]; // 去掉 zone index

    if (v === '::' || v === '::1') return true;

    // IPv4-mapped（::ffff:a.b.c.d）—— 上一版的主要缺口。
    // 注意两个坑：
    //   1. new URL() 会把 IPv4-mapped 压缩为十六进制（::ffff:127.0.0.1 → ::ffff:7f00:1）
    //   2. `::` 压缩记法使 split(':') 的下标不可靠（"::ffff:7f00:1" 只有 5 段）
    // 因此统一从字符串尾部匹配，并把后两组十六进制还原为 32 位 IPv4。
    const tailMatch = v.match(/:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    const isMapped = v.includes('::ffff:') || v.startsWith('ffff:');
    const isCompat = /^::[0-9.]+$/.test(v);

    if ((isMapped || isCompat) && tailMatch) {
      const hiNum = parseInt(tailMatch[1], 16);
      const loNum = parseInt(tailMatch[2], 16);
      if (!Number.isNaN(hiNum) && !Number.isNaN(loNum)) {
        const ipv4 = [
          (hiNum >> 8) & 0xff,
          hiNum & 0xff,
          (loNum >> 8) & 0xff,
          loNum & 0xff,
        ].join('.');
        // ::ffff:127.0.0.1 / ::ffff:169.254.169.254 均映射到内网，必须判为私网；
        // ::ffff:8.8.8.8 映射到公网，须放行，故统一交回 IPv4 规则判定。
        return isPrivateIp(ipv4);
      }
    }

    // IPv4-compatible 的点分写法：::127.0.0.1（遗留但仍可解析）
    const compatDotted = v.match(/^::(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (compatDotted) {
      return isPrivateIp(compatDotted[1]);
    }

    // IPv4-compatible 的十六进制写法。
    // new URL() 会把 ::127.0.0.1 归一化为 ::7f00:1（丢掉 ::ffff 标记），
    // 故凡是 `::` 开头、且尾部两组构成 32 位地址的，一律按 IPv4 还原判定。
    if (v.startsWith('::') && !v.startsWith('::ffff:')) {
      const compactTail = v.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (compactTail) {
        const hiNum = parseInt(compactTail[1], 16);
        const loNum = parseInt(compactTail[2], 16);
        if (!Number.isNaN(hiNum) && !Number.isNaN(loNum)) {
          return isPrivateIp(
            [
              (hiNum >> 8) & 0xff,
              hiNum & 0xff,
              (loNum >> 8) & 0xff,
              loNum & 0xff,
            ].join('.')
          );
        }
      }
    }

    // ULA 唯一本地地址 fc00::/7 —— 覆盖 fc00 至 fdff 整个区间
    // （旧实现只列 'fc00:' 与 'fd00:' 两个字面前缀，fd12: 等可绕过）
    const firstGroup = parseInt(v.split(':')[0] || '0', 16);
    if ((firstGroup & 0xfe00) === 0xfc00) return true;

    if (v.startsWith('fe80')) return true;                    // 链路本地 fe80::/10
    if (v.startsWith('2001:db8')) return true;                // 文档保留段
    if (v.startsWith('ff')) return true;                      // 组播 ff00::/8
    if (/^f[cd]/.test(v)) return true;                        // 双保险：ULA
    return false;
  }

  // 不是合法 IP（应当是域名，走 DNS 校验分支）
  return false;
}

/**
 * 同步校验 URL：仅做协议 + 主机名 + 「字面量 IP」判定，不做 DNS 解析。
 * 适用于高频调用路径（如每个 m3u8 分片重写）。
 */
export function isValidExternalUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  // 只允许 HTTP 和 HTTPS 协议（阻断 file:、gopher:、data: 等）
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  // 提取 hostname 并归一化（去掉 IPv6 字面量的方括号）
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTS.has(hostname)) {
    return false;
  }

  // 字面量 IP：按 IP 值判定（覆盖 IPv4-mapped IPv6 与完整 ULA 区间）
  if (net.isIP(hostname)) {
    return !isPrivateIp(hostname);
  }

  // 域名形态：交由异步版本做 DNS 解析后校验
  return true;
}

/**
 * 异步校验 URL：在同步校验基础上追加 DNS 解析，
 * 阻断「域名解析到内网 IP」的绕过（localtest.me、*.nip.io 等）。
 *
 * @param urlString 待校验的 URL
 * @param resolveDns 是否执行 DNS 解析校验。高频路径可传 false 以跳过。
 * @returns 允许抓取返回 true
 */
export async function isValidExternalUrlAsync(
  urlString: string,
  resolveDns = true
): Promise<boolean> {
  if (!isValidExternalUrl(urlString)) {
    return false;
  }

  if (!resolveDns) {
    return true;
  }

  let hostname: string;
  try {
    hostname = new URL(urlString).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return false;
  }

  // 字面量 IP 已在同步校验中处理
  if (net.isIP(hostname)) {
    return true;
  }

  // DNS 解析：任一条记录落在内网即拒绝
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) return false;
    return records.every((record) => !isPrivateIp(record.address));
  } catch {
    // 解析失败（域名不存在 / DNS 故障）：不放行
    return false;
  }
}

/**
 * 安全的 fetch 包装：校验通过才发起请求，且**每一跳重定向都重新校验**
 *
 * 使用 redirect: 'manual' 手动跟随，避免上游 302 指向内网时被自动跟随。
 *
 * @param urlString 目标地址
 * @param init fetch 选项
 * @param maxRedirects 最大重定向跳数
 * @returns Response；校验失败返回 null
 */
export async function safeFetch(
  urlString: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response | null> {
  if (!(await isValidExternalUrlAsync(urlString))) {
    return null;
  }

  let currentUrl = urlString;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual',
    });

    // 非重定向，直接返回
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      return response;
    }

    let nextUrl: string;
    try {
      nextUrl = new URL(location, currentUrl).href;
    } catch {
      return null;
    }

    // 每一跳都重新做完整校验（含 DNS），阻断重定向链 SSRF
    if (!(await isValidExternalUrlAsync(nextUrl))) {
      console.warn(`[url-guard] 已阻断指向非法地址的重定向: ${location}`);
      return null;
    }

    currentUrl = nextUrl;
  }

  // 重定向跳数超限
  console.warn(`[url-guard] 重定向跳数超过上限 (${maxRedirects})`);
  return null;
}