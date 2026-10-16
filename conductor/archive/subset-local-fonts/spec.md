# Specification: 移除 Logo 并配置子集化霞鹜文楷与得意黑字体

## 1. 业务需求 (Requirements)
为了简化视觉设计并实现极致的首屏资源优化，项目需要：
1. **移除 Logo**：全面剥离 Navbar 顶栏及移动端侧边栏的图片 Logo 渲染，让头部导航更加平整极简。
2. **高端中文字体替换**：
   - 品牌字标“不看”修改为“得意黑 (Smiley Sans)”设计字体。
   - Navbar 导航栏的所有其他文字、以及 Footer 底栏的所有文字修改为“霞鹜文楷 (LXGWWenKaiGB)”字体。
3. **本地化子集化（Font Subsetting）**：为了避免引用多达 10MB+ 的完整中文字体包，利用本地裁剪工具（字蛛 Font-Spider）智能扣取相关页面中实际用到的所有汉字、字母和符号，生成最终仅约几 KB 的高性能本地 `.woff2` 文件，实现超高速的首屏加载。

## 2. 技术设计方案 (Technical Design)

### 2.1 Logo 移除
- 在 `components/home/Navbar.tsx` 中定位并删除所有的 `<img>` Logo 标签（分别在桌面端布局及移动端 Drawer 布局中）。

### 2.2 字体获取与本地路径
- 创建目录：`public/fonts/` 存放压缩子集化后的字体。
- 创建临时目录：`public/fonts/src/` 存放下载的完整源字体 `.ttf` 文件。
- 字体文件下载来源：
  - 得意黑：`https://cdn.jsdelivr.net/gh/atelier-anchor/smiley-sans@main/font-ttf/SmileySans-Oblique.ttf` (约 3.7MB)
  - 霞鹜文楷：`https://cdn.jsdelivr.net/gh/chawyehsu/lxgw-wenkai-webfont@v1.3.0/LXGWWenKai-Regular.ttf` (约 11MB)

### 2.3 字蛛子集化裁剪工作流 (Font-Spider Workflow)
1. **构建临时静态 HTML (`font-build.html`)**：
   在项目根目录下创建一个包含所有在 Navbar、Footer 以及“不看”中要出现的全部字符的 HTML 页面：
   - 得意黑测试区：“不看”。
   - 霞鹜文楷测试区：“首页电影电视剧追剧日历最新历史记录短剧继续观看管理历史查看全部搜索切换主题免责声明本站所有内容均来自互联网收集仅供学习和交流使用如有侵权请联系删除Bukan0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ©•-”。
2. **应用本地原版字体 CSS 声明**：
   在 `font-build.html` 中通过 `@font-face` 直接引入 `public/fonts/src/` 下的完整 `.ttf` 文件。
3. **执行子集化编译**：
   运行命令 `npx font-spider font-build.html`。字蛛会分析页面中使用的文字，提取对应的字形文件，自动把 `public/fonts/src/` 里的 `.ttf` 裁剪并精简为只有几 KB 的新 `.ttf` 并且在同目录下生成对应的 `.woff2`。
4. **资源转移与整合**：
   - 将裁剪生成的 `SmileySans-Oblique.woff2` 和 `LXGWWenKai-Regular.woff2` 移动到 `public/fonts/` 下。
   - 在 `app/globals.css` 中通过 `@font-face` 声明这两个字体。
   - 删除临时文件（`font-build.html` 和 `public/fonts/src/` 临时文件夹）。
5. **在 Next.js 组件中应用 `font-family`**：
   - 在 `app/globals.css` 或组件样式中，为“不看”品牌文本、Navbar 字体、Footer 字体应用对应的 `font-family`。
