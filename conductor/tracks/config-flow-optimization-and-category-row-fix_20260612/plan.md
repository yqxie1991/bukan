# Plan: config-flow-optimization-and-category-row-fix

## Phase 1: 手动配置源添加 (视频源、短剧源、频道)
- [x] 任务 1.1: 重构后台三个写操作 API，使其在接收单条数据时支持直接写入 JSON 文件 6363dc5
- [x] 任务 1.2: 前端影视源管理 Tab (VodSourcesTab) 新增“手动添加”模态框与输入表单 6363dc5
- [x] 任务 1.3: 前端短剧源管理 Tab (ShortsSourcesTab) 新增“手动添加”模态框与输入表单 6363dc5
- [x] 任务 1.4: 前端频道管理 Tab (DailymotionChannelsTab) 新增“手动添加”模态框与输入表单 6363dc5
- [ ] Task: Conductor - User Manual Verification 'Phase 1: 手动配置源添加' (Protocol in workflow.md)

## Phase 2: 订阅链接维护与 JSON 存储 API 开发
- [ ] 任务 2.1: 设计 `data/subscription-urls.json` 数据结构（订阅链接数组：名称、URL、格式、启用态、最后同步时间），并基于 `lib/json-store.ts` 的 `readStore`/`writeStore` 实现本地持久化与进程内存缓存，无需外部数据库
- [ ] 任务 2.2: 开发 `/api/subscription-urls` 管理 API（支持 GET/POST/PUT/DELETE 及管理员 validateSession 校验；数据读写经由 `json-store.ts` 落盘 `data/subscription-urls.json`）
- [ ] 任务 2.3: 开发 `/api/subscription-urls/sync` 订阅同步 API（用于免跨域服务端 fetch 拉取、兼容多格式合并写入 `data/subscription-urls.json`）
- [ ] Task: Conductor - User Manual Verification 'Phase 2: 订阅链接维护与 JSON 存储 API 开发' (Protocol in workflow.md)

## Phase 3: 订阅自动后台同步与前端链接管理面板
- [ ] 任务 3.1: 在服务端（同步 home-cache 定时器）部署每 24 小时对 `data/subscription-urls.json` 中订阅源（经 `json-store.ts` 读取与回写）的自动轮询检查与静默拉取合并机制
- [ ] 任务 3.2: 后台管理页面新增“订阅链接管理 Tab”，显示列表、增加链接、编辑、删除并支持点击“立即手动同步”
- [ ] Task: Conductor - User Manual Verification 'Phase 3: 订阅自动后台同步与前端链接管理面板' (Protocol in workflow.md)

## Phase 4: 分类行样式与 Hover 透传修复
- [x] 任务 4.1: 修正 `CategoryRow.tsx` (或其他非首页分类列表卡片) 外层误用的 `group` 属性，解决 Hover 状态失效问题 753672d
- [x] 任务 4.2: 统一检查并修复各页面 Hover 缩放/渐变阴影的不协调问题，符合 Netflix 视觉规范 753672d
- [x] 任务 4.3: 为 saveImageToLocal 的 fetch 添加超时机制，防止拉取挂起导致 Vercel 504 超时 753672d
- [x] 任务 4.4: 在 image-proxy 接口中增加针对 /cache/images/ 失效缓存路径的正则自愈获取机制 753672d
- [x] 任务 4.5: 移除 `getHomeCache` 中本地物理图片文件的检测，消除 Vercel 无状态 Serverless 下反复触发阻塞同步导致的首页卡顿 ca1f2aa & 260eb0b
- [x] 任务 4.6: 重构所有子页面的最外层容器与主元素样式，将硬编码暗黑样式替换为主题自适应 CSS 变量，确保 Light 模式全局生效 ca1f2aa & a6570f8 & 260eb0b
- [ ] Task: Conductor - User Manual Verification 'Phase 4: 分类行样式与 Hover 透传修复' (Protocol in workflow.md)
