# Specification: 优化配置流程与分类行样式修正

## 1. 业务需求 (Requirements)
为进一步优化不看 (bukan) 影视配置和展示体验，本项目需要完成以下三个方向的升级与修复：
- **手动添加源功能**：目前导入只支持加密包或订阅链接拉取。为了方便只配置单个源，需要在管理后台增加手动填写单个源的表单（视频源、短剧源、Dailymotion 频道），直接保存至本地数据库。
- **订阅链接管理与定时同步**：在管理后台提供“配置订阅链接列表”的维护界面。系统自动将这些订阅源持久化，并在服务端配置定时器，每天（或间隔 24 小时）在后台静默自动拉取同步更新，同时也支持管理员在后台点击“立即同步”。
- **分类行样式规范修正**：修复分类行 `CategoryRow.tsx` （或其他分类渲染页）中 `group` 属性的误用，确保所有子卡片（`DoubanCard` 等）在 Hover 悬浮时，能与首页一样正确实现微缩放、外层渐变遮罩和深度阴影效果，展现 Netflix 黑红设计风格。

## 2. 技术设计方案 (Technical Design)

### 2.1 增加手动填写源功能
- **前端交互**：在“视频源管理”、“短剧源管理”和“Dailymotion 频道管理”三个后台管理页面中，增加“手动新增”表单按钮。
  - **视频源字段**：名称 (name)、键名 (key, 自动生成随机字符可自填)、接口类型 (type, 如 json)、API 地址 (api)、播放解析规则 (playUrl)、是否启用播放解析 (usePlayUrl)。
  - **短剧源字段**：名称 (name)、键名 (key)、接口类型 (type)、API 地址 (api)。
  - **频道字段**：频道名称 (name)、用户名/频道ID (username)、Dailymotion 域名 (dailymotion)、是否激活 (isActive)。
- **后端 API**：复用并确认敏感 API 写操作端点（已受登录态保护），支持单条文档的插入：
  - `/api/vod-sources`
  - `/api/shorts-sources`
  - `/api/dailymotion-config`

### 2.2 订阅链接管理与定时刷新
- **数据结构设计**：
  - 基于 `lib/json-store.ts` 在 `data/subscription-urls.json` 中持久化订阅链接数组（无外部数据库）。
  - 字段：`id` (主键), `name` (订阅名称), `url` (订阅地址), `type` ('vod' | 'shorts' | 'dailymotion'), `last_synced_at` (上次同步时间), `status` ('success' | 'failed'), `error_message` (错误说明)。
- **API 端点**：
  - `/api/subscription-urls` (GET, POST, PUT, DELETE)：支持管理员增删改查订阅源（受管理员会话验证保护）。
  - `/api/subscription-urls/sync` (POST)：接收特定订阅 ID，由服务端代理下载并解析该链接，智能合并（Upsert）对应类型的影视/短剧源数据，保存进数据库，并更新其 `last_synced_at` 和同步状态。
- **定时同步机制**：
  - 在 `lib/home-cache-db.ts`（或者单独引入的定时线程）中配置每天定时循环（或 `setInterval` 隔一段时间轮询检查），拉取已保存的订阅链接，自动后台同步更新，实现配置不落后。

### 2.3 `CategoryRow.tsx` 样式与 Hover 修正
- **问题分析**：由于 `CategoryRow.tsx` 或者某些子页面中的外部父容器缺少或错置了 CSS `group` 属性，导致 `DoubanCard` 内部的 `group-hover:opacity-100` 或其他 Hover CSS 变量在悬浮卡片时无法被触发，或者悬浮时因父级容器 `overflow-hidden` 遮挡了缩放效果。
- **修复方案**：
  - 检查 `components/CategoryRow.tsx` 及其卡片封装容器。
  - 移除非预期的 `group`，确保在渲染卡片的地方结构上提供正确的 `group` 样式透传。
  - 保证其在 Hover 时与 `DoubanCard` 的默认缩放（`hover:scale-105`）和悬浮遮罩渐变一致。
