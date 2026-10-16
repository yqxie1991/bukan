# 🎬 不看 (bukan) - 影视资源聚合与沉浸式播放平台 (去数据库极致精简版)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)
![Store](https://img.shields.io/badge/Store-JSON_File-orange?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**零外部数据库依赖、极简主义、高性能影视资源聚合平台** —— 客户端直连 CDN、豆瓣自愈匹配、多态主题切换、极致轻量化单容器部署。

🌐 **在线演示**: [https://bukan8.vercel.app/](https://bukan8.vercel.app/)

[核心设计哲学](#-核心设计哲学) • [网络模型](#-网络模型服务器带宽从哪省下来) • [功能特性](#-功能特性) • [快速部署](#-快速部署) • [环境变量](#️-环境变量) • [本地开发](#-本地开发)

</div>

---

## 🌟 核心设计哲学

本平台（`lightweight` 极致精简版）针对低能耗宿主机（群晖/NAS、轻量 VPS）做了极致的性能压制与优化设计：

### 1. 零数据库依赖与完全静默磁盘
* **免除外置数据库**：已彻底移除 MongoDB 等重度依赖，采用进程内存 Map 缓存 + 原子性本地 JSON 文件读写（`lib/json-store.ts` → `data/*.json`）作为核心存储引擎。
* **磁盘完全静默 (NAS 守护神)**：没有外部数据库进程，也就没有每秒数百次的心跳探针与日志刷盘，物理磁盘可进入深度静默，杜绝机械硬盘咔哒声。
* **极速极简备份**：数据全部落地为本地 JSON 文件，备份只需打包 `data/` 目录。

### 2. 客户端直连优先（带宽策略）
* **服务器不搬运视频字节**：除浏览器 Mixed Content 强制要求的情形外，视频分片一律改写为绝对地址，由**客户端直接向源站 CDN 拉取**，服务器下行带宽与 CPU 开销趋近于 0。
* **海报走公共图片 CDN**：豆瓣防盗链海报由客户端直连 `images.weserv.nl` 拉取，服务器零出站流量。

### 3. 影院级沉浸与响应式交互
* **暗室影院视觉**：以纯黑与深灰黑为基调；详情页背景会根据海报主色调做超大半径径向高斯模糊渐变。
* **丝滑微动效**：卡片悬停触发等比放大 + 阴影扩散 + 玻璃拟态播放按钮。
* **多态主题水合 (FOUC-free)**：支持自动（System）/ 浅色（Light）/ 深色（Dark）三态切换，`<head>` 内注入立即执行脚本，在 React 水合前完成主题绑定，杜绝首开闪烁。

---

## 🌐 网络模型：服务器带宽从哪省下来

**如实说明**，避免「带宽 0 占用」这类笼统说法。所有视频流量是否需要经过服务器，取决于**本服务的对外协议**与**资源的协议**：

| 流量类型 | 处理方式 | 服务器带宽 |
| :--- | :--- | :--- |
| **m3u8 清单** | 始终经服务器重写（`?mode=smart`，默认） | 仅清单体积（KB 级） |
| **HTTPS 分片** | 客户端直连源站 CDN | **0** |
| **HTTP 分片**（本服务为 HTTPS 时） | 经服务器中转（否则被浏览器 Mixed Content 拦截） | 与分片体积等量 |
| **加密 KEY / 初始化段 MAP / 备用媒体 MEDIA** | 与分片同一判定规则 | 视协议而定 |
| **海报图片** | 客户端直连 weserv CDN | **0** |

> 关键点：如果你通过 Lucky 反代以 **HTTPS** 对外提供服务，而视频源分片是 **HTTP**，那这部分分片**必须**经服务器中转，这是浏览器安全策略决定的，无法绕过。
> 反之，若源站分片为 HTTPS，则完全由客户端直连，服务器仅承担 KB 级的清单重写。

### 三重兜底（保证直连失败不会导致无法播放）

1. **清单加载失败**（多为源站未开 CORS）→ 自动切换为代理模式；
2. **分片 / 密钥直连失败** → 单向升级为 `mode=full`（全量中转），且每个视频只升级一次，避免来回抖动；
3. **海报加载失败** → weserv CDN → `/api/image-proxy` 服务端代理 → 本地占位图，逐级降级不裂图。

---

## ✨ 功能特性

- 🎬 **多源聚合** - 智能搜索并聚合多个视频源，支持多集连播、自动播放下一集。
- 📝 **豆瓣自愈** - 自动匹配豆瓣评分与影视数据，海报缓存并自愈。
- 💬 **弹幕挂载** - 内置默认弹幕接口（可用 `NEXT_PUBLIC_DANMU_API_*` 覆盖）。
- 🎥 **高级播放器** - 基于 Artplayer + hls.js，支持 HLS 解密、倍速微调、快捷键与防盗链代理。
- 📱 **多端自适应** - 移动端手势横向轻扫、选集抽屉布局，兼容 iPhone 刘海屏安全区。
- 🔐 **轻量后台** - `/admin/settings` 在线配置视频源、短剧源、频道与播放器。

---

## 🚀 快速部署

### 方式一：Docker Compose 部署（推荐，完美适配群晖）

极致精简版为**单容器架构**，仅一个 App 容器，内存占用极低，无需数据库。

#### 1. 生产配置 `docker-compose.yml`

> 以下内容与仓库内 `docker-compose.yml` 保持一致，可直接复制使用。

```yaml
services:
  app:
    # 生产镜像版本（修复 SSRF / 会话伪造 / 视频分片全量中转等问题）
    image: ghcr.io/yqxie1991/bukan:v2.0-lite   # 👈 极致精简版生产镜像
    container_name: bukan-app
    ports:
      # 宿主机端口:Lucky 反代指向此端口；如与已有服务冲突可自行修改左侧数字。
      - "3009:3000"
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
      # 必须设置。使用 :? 语法强制校验——变量缺失时立即报错退出，
      # 这样部署时不可能"忘记修改而回落到默认密码"。
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:?ADMIN_PASSWORD 必须设置，请 export ADMIN_PASSWORD=<你的强密码>}
      - HOME_CACHE_TIMEZONE=${HOME_CACHE_TIMEZONE:-Asia/Shanghai}
      - APP_URL=${APP_URL:-}
      - INTERNAL_ORIGIN=http://127.0.0.1:3000
      - TRUST_PROXY=${TRUST_PROXY:-true}
      - PORT=3000
    volumes:
      - bukan-cache:/app/public/cache
      - bukan-data:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

volumes:
  bukan-cache:
    driver: local
  bukan-data:
    driver: local
```

#### 2. Linux VPS 命令行启动

```bash
git clone -b lightweight https://github.com/yqxie1991/bukan.git
cd bukan

# 必须先导出管理密码，否则 compose 会直接报错退出（这是刻意设计）
export ADMIN_PASSWORD='你的强密码'
docker compose up -d
```

#### 3. 🛠️ 群晖 NAS Container Manager 图形化部署（零命令避坑）

1. **准备文件夹**：在群晖 `File Station` 的 `docker` 文件夹下新建子文件夹 `bukan`。
2. **启动 Container Manager**：打开群晖的 **Container Manager**（原 Docker 套件）。
3. **新建项目 (Project)**：
   * 点击左侧 **“项目”** → 右侧 **“新增”**。
   * **项目名称**：`bukan`
   * **路径**：选择第 1 步创建的 `/volume1/docker/bukan`
   * **来源**：选择 **“创建 docker-compose.yml”**
4. **粘贴并修改配置**：
   * 把上面的 `docker-compose.yml` 内容全量粘贴进文本框。
   * ⚠️ 群晖图形界面下 `:?` 语法无法交互询问，请**直接把 `${ADMIN_PASSWORD:?...}` 整段替换为你的真实密码**，例如 `- ADMIN_PASSWORD=你的强密码`。
5. **部署并运行**：下一步 → 完成。Container Manager 会拉取镜像并自动初始化缓存卷与数据卷。
6. **配置 Lucky 反代**：服务在群晖内网 `3009` 端口。在 Lucky 新建一条 Web 服务反代规则，将外网 HTTPS 域名指向 `http://群晖内网IP:3009`。

> ⚠️ **升级提醒**：容器重建不会丢数据（配置在 `bukan-data` 卷、海报缓存在 `bukan-cache` 卷），但**请勿删除这两个卷**。

---

## ⚙️ 环境变量

共 14 项，完整示例见 [`.env.example`](.env.example)。
⚠️ `NEXT_PUBLIC_` 前缀的变量会在**构建时**内联进客户端产物，运行期再设置对已构建镜像无效。

| 变量名 | 必填 | 说明 | 默认值 |
| :--- | :---: | :--- | :--- |
| `ADMIN_PASSWORD` | ✅ | 后台管理密码 (`/login`)，compose 用 `:?` 强制校验 | 无（未设置则部署失败） |
| `NODE_ENV` | | 运行环境 | `production` |
| `PORT` | | 容器内监听端口 | `3000` |
| `TZ` | | 容器时区（影响首页 0 点自动更新） | `Asia/Shanghai` |
| `HOME_CACHE_TIMEZONE` | | 首页缓存跨天判定时区 | `Asia/Shanghai` |
| `INTERNAL_ORIGIN` | | 服务端自调用地址（豆瓣多源匹配用） | `http://127.0.0.1:3000` |
| `APP_URL` | | 外网访问域名，分片直连判定用 | 空（按请求头推断） |
| `NEXT_PUBLIC_APP_URL` | | 同上，但构建期内联（优先于 `APP_URL`） | 空 |
| `TRUST_PROXY` | | 是否信任反代写入的 `X-Forwarded-For` | `true` |
| `SECURE_COOKIE` | | 会话 Cookie 是否带 `Secure` 标记 | 生产 compose 默认 `true`；本地开发 `false` |
| `INTERNAL_TOKEN` | | 服务间内部调用凭证（多实例共享时才需设置） | 空（进程内随机生成） |
| `NEXT_PUBLIC_DOUBAN_API_URL` | | 自定义豆瓣中转 API 地址 | 内置默认代理 |
| `NEXT_PUBLIC_DANMU_API_URL` | | 弹幕接口地址 | 内置默认地址 |
| `NEXT_PUBLIC_DANMU_API_TOKEN` | | 弹幕接口令牌 | 内置默认值 |

### 部署要点

* **`ADMIN_PASSWORD` 是唯一必填项**，`docker-compose.yml` 使用 `${ADMIN_PASSWORD:?...}`，未设置时部署直接失败——因此不存在「忘记修改而悄悄回落默认密码」的风险。
* **`TRUST_PROXY`**：经 Lucky/Nginx 反代时保持 `true`；若将端口直连暴露到公网，必须设为 `false`，否则攻击者可伪造 `X-Forwarded-For` 绕过登录限流。
* **`SECURE_COOKIE`**：生产 compose **已默认注入 `true`**（面向 Lucky HTTPS 反代）。不带该标记时，由于 3009 绑定 `0.0.0.0`，内网 `http://` 直连会把 7 天有效的会话 Cookie 明文发出。⚠️ 如果你日常直接走 `http://内网IP:3009` 登录，需显式设为 `false`，否则浏览器会拒绝保存该 Cookie，表现为「登录后又跳回登录页」。
* **端口绑定**：`3009:3000` 绑定 `0.0.0.0` 表示内网任意主机可直连。Lucky 与本服务同机时不影响正常使用（反代走回环路径）；若需收紧可改为 `"127.0.0.1:3009:3000"`。

---

## 💻 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 至少填入 ADMIN_PASSWORD

# 3. 启动开发服务器
npm run dev
```

> 提示：本地 HTTP 开发时请保持 `SECURE_COOKIE=false`。

---

## 📁 核心项目结构

```
bukan/
├── app/                    # Next.js App Router（页面 + API 路由）
│   ├── api/video-proxy/    # 视频代理：m3u8 重写与 smart/full 分片直连判定
│   ├── api/image-proxy/    # 海报服务端代理（weserv 不可达时的降级路径）
│   └── admin/settings/     # 后台管理
├── components/             # UI 与功能组件
│   ├── home/               # 主页卡片、轮播、导航
│   ├── player/             # Artplayer + hls.js 播放内核
│   └── SmartImage.tsx      # 三级回退海报组件
├── data/                   # 本地 JSON 数据库（已被 .gitignore 忽略）
├── lib/
│   ├── json-store.ts       # 原子写 + mtime 校验的存储引擎
│   ├── url-guard.ts        # 代理端点共用的 SSRF 校验
│   └── utils/image-utils.ts# weserv 直连与代理降级地址构造
└── docker-compose.yml      # 单容器生产部署配置
```

---

## 📄 License

Released under the [MIT License](LICENSE) © 2026.
