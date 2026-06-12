***REMOVED*** 🎬 不看 (bukan) - 影视资源聚合与沉浸式播放平台

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**极简主义、高性能影视资源聚合平台** —— 智能分片直连、豆瓣自愈匹配、自动与手动多态主题切换、群晖 Docker 极致写盘压制优化。

🌐 **在线演示**: [https://bukan.vercel.app](https://bukan.vercel.app)

[核心设计哲学](***REMOVED***-核心设计哲学) • [功能特性](***REMOVED***-功能特性) • [快速部署](***REMOVED***-快速部署) • [环境变量](***REMOVED***-环境变量) • [本地开发](***REMOVED***-本地开发)

</div>

---

***REMOVED******REMOVED*** 🌟 核心设计哲学

本平台在追求极简精致界面呈现的同时，从底层架构与工程指标出发，专门针对低能耗服务器（如群晖/NAS 宿主机、Docker 轻量化容器）进行了极致的性能压制与优化设计：

***REMOVED******REMOVED******REMOVED*** 1. 影院级沉浸与响应式交互
* **暗室影院视觉**：以高对比度的纯黑与深灰黑为基调，最大化凸显海报色彩。在视频详情页，背景色会根据影片海报的主色调自动进行平滑的、超大半径的径向高斯模糊渐变，营造极致包裹的沉浸感。
* **丝滑微动效**：影片卡片悬停时触发 `1.05x` 等比物理放大，配合平滑的过渡动画及重度扩散性阴影（`hover:shadow-2xl`），提供极强的主视觉选中反馈。
* **多态主题水合 (FOUC-free)**：支持自动（System）、浅色（Light）、深色（Dark）三态循环切换。首创在 `<head>` 中植入立即执行（Blocking）的本地偏好检索脚本，在 React 水合渲染前完成主题绑定，**彻底杜绝页面首开白/黑屏闪烁瞬间**。

***REMOVED******REMOVED******REMOVED*** 2. 极致系统资源与网络克制 (群晖/NAS 专属)
* **近乎静默的写盘动作**：
  - **No-Journal**: 在群晖 Docker 部署配方中关闭了数据库预写日志（`--nojournal`），消除高频细微改动对磁盘的物理写盘损耗。
  - **Quieting**: 开启静默级别（`--quiet`），从源头上压制了数据库每秒数百次的网络保活心跳与连接日志。
  - **Log-Mitigation**: 清理过滤了视频代理高频 TS 视频切片拉取时的控制台 stdout 输出，阻断因 Docker 容器标准输出流重定向导致群晖系统系统日志频繁刷盘。
* **Node 服务器带宽 0 占用**：
  - 本地服务器仅用于重写和加密 M3U8 切片索引及直连鉴权校验。
  - 对于大流量的 `.ts` 视频文件切片，系统会自动判定当前协议环境：除 HTTPS-to-HTTP 的混合内容（Mixed Content）防浏览器拦截外，其余流媒体均重写为**客户端直接与源站 CDN 直连下载分片**，将服务器下行公网带宽和 CPU 负载彻底降为接近 0。
* **海报客户端 CDN 代理**：对所有外部豆瓣防盗链海报，直连官方 WebP 图片 CDN（`images.weserv.nl`）发起拉取，大幅释放本地带宽并带来客户端海报的高速缓存呈现。
* **内存硬锁与防泄漏**：
  - 强制限制 MongoDB WiredTiger 引擎的 Cache 物理内存占用为 256MB，防止其因无限膨胀撑爆群晖宿主机。
  - 在播放器等高资源组件卸载的生命周期中，主动销毁全局监听器并触发 GC 垃圾回收，保障页面长时间挂载时浏览器 0 内存堆积。

***REMOVED******REMOVED******REMOVED*** 3. 沙箱边界加固
* 安全接口对所有的图片拉取代理进行了绝对的物理沙箱白名单前缀校对，从根本上隔离了利用 `../` 越权穿越路径访问宿主机敏感文件（Directory Traversal）的漏洞风险。

---

***REMOVED******REMOVED*** ✨ 功能特性

- 🎬 **多源聚合** - 智能搜索并聚合多个视频源，支持多集连播、自动播放下一集。
- 📝 **豆瓣自愈** - 自动拉取并匹配豆瓣评分及影视数据，海报自动缓存并自愈，防范 500 裂图。
- 💬 **弹幕匹配** - 自动搜索并异步挂载匹配弹幕，支持手动弹幕拉取。
- 🎥 **高级播放器** - 基于 ArtPlayer 定制，支持 HLS 解密、倍速微调、全功能快捷键与防盗链代理。
- 📱 **多端自适应** - 移动端手势横向无阻尼轻扫、选集面板大按钮抽屉布局，完美兼容 iPhone 刘海屏安全区。
- 🔐 **轻量后台** - 支持在线视频源一键配置与可用性管理。

---

***REMOVED******REMOVED*** 🚀 快速部署

***REMOVED******REMOVED******REMOVED*** 方式一：Docker Compose 部署（推荐，完美适配群晖）

本平台已针对群晖 NAS (Synology DSM) 的运行环境及机械硬盘进行了极致优化。强烈推荐使用内置了调优参数的 `docker-compose.yml` 配置文件进行一键部署。

***REMOVED******REMOVED******REMOVED******REMOVED*** 1. 优化版生产环境 `docker-compose.yml` 配置文件

```yaml
version: '3.8'

services:
  ***REMOVED*** 🌐 App 服务：Next.js 前端与 API 聚合网关
  app:
    ***REMOVED*** 💡 提示：版本号默认为 v2.0，部署前请务必前往 GitHub 查看最新 Release 并修改为最新版本号！
    image: ghcr.io/yqxie1991/bukan:v2.0   ***REMOVED*** 👈 远程编译好的轻量化生产镜像
    container_name: bukan-app
    ports:
      - "3008:3000"              ***REMOVED*** 外部访问端口， Lucky 反代等可直接指向此 3008 端口
    environment:
      - NODE_ENV=production
      
      ***REMOVED*** ⚠️【安全警示】由于此项目已在 GitHub 公开，默认密码默认为 "bukan"！
      ***REMOVED*** 强烈建议在部署前修改为您的自定义私有强密码，以防止他人扫描并越权登录您的后台！
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-bukan}
      
      - MONGODB_URI=mongodb://mongodb:27017/bukan
      - PORT=3000
    depends_on:
      - mongodb
    volumes:
      - bukan-cache:/app/public/cache             ***REMOVED*** 缓存卷，防容器重建升级后海报裂图
    networks:
      - bukan-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"          ***REMOVED*** 限制单个日志文件最大为 10MB，防止系统盘被日志撑爆
        max-file: "3"
    restart: unless-stopped

  ***REMOVED*** 🍃 Database 服务：MongoDB 7.0 数据库
  ***REMOVED*** 🛠️ 针对群晖机械硬盘进行了极致优化：关闭 Journal、关闭诊断收集、锁定内存，防咔哒声并保护硬盘寿命
  mongodb:
    image: mongo:7
    container_name: bukan-mongodb
    ***REMOVED*** 调优参数解释：
    ***REMOVED*** --nojournal: 关闭日志持久化写入，大幅减少空闲时磁盘写入量，免去磁头咔哒噪音并保护硬盘寿命。
    ***REMOVED*** --quiet: 压制冗余日志，保持后台安静。
    ***REMOVED*** --wiredTigerCacheSizeGB 0.25: 将 WiredTiger 缓存限制在 256MB，防止其无节制吃满主机内存。
    ***REMOVED*** --setParameter diagnosticDataCollectionEnabled=false: 彻底禁用后台定期数据诊断收集，消灭后台高频微写盘。
    command: mongod --nojournal --quiet --wiredTigerCacheSizeGB 0.25 --setParameter diagnosticDataCollectionEnabled=false
    ports:
      - "27018:27017"            ***REMOVED*** 外部连接数据库端口（可选，不需要可注释掉）
    environment:
      - MONGO_INITDB_DATABASE=bukan
    volumes:
      - mongodb-data:/data/db                     ***REMOVED*** 数据库数据卷
      - mongodb-config:/data/configdb
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - bukan-network
    restart: unless-stopped

networks:
  bukan-network:
    driver: bridge

volumes:
  ***REMOVED*** 必须在底部注册这些数据卷以进行持久化，Docker 会自动打通权限，规避群晖权限拒绝报错
  mongodb-data:
    driver: local
  mongodb-config:
    driver: local
  bukan-cache:
    driver: local
```

***REMOVED******REMOVED******REMOVED******REMOVED*** 2. Linux VPS 命令行启动步骤
```bash
***REMOVED*** 克隆项目至本地 bukan 目录
git clone https://github.com/yqxie1991/bukan.git
cd bukan

***REMOVED*** 编辑 docker-compose.yml 里的 ADMIN_PASSWORD 默认密码，然后启动
docker-compose up -d
```

***REMOVED******REMOVED******REMOVED******REMOVED*** 3. 🛠️ 群晖 NAS Container Manager 图形化部署步骤（零命令避坑）

群晖系统的共享文件夹权限极其严密，直接映射本地绝对目录常因权限不匹配导致数据库容器无限闪退。采用 **Docker 命名卷 (Named Volumes)** 是群晖上最稳妥的部署实践，请遵循以下步骤：

1. **准备文件夹**：在群晖 `File Station` 中的 `docker` 文件夹下，新建一个名为 `bukan` 的子文件夹（该目录仅存放 YAML 文件，**不需要**在里面建任何其他数据子文件夹）。
2. **启动 Container Manager**：打开群晖的 **Container Manager** (原 Docker 套件)。
3. **新建项目 (Project)**：
   * 点击左侧的 **“项目”** -> 点击右侧的 **“新增”**。
   * **项目名称**：输入 `bukan`。
   * **路径**：选择刚才在第 1 步创建的 `/volume1/docker/bukan` 文件夹。
   * **来源**：选择 **“创建 docker-compose.yml”**。
4. **粘贴并修改配置**：
   * 将上方提供的 **优化版生产环境 docker-compose.yml** 里的内容全量复制粘贴到文本框中。
   * ⚠️ 强烈建议将配置文件中的 `ADMIN_PASSWORD` 从默认值 `bukan` 修改为您自定义的强密码，防止被他人扫后台越权登录。
5. **部署并运行**：点击下一步，根据向导点击“完成”。Container Manager 会自动从 GitHub 下载镜像，自动初始化完美的数据库和图片缓存持久化卷（数据卷生命周期与容器隔离，后续升级容器数据绝不丢失）。
6. **配置 Luck 反代**：部署成功后，服务运行在群晖内网的 `3008` 端口。请在您的 Lucky 反代后台新建一条 Web 服务反代规则，将您的外网 HTTPS 域名直接反代指向 `http://群晖局域网内网IP:3008` 即可安全访问。

---

***REMOVED******REMOVED******REMOVED*** 方式二：Vercel 一键云端托管
无需服务器，免费托管，配合 MongoDB Atlas 等云数据库可实现 0 开销全网流畅运行：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yqxie1991/bukan)

---

***REMOVED******REMOVED******REMOVED*** 方式三：VPS 一键 cURL 安装
适用于带有 Docker 和 cURL 环境的 Linux 宿主机：
```bash
***REMOVED*** 使用 curl 自动拉取环境并构建运行
curl -fsSL https://raw.githubusercontent.com/yqxie1991/bukan/master/scripts/install.sh | bash
```

---

***REMOVED******REMOVED*** ⚙️ 环境变量

***REMOVED******REMOVED******REMOVED*** 必需变量
| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB 数据库连接串 | `mongodb://mongodb:27017/bukan` 或 MongoDB Atlas 串 |

***REMOVED******REMOVED******REMOVED*** 可选变量
| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | 后台管理密码 (`/login`) | `bukan` (强烈建议修改) |
| `MONGODB_DB_NAME` | 数据库库名 | `bukan` |
| `NEXT_PUBLIC_DANMU_API_URL` | 弹幕接口地址 | `https://danmuapi1-eight.vercel.app` |

---

***REMOVED******REMOVED*** 💻 本地开发

***REMOVED******REMOVED******REMOVED*** 使用 Docker 开发环境
```bash
***REMOVED*** 启动热重载开发环境（含独立 MongoDB 容器）
npm run docker:dev

***REMOVED*** 停止开发环境
docker-compose -f docker-compose.dev.yml down
```

***REMOVED******REMOVED******REMOVED*** 裸机直接运行
```bash
***REMOVED*** 1. 安装项目依赖
npm install

***REMOVED*** 2. 配置环境变量
cp .env.example .env ***REMOVED*** 随后编辑配置正确的 MONGODB_URI

***REMOVED*** 3. 运行开发服务器
npm run dev
```

---

***REMOVED******REMOVED*** 📁 核心项目结构
```
bukan/
├── app/                    ***REMOVED*** Next.js App Router (含 API 路由与播放路由)
├── components/             ***REMOVED*** UI 与功能组件
│   ├── home/               ***REMOVED*** 主页卡片、轮播及导航适配
│   └── player/             ***REMOVED*** Artplayer 与弹幕加载内核
├── hooks/                  ***REMOVED*** 自定义状态管理（如滚动、历史记录等）
├── lib/                    ***REMOVED*** 数据库连接池与通用工具库
└── docker-compose.yml      ***REMOVED*** 优化级生产环境部署模板
```

---

***REMOVED******REMOVED*** 📄 License
Released under the [MIT License](LICENSE) © 2026.
