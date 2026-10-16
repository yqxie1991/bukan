# 🎬 不看 (bukan) - 项目索引索引 (Project Index)

本项目已采用 Conductor 规范进行管理。以下是项目的核心定义、编码指南和开发状态索引。

## 1. 核心定义文件 (Core Definitions)
* 🎯 **产品指南**：[product.md](product.md) —— 规定了“不看 (bukan)”的平台愿景与核心功能。
* 🎨 **设计与工程规范**：[product-guidelines.md](product-guidelines.md) —— 制定了 Netflix 黑红配色、动态渐变及性能指标规范。
* 💻 **技术栈定义**：[tech-stack.md](tech-stack.md) —— 记录了 Next.js 16 + React 19 + TailwindCSS 4 + 本地 JSON 文件存储（`lib/json-store.ts`）的核心依赖。
* 🔄 **开发工作流**：[workflow.md](workflow.md) —— 规定了各开发阶段与分支提交流程。

## 2. 编码指南 (Code Style Guides)
所有开发工作必须严格遵守以下已配置的代码风格指南：
* 📘 [TypeScript 开发规范](code_styleguides/typescript.md)
* 🎨 [HTML & TailwindCSS 样式规范](code_styleguides/html-css.md)
* 🌐 [通用项目编码规范](code_styleguides/general.md)

## 3. 任务轨迹注册表 (Tracks Registry)
所有的特性开发和缺陷修复任务将在此注册 and 追踪：

| 任务轨道 ID | 任务轨道名称 | 当前状态 | 优先级 | 创建日期 | 关联 Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `config-flow-optimization-and-category-row-fix_20260612` | 优化配置流程与分类行样式修正 | `[ ] 未开始` | High | 2026-06-12 | [plan.md](tracks/config-flow-optimization-and-category-row-fix_20260612/plan.md) |

## 4. 历史归档轨道 (Archived Tracks)
* 📦 [image-proxy-and-import-decryption-fix](archive/image-proxy-and-import-decryption-fix/index.md) —— 解决演示地址图片加载失败与订阅导入解密异常问题 (Completed: 2026-06-12)
* 📦 [docker-synology-deployment-optimization](archive/docker-synology-deployment-optimization/index.md) —— Docker 部署配置升级与群晖兼容性优化 (Completed: 2026-06-12)
* 📦 [secure-admin-api-endpoints](archive/secure-admin-api-endpoints/index.md) —— 加固后台敏感设置 API 接口的权限验证 (Completed: 2026-06-12)
* 📦 [history-icon-smiley-sans-adaptation](archive/history-icon-smiley-sans-adaptation/index.md) —— 修复历史记录图标颜色切换逻辑与适配全站品牌字形 (Completed: 2026-06-12)
* 📦 [navbar-typography-tuning](archive/navbar-typography-tuning/index.md) —— 微调加大导航栏 Navbar 的字体与字重 (Completed: 2026-06-12)
* 📦 [subset-local-fonts](archive/subset-local-fonts/index.md) —— 移除 Logo 并配置子集化霞鹜文楷与得意黑字体 (Completed: 2026-06-12)
* 📦 [create-font-tester](archive/create-font-tester/index.md) —— 建立本地交互式字体效果测试首页 (Completed: 2026-06-12)
* 📦 [rewrite-readme-entirely](archive/rewrite-readme-entirely/index.md) —— 全量删除并重写项目 README.md 说明文档 (Completed: 2026-06-12)
* 📦 [generate-new-logo](archive/generate-new-logo/index.md) —— 设计并为“不看”生成全新的项目 Logo 图标 (Completed: 2026-06-12)
* 📦 [update-github-owner-url](archive/update-github-owner-url/index.md) —— 更新 README.md 中的 GitHub 用户名由 unilei 为 yqxie1991 (Completed: 2026-06-12)
* 📦 [update-github-repo-url](archive/update-github-repo-url/index.md) —— 更新 README.md 中的 GitHub 仓库链接与部署地址为 bukan (Completed: 2026-06-12)
* 📦 [rename-project-readme](archive/rename-project-readme/index.md) —— 修正主 README.md 文档中的项目名称为“不看” (Completed: 2026-06-12)
* 📦 [update-readme](archive/update-readme/index.md) —— 更新项目 README.md 说明文档匹配当前方案 (Completed: 2026-06-12)
* 📦 [system-resource-optimization](archive/system-resource-optimization/index.md) —— 群晖系统资源占用优化、空闲写盘压制与安全漏洞修复 (Completed: 2026-06-11)
* 📦 [ui-theme-optimization](archive/ui-theme-optimization/index.md) —— 界面卡片 Hover 优化与自动/手动主题切换 (Completed: 2026-06-12)
* 📦 [optimize-disk-writes](archive/optimize-disk-writes/index.md) —— 优化群晖 Docker 磁盘持续写入 (Completed: 2026-06-11)
