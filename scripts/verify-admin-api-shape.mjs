#!/usr/bin/env node
/**
 * 后台列表接口的响应形状守卫（回归检查）
 *
 * 背景：`/api/vod-sources?all=true` 与 `/api/shorts-sources?all=true` 曾返回
 * 「裸数组」，而后台的两个消费方都按 `data.sources` / `data.selected` 取值：
 *   - app/admin/settings/page.tsx
 *   - components/admin/VodSourcesTab.tsx（统一导入的合并逻辑）
 * 结果是接口明明返回了全部源、后台列表却渲染为空——「数据已保存但显示为空」
 * 的 bug。接口形状与消费方约定因此必须被锁住。
 *
 * 本脚本断言两个鉴权分支都返回 `{ sources: T[], selected: T | null }`，
 * 并且 `sources.length` 与磁盘 JSON 的条目数一致（防「拿到数组但被过滤空」）。
 *
 * 用法：
 *   1) 另开一个终端启动应用：  npm run dev        (或 npm start)
 *   2) 运行：                  node scripts/verify-admin-api-shape.mjs
 *
 * 可用环境变量覆盖：
 *   BASE_URL        默认 http://127.0.0.1:3000
 *   ADMIN_PASSWORD  默认 bukan
 *
 * 退出码：0 = 通过；1 = 契约不符；2 = 环境问题（服务未就绪/登录失败）
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const PASSWORD = process.env.ADMIN_PASSWORD || 'bukan';
const ROOT = path.resolve(import.meta.dirname, '..');

/** 读磁盘上的真实条目数，作为 `sources.length` 的期望值 */
function diskCount(file) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'data', file), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function waitReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      /* 服务还没起来 */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  if (!(await waitReady())) {
    console.error(`[FAIL] 服务未就绪：${BASE}（请先 npm run dev / npm start）`);
    process.exit(2);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookie) {
    console.error(`[FAIL] 登录失败（HTTP ${login.status}），请检查 ADMIN_PASSWORD`);
    process.exit(2);
  }

  const cases = [
    { label: '/api/vod-sources?all=true',    url: '/api/vod-sources?all=true',    file: 'vod-sources.json' },
    { label: '/api/shorts-sources?all=true', url: '/api/shorts-sources?all=true', file: 'shorts-sources.json' },
  ];

  let failures = 0;
  for (const c of cases) {
    const res = await fetch(BASE + c.url, { headers: { cookie } });
    const json = await res.json();
    const data = json?.data;
    const expected = diskCount(c.file);

    const problems = [];
    if (res.status !== 200) problems.push(`HTTP ${res.status}`);
    if (json?.code !== 200) problems.push(`code=${json?.code}`);
    if (Array.isArray(data)) {
      problems.push('data 是裸数组（应为 { sources, selected }）');
    } else {
      if (!Array.isArray(data?.sources)) problems.push('data.sources 不是数组');
      if (!('selected' in (data ?? {}))) problems.push('data 缺少 selected 字段');
      if (Array.isArray(data?.sources) && data.sources.length !== expected) {
        problems.push(`data.sources 有 ${data.sources.length} 条，磁盘应有 ${expected} 条`);
      }
    }

    if (problems.length === 0) {
      console.log(`[PASS] ${c.label.padEnd(32)} sources=${data.sources.length} selected=${data.selected ? 'yes' : 'null'}`);
    } else {
      failures += 1;
      console.error(`[FAIL] ${c.label.padEnd(32)} ${problems.join('；')}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} 项不符合契约：后台列表会渲染为空而数据实际已保存。`);
    process.exit(1);
  }
  console.log('\n全部通过：两个鉴权列表接口的形状与磁盘数据一致。');
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(2);
});
