# Specification: 界面卡片 Hover 优化与自动/手动主题切换

## 1. 业务需求 (Requirements)
1. **解决卡片悬停遮罩误触发问题**：电脑端当鼠标移入某一部影片卡片时，只有当前卡片显示遮罩和立即播放按钮，同一列表行的其他非 Hover 影片卡片保持原样，不应显示遮罩。
2. **增强悬停交互质感**：加大当前 Hover 影片卡片的放大系数，强化其阴影深度，提升主视觉选中感。
3. **支持浅色/深色主题切换**：
   * **自动切换**：默认跟随系统的颜色偏好模式 (`prefers-color-scheme`)。
   * **手动切换**：在顶部导航栏增加切换开关，支持在“自动(System)”、“浅色(Light)”、“深色(Dark)”三种模式中循环手动切换，并利用 `localStorage` 记录用户偏好，防范 SSR 水合渲染闪烁。

## 2. 技术设计方案 (Technical Design)

### 2.1 卡片 Hover 优化
* **定位原因**：[CategoryRow.tsx](file:///F:/Trae/13-kerkerker/kerkerker/components/home/CategoryRow.tsx) 中横向滚动的包裹 `div` 拥有 `group` 属性，导致鼠标移入该行任意空白处都会触发所有卡片子组件的 `group-hover:opacity-100`。
* **解决手段**：移除该容器的 `group` 属性，使卡片的 `group-hover` 严格局限在卡片自身容器的 Hover 范围内。
* **动效升级**：在 [DoubanCard.tsx](file:///F:/Trae/13-kerkerker/kerkerker/components/DoubanCard.tsx) 中，Hover 缩放系数调整为 `1.05`，并附加深层扩散阴影。

### 2.2 主题切换机制 (Theme Switcher)
* **自建 ThemeProvider & ThemeContext**：
  在 `components/providers/theme-provider.tsx` 中使用 React Context 管理主题。
  在 `useEffect` 中，基于当前状态向 `document.documentElement` 添加/移除 `dark` 类名。
* **注入 ThemeScript 防闪烁**：
  在 [layout.tsx](file:///F:/Trae/13-kerkerker/kerkerker/app/layout.tsx) 头部注入一段 Inline 脚本，在首字节渲染时立即读取 `localStorage` 和系统媒体查询决定是否挂载 `dark` 类，完全杜绝白/黑屏瞬间闪烁。
* **Tailwind v4 配置与样式适配**：
  * 在 [globals.css](file:///F:/Trae/13-kerkerker/kerkerker/app/globals.css) 中加入 `@variant dark (.dark &);` 指示，支持基于 `.dark` 类的手动切换。
  * 将 `body` 背景和主要文本修改为自适应色彩。
