# Specification: 微调加大导航栏 Navbar 的字体与字重

## 1. 业务需求 (Requirements)
在当前的布局中，头部 Navbar 的文字显得有些清秀细小。为了增强导航的可见性与美感（特别是在使用 LXGW WenKai GB 霞鹜文楷时），我们需要：
1. **加大字号**：将桌面端和移动端导航项的字号均调大一阶（例如从 `text-sm` 升级为 `text-base`）。
2. **加重字重**：将中文字体在各个导航状态下的常规字重提升至半粗体（从 `font-medium` 升级为 `font-semibold`），使其笔触更加立体饱满。

## 2. 技术设计方案 (Technical Design)

### 2.1 桌面端 Navbar (Desktop Menu Items)
- **子菜单父按钮**：由原来的 `text-sm font-medium` 修改为 `text-base font-semibold`。
- **常规导航链接**：由原来的 `text-sm font-medium` 修改为 `text-base font-semibold`。

### 2.2 移动端侧边栏 (Mobile Drawer Items)
- **子菜单父级标题**：由原来的 `text-base font-medium` 修改为 `text-lg font-semibold`。
- **子菜单项目链接**：由原来的 `text-sm font-medium` 修改为 `text-base font-semibold`。
- **常规导航链接**：由原来的 `text-base font-medium` 修改为 `text-lg font-semibold`。
