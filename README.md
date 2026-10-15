# 🎬 不看 (bukan) - 影视资源聚合与沉浸式播放平台 (去数据库极致精简版)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)
![Store](https://img.shields.io/badge/Store-JSON_File-orange?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**零外部数据库依赖、极简主义、高性能影视资源聚合平台** —— 智能分片直连、豆瓣自愈匹配、自动与手动多态主题切换、极致轻量化单容器部署。

🌐 **在线演示**: [https://bukan8.vercel.app/](https://bukan8.vercel.app/)

[核心设计哲学](#-核心设计哲学) • [功能特性](#-功能特性) • [快速部署](#-快速部署) • [环境变量](#-环境变量) • [本地开发](#-本地开发)

</div>

---

## 🌟 核心设计哲学

本平台（`lightweight` 极致精简版）在追求极简精致界面呈现的同时，从底层架构与工程指标出发，专门针对低能耗服务器（如群晖/NAS 宿主机、轻量级 VPS 容器）进行了极致的性能压制与优化设计：

### 1. 零数据库依赖与完全静默磁盘
* **免除外置数据库**：本版本已彻底移除 MongoDB 等重度依赖，采用进程内存级 Map 缓存防线 + 原子性本地安全 JSON 文件读写（`data/*.json`）作为核心数据存储引擎。
* **磁盘完全静默 (NAS 守护神)**：由于没有任何外部数据库进程（如 MongoDB WiredTiger 引擎），消除了每秒数百次的心跳探针与日志刷盘，物理磁盘完美进入深度静默，杜绝机械硬盘咔哒声，最大化保护硬盘寿命。
* **极速极简备份**：数据均落地为本地 JSON 文件，备份时只需打包备份 `data/` 目录即可，零运维心智负担。

### 2. 影院级沉浸与响应式交互
* **暗室影院视觉**：以高对比度的纯黑与深灰黑为基调，最大化凸显海报色彩。在视频详情页，背景色会根据影片海报的主色调自动进行平滑的、超大半径的径向高斯模糊渐变，营造极致包裹的沉浸感。
* **丝滑微动效**：影片卡片悬停时触发 `1.05x` 等比物理放大，配合平滑的过渡动画及重度扩散性阴影（`hover:shadow-2xl`），提供极强的主视觉选中反馈。
* **多态主题水合 (FOUC-free)**：支持自动（System）、浅色（Light）、深色（Dark）三态循环切换。首创在 `<head>` 中植入立即执行（Blocking）的本地偏好检索脚本，在 React 水合渲染前完成主题绑定，**彻底杜绝页面首开白/黑屏闪烁瞬间**。

### 3. 极致网络克制与直连技术
* **Node 服务器带宽 0 占用**：本地服务器仅用于重写和加密 M3U8 切片索引及直连鉴权校验。对于大流量 of `.ts` 视频文件切片，系统会自动判定当前协议环境：除 HTTPS-to-HTTP 的混合内容（Mixed Content）防浏览器拦截外，其余流媒体均重写为**客户端直接与源站 CDN 直连下载分片**，将服务器下行公网带宽和 CPU 负载彻底降为接近 0。
* **海报客户端 CDN 代理**：对所有外部豆瓣防盗链海报，直连官方 WebP 图片 CDN（`images.weserv.nl`）发起拉取，大幅释放本地带宽并带来客户端海报的高速缓存呈现。

---

## ✨ 功能特性

- 🎬 **多源聚合** - 智能搜索并聚合多个视频源，支持多集连播、自动播放下一集。
- 📝 **豆瓣自愈** - 自动拉取并匹配豆瓣评分及影视数据，海报自动缓存并自愈，防范 500 裂图。
- 💬 **弹幕挂载 (暂时屏蔽)** - 原弹幕第三方接口已失效，此版本默认屏蔽弹幕避免报错，待后续找到合适 API 后可一键打开。
- 🎥 **高级播放器** - 基于 ArtPlayer 定制，支持 HLS 解密、倍速微调、全功能快捷键与防盗链代理。
- 📱 **多端自适应** - 移动端手势横向无阻尼轻扫、选集面板大按钮抽屉布局，完美兼容 iPhone 刘海屏安全区。
- 🔐 **轻量后台** - 支持在线视频源一键配置与可用性管理。

---

## 🚀 快速部署

### 方式一：Docker Compose 部署（推荐，完美适配群晖）

极致精简版采用单容器架构，仅需运行一个轻量级的 App 容器，内存占用极低（仅约十几兆到几十兆），无需部署数据库。

#### 1. 生产环境 `docker-compose.yml` 配置文件

```yaml
version: '3.8'

services:
  # 🌐 App 服务：Next.js 前端与 API 聚合网关
  app:
    image: ghcr.io/yqxie1991/bukan:v2.0   # 👈 极致精简版生产镜像
    container_name: bukan-app
    ports:
      - "3009:3000"              # 外部访问端口， Lucky 反代等可直接指向此 3009 端口
    environment:
      - NODE_ENV=production
      
      # ⚠️【安全警示】默认后台管理密码为 "bukan"！
      # 强烈建议在部署前修改为您的自定义私有强密码，以防止他人扫描并越权登录您的后台！
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-bukan}
      - PORT=3000
    volumes:
      - bukan-cache:/app/public/cache             # 缓存卷，防容器重建升级后海报裂图
      - bukan-data:/app/data                      # 数据持久化卷，保存视频源、短剧源、播放器配置等
    logging:
      driver: "json-file"
      options:
        max-size: "10m"          # 限制单个日志文件最大为 10MB，防止系统盘被日志撑爆
        max-file: "3"
    restart: unless-stopped

volumes:
  bukan-cache:
    driver: local  # 图片海报缓存卷
  bukan-data:
    driver: local  # 极致精简版 JSON 数据持久化卷
```

#### 2. Linux VPS 命令行启动步骤
```bash
# 克隆项目并进入轻量重构版分支
git clone -b lightweight https://github.com/yqxie1991/bukan.git
cd bukan

# 编辑 docker-compose.yml 里的 ADMIN_PASSWORD 默认密码，然后启动
docker-compose up -d
```

#### 3. 🛠️ 群晖 NAS Container Manager 图形化部署步骤（零命令避坑）

1. **准备文件夹**：在群晖 `File Station` 中的 `docker` 文件夹下，新建一个名为 `bukan` 的子文件夹。
2. **启动 Container Manager**：打开群晖的 **Container Manager** (原 Docker 套件)。
3. **新建项目 (Project)**：
   * 点击左侧的 **“项目”** -> 点击右侧 of **“新增”**。
   * **项目名称**：输入 `bukan`。
   * **路径**：选择刚才在第 1 步创建的 `/volume1/docker/bukan` 文件夹。
   * **来源**：选择 **“创建 docker-compose.yml”**。
4. **粘贴并修改配置**：
   * 将上方提供的 **极致精简版 docker-compose.yml** 里的内容全量复制粘贴到文本框中。
   * ⚠️ 强烈建议将配置文件中的 `ADMIN_PASSWORD` 从默认值 `bukan` 修改为您自定义的强密码，防止被他人扫后台越权登录。
5. **部署并运行**：点击下一步，根据向导点击“完成”。Container Manager 会自动从 GitHub 下载镜像，自动初始化图片缓存及数据持久化卷。
6. **配置 Lucky 反代**：服务运行在群晖内网的 `3009` 端口。请在您的 Lucky 反代后台新建一条 Web 服务反代规则，将您的外网 HTTPS 域名直接反代指向 `http://群晖局域网内网IP:3009` 即可安全访问。

---

## ⚙️ 环境变量

### 可选变量
| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | 后台管理密码 (`/login`) | `bukan` (强烈建议修改) |
| `NEXT_PUBLIC_DOUBAN_API_URL` | 自定义豆瓣中转 API 地址 | `(内置公用代理)` |
| `NEXT_PUBLIC_DANMU_API_URL` | 弹幕接口地址 | `(弹幕已默认关闭)` |

---

## 💻 本地开发

### 直接运行
```bash
# 1. 安装项目依赖
npm install

# 2. 运行开发服务器
npm run dev
```

---

## 📁 核心项目结构
```
bukan/
├── app/                    # Next.js App Router (含 API 路由与播放路由)
├── components/             # UI 与功能组件
│   ├── home/               # 主页卡片、轮播及导航适配
│   └── player/             # Artplayer 与播放器内核
├── data/                   # 本地 JSON 数据库文件（vod-sources.json 等）
├── lib/                    # JSON 安全文件读写引擎与通用工具库
└── docker-compose.yml      # 去数据库极致精简版 Docker 部署配置
```

---

## 📄 License
Released under the [MIT License](LICENSE) © 2026.
