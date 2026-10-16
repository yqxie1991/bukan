# Plan: ui-theme-optimization

## Phase 1: 物理样式与 Hover 功能优化
- [x] 任务 1: 移除 `CategoryRow.tsx` 误用的外层 `group` 属性，解决悬停遮罩株连 Bug 667480f
- [x] 任务 2: 升级 `DoubanCard.tsx` 的悬停放大比例和阴影深度，强化视觉回馈 667480f

## Phase 2: 主题控制核心组件开发
- [x] 任务 3: 编写 React ThemeProvider 上下文，建立 `theme` 本地记录机制 667480f
- [x] 任务 4: 在 `globals.css` 中引入 Tailwind 类暗色机制，重构全站基础配色 667480f
- [x] 任务 5: 在 `layout.tsx` 中挂载 ThemeProvider 并植入防闪烁的 Inline 脚本 667480f

## Phase 3: 界面主题适配与控制器集成
- [x] 任务 6: 重整 `Navbar.tsx`，加入自动、浅色、深色三挡循环手动调节器，并适配浅色文字与背景 667480f
- [x] 任务 7: 适配 `page.tsx` 与 `Footer.tsx` 等主要布局的背景与文本自适应主题 667480f
- [x] 任务 8: 调试与确认全量样式与功能 667480f
