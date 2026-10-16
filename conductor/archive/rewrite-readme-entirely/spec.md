# Specification: 全量删除并重写项目 README.md 说明文档

## 1. 业务需求 (Requirements)
现有的 `README.md` 包含较多陈旧的格式和琐碎的修改痕迹。为了以极其高端（Premium）且技术重点突出的方式向访问者呈现，需要将现有内容完全清除，并重新规划和编写一份全新的 `README.md`。

## 2. 设计与框架大纲 (Structure Design)
重写后的 `README.md` 应遵循现代开源项目的顶尖排版，主要包含以下六大板块：

1. **品名徽章与一句话定位**：
   - 🎬 **不看 (bukan)** - 极简主义、高性能影视资源聚合与沉浸式播放平台。
   - 挂载 Next.js 16, React 19, TailwindCSS 4, MongoDB 7, Docker 等最新的 Badges。
2. **🌟 项目核心设计哲学**：
   - **影院级沉浸**：暗黑影院视觉、海报高斯模糊径向氛围、1.05x 扩散阴影微交互。
   - **多态主题水合**：System (自动) / Light (浅色) / Dark (深色) 三挡循环手动切换，阻断式头部脚本彻底解决 SSR 闪烁。
   - **极致资源克制 (群晖/NAS 专项)**：禁用 journal 和限制连接日志以彻底降低空闲写盘频次，TS 分片智能直连卸载 Node.js 代理，WiredTiger Cache 硬锁 256MB，防内存泄露及防目录穿越安全加固。
3. **✨ 核心功能特性**：
   - 多视频源聚合、豆瓣自愈匹配、高级 ArtPlayer 播放器（倍速/弹幕/HLS）、反代混合协议（HTTP-to-HTTPS）智能代理等。
4. **🚀 快速部署与使用指南**：
   - **Docker Compose**（提供极致优化版的 docker-compose.yml 示例，配齐 WiredTiger 限制和 quiet 参数）。
   - **Vercel 一键克隆部署**（配置正确的 `yqxie1991/bukan` 新库部署地址）。
   - **VPS 一键安装**（采用正确的 `yqxie1991/bukan` installer 脚本链接）。
5. **⚙️ 环境变量矩阵说明**：
   - 表格形式，归纳必需与可选变量。
6. **💻 本地运行与开发指南**：
   - 依赖安装、npm 开发指令、项目主要目录结构。
