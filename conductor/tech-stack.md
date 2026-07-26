# 🎬 不看 (bukan) - 技术栈定义

## 1. 核心技术栈 (Core Tech Stack)

| 维度 | 选用技术 | 说明 |
| :--- | :--- | :--- |
| **编程语言** | TypeScript 5.x | 全局强类型支持，增强代码健壮性 |
| **前端/后端框架** | Next.js 16.x & React 19.x | App Router 架构，支持 Server Components 提升渲染性能 |
| **样式解决方案** | TailwindCSS 4.x | 现代实用类优先 CSS 框架，支持极简配置与快速开发 |
| **数据存储** | 本地 JSON 文件 + 进程内存缓存（`lib/json-store.ts`） | 基于 `data/*.json` 原子写入与 mtime 缓存校验，无外部数据库，持久化存储影视元数据与频道配置 |
| **影视播放器** | Artplayer 5.x & hls.js 1.x | 支持 HLS H.264 画质在线播放，配置快捷键与防盗链代理 |
| **状态同步** | SWR 2.x | 客户端懒加载与缓存机制，优化接口请求频次 |

## 2. 工程部署 (Deployment)
* **容器化支持**：Docker (Docker Compose V2)，支持生产多环境部署。
* **无服务器部署**：适配 Vercel（需配合可持久化卷或外部 KV，默认 JSON 存储适用于单实例部署）。
