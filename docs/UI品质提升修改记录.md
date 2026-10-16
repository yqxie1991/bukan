# UI 品质提升修改记录

> 提交日期：2026-07-17
> 分支：lightweight

## 概述

本次提交对「不看影视」站点进行全面的 UI 品质提升，覆盖设计令牌体系、浅色/深色双模式适配、后台管理界面统一、移动端 UX 优化、导航栏可读性修复、Favicon 品牌化重设计共 6 个维度。所有改动以 `globals.css` 设计令牌为单一事实源，替换全站硬编码颜色，确保双模式一致渲染。

## 改动明细

### 1. 设计令牌体系优化（`app/globals.css`）

**浅色模式 — 拉开层次**
- `--background` 从 `#f5f5f7` 调深为 `#f0f2f5`，与卡片背景拉开层次
- 新增 `--surface: #fafbfc` 中间层令牌（用于 navbar/hover/子面板）
- 新增 `--card-shadow` / `--card-shadow-hover` 阴影令牌，统一全站阴影语言

**深色模式 — 降低刺眼 + 拉开层次**
- `--foreground` 从 `#ffffff` 降亮为 `#f5f5f7`，减少纯白字配纯黑背景的刺眼感
- `--card-bg` 从 `#121212` 调亮为 `#161618`，与背景 `#0a0a0c` 拉开层次
- 新增 `--surface: #1c1c20` 中间层令牌
- 深色阴影加入品牌红色微光 `rgba(229,9,20,0.12)`

**字体回退（零额外网络请求）**
- body `font-family` 补充 `PingFang SC` / `Microsoft YaHei` / `Noto Sans CJK SC` 中文系统字体回退
- 不扩展 LXGW/Smiley Sans 到全站，保持首屏字体请求最小化

**`@theme inline` 映射**
- 新增 `--color-surface`、`--shadow-card`、`--shadow-card-hover` 映射，供 Tailwind 类名使用

### 2. 浅色模式破损修复

以下组件原先硬编码深色颜色（`bg-slate-800` / `bg-gray-800/50` / `bg-gray-900` 等），在浅色模式下渲染破损，已全部替换为设计令牌：

- `components/Modal.tsx` — 弹窗容器、标题、关闭按钮、遮罩
- `app/search/page.tsx` — SearchSkeleton 骨架屏、空状态图标、返回首页按钮、Suspense fallback
- `components/home/LoadingSkeleton.tsx` — 首页骨架屏（13 处 `bg-zinc-900/50` → `bg-foreground/10`）
- `components/Toast.tsx` — Toast 通知与 ConfirmDialog
- `app/play/[id]/page.tsx` — 播放页非播放器区域（74 处，播放器容器内保留固定深色）

### 3. 后台管理界面统一（跟随主题切换）

**核心决策**：移除 `app/admin/settings/page.tsx` 与 `app/login/page.tsx` 中强制深色的 `<div className="dark">` 包裹层，后台跟随用户主题偏好切换浅色/深色。

**改造范围**：
- `app/admin/settings/page.tsx` — 移除强制 `.dark`，6 处 hex 硬编码替换为 token
- `app/login/page.tsx` — 移除强制 `.dark`，12 处 hex 硬编码替换为 token
- `components/admin/VodSourcesTab.tsx` — 93 处 slate/zinc/hex → token
- `components/admin/ShortsSourcesTab.tsx` — 75 处
- `components/admin/PlayerConfigTab.tsx` — 52 处
- `components/admin/DailymotionChannelsTab.tsx` — 49 处
- `components/admin/DatabaseSettingsTab.tsx` — 63 处

**替换规则**：
- `bg-[#141414]` / `bg-slate-800/900` → `bg-card-bg` / `bg-surface`
- `border-[#333]` / `border-slate-700` → `border-border-color`
- `text-[#808080]` / `text-slate-400/500` → `text-muted-foreground`
- `bg-[#E50914]` / `text-[#E50914]` → `bg-primary` / `text-primary`
- `text-white` 按上下文判断：彩色按钮 → `text-primary-foreground`，标题/输入框 → `text-foreground`
- 语义色（green/red/orange 删除按钮、Netflix 绿导入确认）保留不动

### 4. 前端组件 Token 统一

将双模式冗余写法（如 `text-gray-900 dark:text-white`）统一为单一 token，删除 dark 变体：

- `components/home/Navbar.tsx` — 27 处
- `components/home/HistoryPopup.tsx` — 21 处
- `app/search/page.tsx` — 22 处残留
- 其他组件（DoubanCard、CategoryRow、Footer、HeroBanner、SearchModal 等）同步 token 化

### 5. 移动端 UX 优化

- `components/DoubanCard.tsx` — 新增海报下方常驻标题区（`md:hidden`），移动端无 hover 也能看到影片标题；悬浮信息层改为 `hidden md:flex` 仅桌面端显示
- `components/home/CategoryRow.tsx` — 横向滚动添加 `snap-x snap-mandatory` + 子项 `snap-start`，滑动有吸附感；"查看全部"按钮添加 `px-3 py-2 -mr-3` 扩大触控目标至 ≥44px
- `components/home/MobileTabBar.tsx` — 底部导航添加 `active:scale-95 active:bg-foreground/5` 按压反馈
- `components/DoubanCard.tsx` — 硬编码阴影替换为 `hover:shadow-[var(--card-shadow-hover)]`

### 6. 导航栏可读性修复

**问题**：浅色模式下未滚动时，导航栏悬浮在深色 Hero 头图上，`text-foreground`（深色 #111827）与深色背景冲突看不清。

**修复**（`components/home/Navbar.tsx`，6 处）：
- 未滚动背景 `from-background/70` → `from-black/50`（深色半透明，双模式统一）
- 未滚动文字/图标 `text-foreground` → `text-white`（首页、电影、电视剧等所有导航项 + 汉堡菜单 + 搜索 + 主题切换）
- 未滚动 hover `bg-foreground/5` → `bg-white/10`
- 已滚动状态不变：主题背景 `bg-background/95` + `text-muted-foreground`/`text-foreground`

### 7. Favicon 品牌化重设计

- 删除旧 `app/favicon.ico`（非品牌化静态文件）
- 新建 `app/icon.tsx`（32×32 PNG）— 红色 #E50914 圆角方块底 + 白色 Smiley Sans 斜体「看」字
- 新建 `app/apple-icon.tsx`（180×180 PNG）— 苹果触摸图标，同设计按比例放大
- 采用 Next.js 16 `ImageResponse` + 本地 `SmileySans-Oblique.ttf` 构建时生成，跨平台中文渲染一致

### 8. SourceSelector 移动端修复（前序会话）

- `components/player/SourceSelector.tsx` — React Portal 方案修复移动端播放源列表溢出屏幕问题

## 技术要点

- **设计令牌单一事实源**：所有颜色通过 `globals.css` 的 CSS 变量管理，组件用 Tailwind token 类名引用
- **固定深色场景保留**：HeroBanner、Artplayer 播放器控件、海报评分叠层（`bg-black/80`）保持硬编码深色，不参与主题切换
- **零额外依赖**：Favicon 用 Next.js 内置 `next/og`，字体用本地已有 TTF
- **TypeScript 编译通过**：`npx tsc --noEmit` 零错误

## 验证结果

- tsc 编译通过（exit code 0）
- 浅色模式：卡片与背景有清晰层次，DoubanCard 移动端标题可见，Modal/搜索页/Admin/Login 正常渲染
- 深色模式：文字不刺眼（#f5f5f7），卡片与背景有层次（#161618 vs #0a0a0c）
- 主题切换：前台与 Admin/Login 跟随切换
- 移动端：DoubanCard 标题常驻、CategoryRow 滑动吸附、MobileTabBar 按压反馈
- 导航栏：未滚动白字 on 深色半透明背景清晰可读，已滚动跟随主题
- Favicon：`/icon` 返回 32×32 PNG，`/apple-icon` 返回 180×180 PNG，HTML 自动注入 link 标签
