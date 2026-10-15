/**
 * url-guard 单元验证脚本
 * 运行：npx tsx scripts/verify-url-guard.ts
 */
import { isValidExternalUrl, isPrivateIp } from "@/lib/url-guard";

const urlCases: [string, "BLOCK" | "ALLOW", string][] = [
  // —— IPv4-mapped IPv6：上一版的主要缺口（实测可读内网 /api/health）——
  ["http://[::ffff:127.0.0.1]:3112/api/health", "BLOCK", "IPv4-mapped 回环"],
  ["http://[::ffff:169.254.169.254]/latest/", "BLOCK", "IPv4-mapped 云元数据"],
  ["http://[::ffff:a9fe:a9fe]/", "BLOCK", "IPv4-mapped 十六进制压缩形式"],
  ["http://[::ffff:7f00:1]/", "BLOCK", "IPv4-mapped 显式十六进制"],
  ["http://[::127.0.0.1]/", "BLOCK", "IPv4-compatible 回环"],
  // —— ULA fc00::/7 完整区间：旧版只列 fc00:/fd00: 两前缀，fd12: 可绕过 ——
  ["http://[fc00::1]/x", "BLOCK", "ULA fc00"],
  ["http://[fd12:3456::1]/x", "BLOCK", "ULA fd12（旧版漏过）"],
  ["http://[fdaa::1]/x", "BLOCK", "ULA fdaa"],
  ["http://[fdff::1]/x", "BLOCK", "ULA fdff 上界"],
  // —— 非标准 IP 表示（依赖 new URL 归一化）——
  ["http://0x7f.1/", "BLOCK", "十六进制 IP"],
  ["http://2130706433/", "BLOCK", "十进制 IP"],
  ["http://127.1/", "BLOCK", "短格式 IP"],
  ["http://evil.com@127.0.0.1/", "BLOCK", "userinfo 混淆"],
  // —— 常规内网段 ——
  ["http://127.0.0.1/", "BLOCK", "回环"],
  ["http://10.0.0.1/", "BLOCK", "私网 10 段"],
  ["http://172.20.0.1/", "BLOCK", "私网 172.20"],
  ["http://192.168.1.1/", "BLOCK", "私网 192.168"],
  ["http://169.254.169.254/", "BLOCK", "云元数据"],
  ["http://100.100.100.200/", "BLOCK", "阿里云元数据"],
  ["http://192.0.2.1/", "BLOCK", "协议保留段"],
  ["http://100.64.1.1/", "BLOCK", "CGNAT / Tailscale"],
  ["http://[::1]/", "BLOCK", "IPv6 回环"],
  ["http://[fe80::1]/", "BLOCK", "IPv6 链路本地"],
  // —— 协议白名单 ——
  ["file:///etc/passwd", "BLOCK", "file 协议"],
  ["gopher://x/", "BLOCK", "gopher 协议"],
  ["data:text/plain,x", "BLOCK", "data 协议"],
  // —— 正常外部地址（不得误伤）——
  ["https://cdn.example.com/a.ts", "ALLOW", "公网 https"],
  ["http://cdn.example.com/a.ts", "ALLOW", "公网 http"],
  ["https://example.com:8443/p?a=1", "ALLOW", "带端口与查询串"],
  ["https://sub.domain.example.co.uk/x.m3u8", "ALLOW", "多级域名"],
  ["https://iamyourfather.link0.me/api/v1/movies", "ALLOW", "项目实际使用的豆瓣代理"],
];

let failed = 0;

console.log("=== URL 校验 ===");
for (const [url, expected, desc] of urlCases) {
  const actual = isValidExternalUrl(url) ? "ALLOW" : "BLOCK";
  if (actual !== expected) {
    failed++;
    console.log(`  FAIL  期望 ${expected} 实得 ${actual}  ${desc}  (${url})`);
  }
}

console.log("=== IP 值判定 ===");
const ipCases: [string, boolean, string][] = [
  ["127.0.0.1", true, "回环"],
  ["::ffff:7f00:1", true, "IPv4-mapped 回环"],
  ["::ffff:a9fe:a9fe", true, "IPv4-mapped 云元数据"],
  ["::127.0.0.1", true, "IPv4-compatible"],
  ["fd12:3456::1", true, "ULA fd12"],
  ["fdff::1", true, "ULA 上界"],
  ["8.8.8.8", false, "公网 IPv4"],
  ["1.1.1.1", false, "公网 IPv4"],
  ["2606:4700::1111", false, "公网 IPv6"],
  ["::ffff:8.8.8.8", false, "IPv4-mapped 公网（不得误伤）"],
];
for (const [ip, expected, desc] of ipCases) {
  const actual = isPrivateIp(ip);
  if (actual !== expected) {
    failed++;
    console.log(`  FAIL  期望 private=${expected} 实得 ${actual}  ${desc}  (${ip})`);
  }
}

const total = urlCases.length + ipCases.length;
if (failed === 0) {
  console.log(`\n全部通过：${total}/${total}`);
} else {
  console.log(`\n失败 ${failed}/${total}`);
  process.exit(1);
}