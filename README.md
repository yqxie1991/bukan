***REMOVED*** 🎬 不看 (bukan) - 影视资源聚合平台

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**现代化影视资源聚合平台** - 支持 Dailymotion 视频源、豆瓣信息匹配、多种部署方式

🌐 **在线演示**: [https://bukan.vercel.app](https://kerkerker.vercel.app)

[功能特性](***REMOVED***-功能特性) • [部署方式](***REMOVED***-部署方式) • [环境变量](***REMOVED***-环境变量) • [本地开发](***REMOVED***-本地开发)

</div>

---

***REMOVED******REMOVED*** ✨ 功能特性

- 🎬 **视频聚合** - 聚合 Dailymotion 等多个视频源
- 📝 **豆瓣匹配** - 自动匹配豆瓣电影信息和评分
- 💬 **弹幕功能** - 自动匹配加载弹幕，支持手动搜索
- 🎥 **高级播放器** - ArtPlayer 播放器，支持 HLS、倍速、快捷键
- 📱 **响应式设计** - 完美支持移动端和桌面端
- 🌓 **多态主题切换** - 支持自动 (System)、浅色 (Light)、深色 (Dark) 三挡循环手动切换，内置 localStorage 持久化且防闪烁
- 🎨 **现代化 UI** - Netflix 风格界面设计，Hover 等比放大伴随扩散性阴影与遮罩
- 🔐 **后台管理** - 视频源配置、频道管理 (`/login`)
- 🔋 **极致资源优化** - 针对本地群晖等服务器压制写盘频次，通过分片直连零中转大幅节省带宽/CPU开销
- 🚀 **多种部署** - 支持 Vercel、Docker、VPS 一键部署

***REMOVED******REMOVED*** 📸 界面预览

<details>
<summary>点击展开预览图</summary>

***REMOVED******REMOVED******REMOVED*** 首页

![首页](screenshot/home.png)

***REMOVED******REMOVED******REMOVED*** 搜索页

![搜索](screenshot/movie-search.png)

***REMOVED******REMOVED******REMOVED*** 详情页

![详情页](screenshot/movie-detail.png)

***REMOVED******REMOVED******REMOVED*** 播放页

![播放页](screenshot/movie-playing.png)

</details>

---

***REMOVED******REMOVED*** 🚀 部署方式

***REMOVED******REMOVED******REMOVED*** 方式一：Vercel 部署（推荐）

> 无需服务器，免费托管，自动 HTTPS

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yqxie1991/bukan)

**步骤：**

1. 点击上方按钮，Fork 项目到 Vercel
2. 在 Vercel 控制台设置环境变量：
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/kerkerker
   ADMIN_PASSWORD=your_password
   ```
3. 部署完成！

> 💡 **提示**：Vercel 部署需要使用云端 MongoDB（如 [MongoDB Atlas](https://www.mongodb.com/atlas) 免费版）

---

***REMOVED******REMOVED******REMOVED*** 方式二：Docker Compose 部署

***REMOVED******REMOVED******REMOVED******REMOVED*** 快速启动

```bash
***REMOVED*** 1. 克隆项目
git clone https://github.com/yqxie1991/bukan.git
cd bukan

***REMOVED*** 2. 创建配置文件
cp .env.example .env

***REMOVED*** 3. 编辑配置（可选）
nano .env

***REMOVED*** 4. 启动服务
docker-compose up -d

***REMOVED*** 5. 查看日志
docker-compose logs -f app
```

***REMOVED******REMOVED******REMOVED******REMOVED*** docker-compose.yml 说明

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000" ***REMOVED*** 修改左侧端口号自定义访问端口
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - MONGODB_URI=mongodb://mongodb:27017/kerkerker
    depends_on:
      mongodb:
        condition: service_healthy
    volumes:
      - kerkerker-cache:/app/public/cache ***REMOVED*** 图片持久化卷，防止容器重建/更新导致海报丢失

  mongodb:
    image: mongo:7
    volumes:
      - mongodb-data:/data/db ***REMOVED*** 数据持久化

volumes:
  mongodb-data:
    driver: local
  kerkerker-cache:
    driver: local  ***REMOVED*** 使用 Docker 命名卷可自动对齐容器权限，完美规避群晖等系统的 Permission Denied 挂载问题
```

> 💡 **针对群晖 (Synology) / 反向代理 (Lucky 等) 部署的优化说明**：
> * **极致空闲写盘压制**：修改了 MongoDB 启动策略，在群晖 Docker 运行时自动禁用预写 Journal (`--nojournal`) 并启用静默模式 (`--quiet`) 压制无意义的网络连接心跳日志；同时，清理合并了本地 Node.js 代理服务的高频 TS 切片控制台标准输出（防止 Docker stdout 持续重定向产生大量系统日志写入），使空闲状态下的硬盘写盘动作趋于静默，极大地保护硬盘寿命并有利于群晖休眠。
> * **本地 CPU 负载与公网带宽释放**：实现了 **视频切片智能分片直连机制**。对于 TS 等大流量视频切片，系统在重写 M3U8 文件时动态将地址解析为直接面向 CDN 源地址的跳转，从而使用户直接跟源站连接。群晖本地服务器的 CPU 负载和公网下行带宽占用几乎降为 0，不再经历 Node.js 代理中转。
> * **容器物理内存硬限制**：强制限制 MongoDB wiredTiger 引擎的最大 Cache 内存为 256MB，防止其因无限膨胀导致群晖宿主机内存耗尽。同时修复了播放器组件销毁后的全局监听器残留，保障长时间页面挂载不发生浏览器内存泄漏。
> * **安全与沙箱边界加固**：全面修复了 `image-proxy` 对外代理服务等接口可能遭遇的路径穿越（Directory Traversal）任意敏感文件泄露隐患，保障宿主机的数据资产安全。
> * **持久化命名卷**：生产部署必须挂载 `/app/public/cache` 卷。使用 Docker 命名卷（Named Volume）可以免去在群晖宿主机上手动赋予非 root 运行容器（UID 1001）写权限的繁琐步骤，完全防范权限拒绝错误。
> * **缓存自愈能力**：系统内置了图片缓存存在性抽查，即使您手动删除了卷，第一次访问页面时，服务端也会自动触发数据重同步并重新在后台下载海报图片进行自愈，防范 500 裂图。
> * **混合协议与回环网络兼容**：
>   * **混合内容拦截 (Mixed Content)**：当使用外网 HTTPS（如 Lucky 端口映射）访问时，播放器对所有的 HTTP 视频源会自动采用本地域名 HTTPS 代理中转，并基于 `Referer` 头自适应解析外网域名（无需在 Lucky 反代中配置复杂的 `X-Forwarded-*` 头），彻底防止浏览器拦截播放。
>   * **容器内回环 (Loopback) 检索**：流式匹配视频源在生产环境会强制通过 `127.0.0.1:3000` 本地地址请求自身接口，避免容器因局域网限制或反代策略导致请求自身域名超时失败，确保 22 个源流畅检索。

***REMOVED******REMOVED******REMOVED******REMOVED*** 常用命令

```bash
docker-compose up -d       ***REMOVED*** 后台启动
docker-compose down        ***REMOVED*** 停止服务
docker-compose logs -f     ***REMOVED*** 查看日志
docker-compose restart     ***REMOVED*** 重启服务
docker-compose pull        ***REMOVED*** 更新镜像
```

---

***REMOVED******REMOVED******REMOVED*** 方式三：VPS 一键部署

在任何装有 Docker 的服务器上执行：

```bash
***REMOVED*** 使用 curl
curl -fsSL https://raw.githubusercontent.com/yqxie1991/bukan/master/scripts/install.sh | bash

***REMOVED*** 使用 wget
wget -qO- https://raw.githubusercontent.com/yqxie1991/bukan/master/scripts/install.sh | bash
```

**部署后管理：**

```bash
cd ~/kerkerker
./kerkerker.sh start     ***REMOVED*** 启动
./kerkerker.sh stop      ***REMOVED*** 停止
./kerkerker.sh restart   ***REMOVED*** 重启
./kerkerker.sh logs      ***REMOVED*** 日志
./kerkerker.sh update    ***REMOVED*** 更新
./kerkerker.sh backup    ***REMOVED*** 备份
```

---

***REMOVED******REMOVED*** ⚙️ 环境变量

***REMOVED******REMOVED******REMOVED*** 必需变量

| 变量名        | 说明               | 示例                                             |
| ------------- | ------------------ | ------------------------------------------------ |
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb+srv://user:pass@cluster.mongodb.net/db` |

***REMOVED******REMOVED******REMOVED*** 可选变量

| 变量名                        | 说明           | 默认值                               |
| ----------------------------- | -------------- | ------------------------------------ |
| `ADMIN_PASSWORD`              | 后台管理密码   | `bukan`                           |
| `MONGODB_DB_NAME`             | 数据库名称     | `kerkerker`                          |
| `NEXT_PUBLIC_DANMU_API_URL`   | 弹幕 API 地址  | `https://danmuapi1-eight.vercel.app` |
| `NEXT_PUBLIC_DANMU_API_TOKEN` | 弹幕 API Token | -                                    |

***REMOVED******REMOVED******REMOVED*** MongoDB URI 示例

```bash
***REMOVED*** Docker 内部（docker-compose 自动配置）
MONGODB_URI=mongodb://mongodb:27017/kerkerker

***REMOVED*** 本地 MongoDB
MONGODB_URI=mongodb://localhost:27017/kerkerker

***REMOVED*** MongoDB Atlas（云端）
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kerkerker
```

---

***REMOVED******REMOVED*** 💻 本地开发

***REMOVED******REMOVED******REMOVED*** 使用 Docker（推荐）

```bash
***REMOVED*** 启动开发环境（包含 MongoDB）
npm run docker:dev

***REMOVED*** 停止服务
docker-compose -f docker-compose.dev.yml down
```

***REMOVED******REMOVED******REMOVED*** 不使用 Docker

```bash
***REMOVED*** 1. 安装依赖
npm install

***REMOVED*** 2. 配置环境变量
cp .env.example .env
***REMOVED*** 编辑 .env，设置 MONGODB_URI

***REMOVED*** 3. 启动开发服务器
npm run dev

***REMOVED*** 4. 访问
open http://localhost:3000
```

***REMOVED******REMOVED******REMOVED*** 脚本说明

| 命令                  | 说明                      |
| --------------------- | ------------------------- |
| `npm run dev`         | 启动开发服务器            |
| `npm run build`       | 构建生产版本              |
| `npm run docker:dev`  | Docker 开发环境（热重载） |
| `npm run docker:prod` | 构建并推送 Docker 镜像    |

---

***REMOVED******REMOVED*** 📁 项目结构

```
bukan/                      ***REMOVED*** 本地项目目录
├── app/                    ***REMOVED*** Next.js App Router
├── components/             ***REMOVED*** React 组件
│   └── player/             ***REMOVED*** 播放器组件
│       ├── LocalHlsPlayer.tsx  ***REMOVED*** 本地 HLS 播放器
│       └── DanmakuPanel.tsx    ***REMOVED*** 弹幕搜索面板
├── lib/                    ***REMOVED*** 工具库
│   ├── cache.ts            ***REMOVED*** 内存缓存
│   ├── db.ts               ***REMOVED*** MongoDB 连接
│   └── player/             ***REMOVED*** 播放器工具
│       └── danmaku-service.ts  ***REMOVED*** 弹幕服务
├── scripts/                ***REMOVED*** 部署脚本
│   └── install.sh          ***REMOVED*** 一键部署脚本
├── docker-compose.yml      ***REMOVED*** 生产环境
├── docker-compose.dev.yml  ***REMOVED*** 开发环境
└── docker-compose.server.yml
```

***REMOVED******REMOVED*** 📄 License

MIT License © 2026
