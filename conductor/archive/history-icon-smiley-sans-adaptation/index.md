# Track Index: history-icon-smiley-sans-adaptation

## 轨道元数据
- **任务轨道 ID**: `history-icon-smiley-sans-adaptation`
- **任务轨道名称**: 修复历史记录图标颜色切换逻辑与适配全站品牌字形
- **当前状态**: `[x] 已完成`
- **优先级**: `Medium`
- **创建日期**: 2026-06-12
- **关联规范**: [product-guidelines.md](../../product-guidelines.md)

## 说明
本轨道旨在解决两个用户体验交互缺陷：
1. **历史记录图标白色切换逻辑**：在浅色模式且页面未滚动时，头部 Navbar 具有深色渐变背景，搜索等图标正常表现为白色，而 History 弹出层按钮由于硬编码颜色显示为深灰色，导致对比度极低。需引入 scrolled 状态以动态控制图标颜色。
2. **“不看”品牌文本字体适配**：为了维持平台设计语言的一致性，需在详情页、搜索页、分类检索页、管理后台及登录页中所有显式使用“不看”字样的大标题或导航头部适配得意黑（Smiley Sans）字体。
