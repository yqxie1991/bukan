# Track Index: subset-local-fonts

## 轨道元数据
- **任务轨道 ID**: `subset-local-fonts`
- **任务轨道名称**: 移除 Logo 并配置子集化霞鹜文楷与得意黑字体
- **当前状态**: `[x] 已完成`
- **优先级**: `Medium`
- **创建日期**: 2026-06-12
- **关联规范**: [product-guidelines.md](../../product-guidelines.md)

## 说明
本轨道旨在去除顶栏 Navbar 及移动端侧边栏的图片 Logo，同时下载“得意黑 (Smiley Sans)”和“霞鹜文楷 (LXGW WenKai)”完整字体文件包，利用字蛛 (font-spider) 子集化裁剪技术，仅提取页面中所包含的全部字符，生成体积超小的本地 Woff2 字体包（仅几 KB）并投入正式页面渲染，优化系统首屏加载资源。
