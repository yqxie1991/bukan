***REMOVED*** 🎬 Kerkerker - 影视资源聚合平台

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**现代化影视资源聚合平台** - 支持 Dailymotion 视频源、豆瓣信息匹配、多种部署方式

🌐 **在线演示**: [https://kerkerker.vercel.app](https://kerkerker.vercel.app)

[功能特性](***REMOVED***-功能特性) • [部署方式](***REMOVED***-部署方式) • [环境变量](***REMOVED***-环境变量) • [本地开发](***REMOVED***-本地开发)

</div>

---

***REMOVED******REMOVED*** ✨ 功能特性

- 🎬 **视频聚合** - 聚合 Dailymotion 等多个视频源
- 📝 **豆瓣匹配** - 自动匹配豆瓣电影信息和评分
- 📱 **响应式设计** - 完美支持移动端和桌面端
- 🎨 **现代化 UI** - 美观的界面设计
- 🔐 **后台管理** - 视频源配置、频道管理 (`/login`)
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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unilei/kerkerker)

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
git clone https://github.com/unilei/kerkerker.git
cd kerkerker

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

  mongodb:
    image: mongo:7
    volumes:
      - mongodb-data:/data/db ***REMOVED*** 数据持久化
```

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
curl -fsSL https://raw.githubusercontent.com/unilei/kerkerker/master/scripts/install.sh | bash

***REMOVED*** 使用 wget
wget -qO- https://raw.githubusercontent.com/unilei/kerkerker/master/scripts/install.sh | bash
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

| 变量名            | 说明         | 默认值      |
| ----------------- | ------------ | ----------- |
| `ADMIN_PASSWORD`  | 后台管理密码 | `bukan`  |
| `MONGODB_DB_NAME` | 数据库名称   | `kerkerker` |

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
kerkerker/
├── app/                    ***REMOVED*** Next.js App Router
├── components/             ***REMOVED*** React 组件
├── lib/                    ***REMOVED*** 工具库
│   ├── cache.ts            ***REMOVED*** 内存缓存
│   ├── db.ts               ***REMOVED*** MongoDB 连接
│   └── ...
├── scripts/                ***REMOVED*** 部署脚本
│   └── install.sh          ***REMOVED*** 一键部署脚本
├── docker-compose.yml      ***REMOVED*** 生产环境
├── docker-compose.dev.yml  ***REMOVED*** 开发环境
└── docker-compose.server.yml
```

***REMOVED******REMOVED*** 📄 License

MIT License © 2026
