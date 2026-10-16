# 恢复并增强 DoubanCard hover 效果，解决最左侧裁剪问题

## 摘要

将 `DoubanCard` 的 hover 效果从「海报内部 img 放大 + 海报 div 阴影」恢复为「根 div scale + 阴影」方案，并**适当增强** hover 视觉反馈（scale-105 → scale-110 + brightness-105），通过加大 `CategoryRow` 滚动容器内层水平 padding 到 24-32px，彻底容纳 scale 外溢（11.2px）和 shadow 扩散（24-32px），从根本上解决最左/最右卡片 hover 时被 `overflow-x-auto` 裁剪的问题。

## 当前状态分析

### DoubanCard 当前实现（`components/DoubanCard.tsx`）

经过上一轮修改后：
- 根 div：仅 `group relative cursor-pointer rounded-lg`，**无 hover 变换**
- 海报 div：`group-hover:shadow-[var(--card-shadow-hover)] group-hover:border-primary/30`
- 海报 img：`group-hover:scale-[1.05]`（内部放大，被 `overflow-hidden` 限制）

### 问题

用户反馈「改回原本的 hover 效果，并适当增大」——指恢复根 div 的 scale + shadow 方案，并适度增强视觉反馈：
- 根 div：`hover:scale-110 hover:z-10 hover:shadow-[var(--card-shadow-hover)] hover:brightness-105`（从原 scale-105 增强到 scale-110 + brightness 提亮）
- 海报 div：无 hover 效果
- 海报 img：无 hover 效果

根 div 的 `hover:scale-110` 会让卡片整体从 transform-origin 向四周外溢约 11.2px，配合阴影扩散 24-32px，需要滚动容器提供足够缓冲空间。

### 之前 3 次尝试失败的根因

| 尝试 | padding | 缓冲量 | scale 外溢 | shadow 扩散 | 结果 |
|------|---------|--------|------------|-------------|------|
| 1 | `px-2` | 8px | 5.6px | 24px | 裁剪 |
| 2 | `px-3` | 12px | 5.6px | 24px | 裁剪 |
| 3 | `px-4` | 16px | 5.6px | 24px | 裁剪（shadow 仍超出 8px）|

**根本原因**：缓冲量不足 24-32px（shadow 扩散范围），需达到 `px-6`（24px）以上。本次增强为 scale-110 后外溢 11.2px，仍在 `px-6`（24px）缓冲范围内。

### CategoryRow 当前实现（`components/home/CategoryRow.tsx#L87`）

```tsx
<div className="flex overflow-x-auto space-x-3 md:space-x-4 px-2 py-4 -my-4 scrollbar-hide scroll-smooth snap-x snap-mandatory">
```

- 滚动容器内层 `px-2`（8px）
- 垂直方向 `py-4 -my-4` 已处理（16px 缓冲 + 负 margin 抵消）
- 父级容器 `px-4 md:px-12`

### `--card-shadow-hover` 设计令牌（`app/globals.css`）

- 浅色模式（L23）：`0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)` → 扩散 24px
- 深色模式（L36）：`0 12px 32px rgba(0,0,0,0.6), 0 4px 8px rgba(229,9,20,0.12)` → 扩散 32px

## 提议修改

### 修改 1：恢复 DoubanCard 根 div 的 hover 效果

**文件**：`components/DoubanCard.tsx`

**变更 1a：根 div className**（L23-26）

```tsx
// 当前
<div
  onClick={() => onSelect(movie)}
  className="group relative cursor-pointer rounded-lg"
>

// 改为（恢复并增强 hover 效果：scale-110 + brightness-105）
<div
  onClick={() => onSelect(movie)}
  className="group relative cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10 hover:shadow-[var(--card-shadow-hover)] hover:brightness-105 rounded-lg"
>
```

**增强说明**：
- `hover:scale-105` → `hover:scale-110`：放大比例从 5% 增到 10%，反馈更明显
- 新增 `hover:brightness-105`：hover 时整体亮度提升 5%，让卡片"高亮"感更强
- 保持 `hover:z-10`：层级提升，不被相邻卡片遮挡
- 保持 `hover:shadow-[var(--card-shadow-hover)]`：使用统一阴影令牌

**变更 1b：海报 div 移除 hover 效果**（L28）

```tsx
// 当前
<div className="relative aspect-2/3 overflow-hidden rounded-lg bg-foreground/5 dark:bg-surface border border-black/5 dark:border-white/5 transition-all duration-300 group-hover:shadow-[var(--card-shadow-hover)] group-hover:border-primary/30">

// 改为（恢复原状，仅保留 transition-colors）
<div className="relative aspect-2/3 overflow-hidden rounded-lg bg-foreground/5 dark:bg-surface border border-black/5 dark:border-white/5 transition-colors duration-300">
```

**变更 1c：海报 img 移除 group-hover scale**（L39）

```tsx
// 当前
className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.05] ${
  isLoading ? 'opacity-0' : 'opacity-100'
}`}

// 改为（恢复原状，仅 transition-opacity）
className={`w-full h-full object-cover transition-opacity duration-300 ${
  isLoading ? 'opacity-0' : 'opacity-100'
}`}
```

### 修改 2：加大 CategoryRow 滚动容器内层 padding

**文件**：`components/home/CategoryRow.tsx`（L87）

```tsx
// 当前
<div className="flex overflow-x-auto space-x-3 md:space-x-4 px-2 py-4 -my-4 scrollbar-hide scroll-smooth snap-x snap-mandatory">

// 改为（px-6 md:px-8 提供 24-32px 缓冲）
<div className="flex overflow-x-auto space-x-3 md:space-x-4 px-6 md:px-8 py-4 -my-4 scrollbar-hide scroll-smooth snap-x snap-mandatory">
```

**缓冲量计算**：
- `px-6` = 24px（移动端）→ 覆盖浅色模式 shadow 扩散 24px
- `px-8` = 32px（桌面端）→ 覆盖深色模式 shadow 扩散 32px
- scale-110 外溢约 11.2px（w-56 卡片宽度 224px × 10% / 2）→ 完全容纳
- brightness-105 无外溢（仅滤镜效果）→ 不影响缓冲量计算

**视觉影响**：
- 滚动列表视觉缩进 24-32px
- 与父级 `px-4 md:px-12` 叠加后，总缩进 40-44px（移动端）/ 44-48px（桌面端）
- 在合理范围内，不贴近浏览器边缘

## 假设与决策

### 假设
1. 「原本的 hover 效果」指最初设计——根 div `hover:scale-105 hover:z-10 hover:shadow-[var(--card-shadow-hover)]`，海报内部无 hover 变换。依据：`docs/UI品质提升修改记录.md#L77` 明确记录 DoubanCard 原本就是 `hover:shadow-[var(--card-shadow-hover)]`。
2. 「适当增大」指在原 scale-105 基础上提升到 scale-110，并加 brightness-105 让卡片更"高亮"，而非激进增大到 scale-125（会破坏布局节奏）。
3. `--card-shadow-hover` 的 box-shadow 扩散范围（24-32px）是裁剪问题的主要外溢源，scale-110（11.2px）是次要源。
4. 用户接受滚动列表视觉缩进 24-32px（用户原话「只适当放大父容器大小满足hover即可」）。

### 决策
1. **不使用 transform-origin 方向控制**：会让首尾卡片放大方向与中间卡片不一致，视觉不协调。
2. **不使用 spacer 占位元素**：spacer 会在滚动时显示为空白，视觉割裂。
3. **不使用负 margin trick**：用户在上一轮明确否决（「取消这次修改。只适当放大父容器大小满足hover即可，而不是把父容器直接贴近浏览器边缘」）。
4. **不修改 `--card-shadow-hover` 设计令牌**：该令牌在 `Modal.tsx`、`login/page.tsx` 等多处复用，修改会影响全局视觉一致性。
5. **保留 `py-4 -my-4` 垂直方向处理**：已验证有效，不需改动。

## 验证步骤

1. **类型检查**：运行 `npx tsc --noEmit` 确保无类型错误。

2. **视觉验证（桌面端）**：
   - 访问首页 `http://localhost:3000`
   - hover 最左侧第一个卡片，确认：
     - 卡片整体放大 5%（scale-105）
     - 阴影完整显示，左/右/上/下边缘无裁剪
     - 卡片层级提升（z-10），不被相邻卡片遮挡
   - hover 中间卡片，确认放大和阴影正常
   - hover 最右侧最后一个卡片，确认阴影右边缘无裁剪
   - 滚动到最左/最右，确认 spacer 区域视觉自然

3. **视觉验证（移动端）**：
   - 切换到移动端视口（如 375px 宽）
   - 确认 hover 效果在触屏设备上不触发（移动端无 hover）
   - 确认卡片间距和视觉缩进合理

4. **深色模式验证**：
   - 切换到深色模式
   - hover 卡片，确认阴影扩散 32px 完整显示（深色模式阴影更深更大）
   - 确认 `rgba(229,9,20,0.12)` 红色微光阴影可见

5. **横向滚动验证**：
   - 横向滚动列表，确认滚动行为正常
   - 确认 snap-x snap-mandatory 吸附效果正常
   - 确认滚动条隐藏（scrollbar-hide）
