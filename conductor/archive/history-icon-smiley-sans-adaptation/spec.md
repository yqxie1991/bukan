# Specification: 修复历史记录图标颜色切换与全站“不看”字体适配

## 1. 业务需求 (Requirements)
1. **历史记录图标对比度缺陷**：头部导航栏在页面未滚动时背景为深色渐变（`scrolled = false`）。由于 `HistoryPopup` 的触发按钮颜色被硬编码为 `text-gray-800 dark:text-white`，导致在浅色主题且未滚动时，图标呈灰色显示，对比度低。需在未滚动时强制显示为 `text-white`。
2. **“不看”品牌字体适配**：此前已将导航栏品牌字“不看”字形更换为得意黑（Smiley Sans），但详情页、搜索页、分类检索页、后台及登录页的“不看”字样仍然使用了普通黑体或系统默认字体。为了平台视觉风格的一致性，需要在上述页面中应用得意黑字体。

## 2. 技术设计方案 (Technical Design)

### 2.1 历史记录图标的 scrolled 联动
* **HistoryPopup.tsx**：
  - 定义 `HistoryPopupProps` 接口并接收 `scrolled?: boolean`。
  - 使用动态的 `className` 类名组合：
    - `scrolled` 为 `true`：`text-gray-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10`
    - `scrolled` 为 `false`：`text-white hover:bg-white/10`
* **Navbar.tsx**：
  - 将自身的 `scrolled` 状态属性传递给 `<HistoryPopup />` 子组件：`<HistoryPopup scrolled={scrolled} />`。

### 2.2 “不看”品牌文本得意黑字体适配
在项目的 `@font-face` 声明中，`Smiley Sans` 已经被注册为可用字体。对以下文件中的“不看”包裹标签应用行联样式 `style={{ fontFamily: '"Smiley Sans", sans-serif' }}`：
- `app/movie/[id]/page.tsx` (详情导航)
- `app/search/page.tsx` (搜索导航)
- `app/browse/[type]/page.tsx` (检索页面标题)
- `app/category/[type]/page.tsx` (分类页面标题)
- `app/login/page.tsx` (登录标题)
- `app/admin/settings/page.tsx` (设置页面头部)
