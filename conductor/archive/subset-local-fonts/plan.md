# Plan: subset-local-fonts

## Phase 1: 准备字体与移除 Logo
- [x] 任务 1: 移除 `Navbar.tsx` 中桌面端及移动端的所有图片 Logo a6a7b4d
- [x] 任务 2: 编写 Node.js 脚本或通过命令将得意黑和霞鹜文楷完整 ttf 下载至 `public/fonts/src/` a6a7b4d

## Phase 2: 字蛛子集化裁剪与页面应用
- [x] 任务 3: 建立 `font-build.html` 整合所有 Navbar 和 Footer 所需字符并执行字蛛 `npx font-spider` 裁剪 a6a7b4d
- [x] 任务 4: 部署裁剪后的 woff2 并配置 `globals.css` 声明，将“不看”字标、Navbar 链接及 Footer 文字绑定至新字体 a6a7b4d
- [x] 任务 5: 进行本地浏览器验证，清理临时下载与构建文件夹，在本地 commit 提交 a6a7b4d
