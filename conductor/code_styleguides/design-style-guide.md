# Design Style Guide (设计风格指南)

本指南旨在规范 BUKAN 影视系统全站的视觉表现与交互规范，涵盖亮色 (Light) 模式、暗色 (Dark) 模式、卡片悬停 (Hover) 交互、滚动容器防截断机制以及多主题色彩自适应标准。后续开发所有页面与组件时，必须严格参照此指南执行。

---

## 1. 核心主题与色彩规范

为了提供极致的视觉美感，系统放弃了生硬的纯黑纯白高对比度设计，引入自适应拟物偏光与高质感底色。

### 1.1 亮色 (Light) 模式
- **主底色**：统一使用温润的苹果冷灰色 `#f5f5f7` (`bg-[#f5f5f7]`)，拒绝刺眼的纯白色 `#ffffff`。
- **自适应卡片底色**：使用自适应变量 `bg-foreground/5`（在浅色底上表现为极其柔和的 5% 灰度值），使未加载的海报或背景展现平滑过渡。
- **精致细微描边**：所有浮动卡片、海报容器均须添加超细物理描边 `border border-black/5`，防止在浅色背景下卡片边界模糊。
- **微弱渐变偏光**：Hero 区域的斑驳霓虹渐变层在 Light 模式下不进行粗暴的 `hidden`，而是设置 `opacity-20`（或 `opacity-[0.15]`），在白底上呈现若隐若现的高级珍珠晕彩。

### 1.2 暗色 (Dark) 模式
- **主底色**：统一使用极深空灰色 `#0a0a0c` (`dark:bg-[#0a0a0c]`)，相比纯黑色 `#000000` 具备更优雅的屏幕暗部层次与景深感。
- **精致细微描边**：卡片与海报容器添加极暗微描边 `dark:border-white/5`，在极暗背景下勾勒物理边缘。
- **霓虹黑红双层混合荧光阴影**：悬停时采用 Netflix 经典的高亮红黑双层发光阴影，以红色为核心点缀，体现极客质感：
  `dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(229,9,20,0.15)]`

---

## 2. 卡片与 Hover 悬停交互规范

Hover 是影视卡片的核心交互，必须在缩放、阴影、层级和过渡时间上保持高度统一。

| 交互属性 | 亮色模式 (Light) 规范 | 暗色模式 (Dark) 规范 |
| :--- | :--- | :--- |
| **基础缩放** | `hover:scale-105` | `hover:scale-105` |
| **层级提升** | `hover:z-10` | `hover:z-10` |
| **悬停阴影** | `hover:shadow-[0_15px_30px_rgba(0,0,0,0.08),0_0_15px_rgba(0,0,0,0.02)]` | `dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(229,9,20,0.15)]` |
| **过渡动画** | `transition-all duration-300` | `transition-all duration-300` |

### 示例代码 (DoubanCard.tsx)
```tsx
<div
  className="group relative cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08),0_0_15px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(229,9,20,0.15)] rounded-lg"
>
  <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-foreground/5 dark:bg-gray-800 border border-black/5 dark:border-white/5 transition-colors duration-300">
    {/* 图片与加载逻辑 */}
  </div>
</div>
```

---

## 3. 滚动容器防截断机制 (Anti-clipping Layout)

当卡片在具有横向滚动（如 `overflow-x-auto`、`scrollbar-hide`）的 Flex 行中进行 `hover:scale-105` 缩放时，浏览器通常会因为 X/Y 轴溢出限制对放大后的卡片顶部和底部进行物理截断 (Clipping Bug)。

### 规范解决方案：物理缓冲策略
- **外层 Flex 滚动容器**：必须通过纵向 Padding 提供物理伸展缓冲区，并使用负 Margin 物理抵消该行距，使整行组件在文档流中不产生额外的间距抖动。
- **推荐类名组合**：`py-4 -my-4` 组合。
- **卡片间呼吸间距**：为防止卡片在缩放时与左右相邻的卡片生硬重叠，横向滚动行内的子元素应保证具有足够的横向间隔（如 `space-x-3 md:space-x-4`）。

### 示例布局结构 (CategoryRow.tsx)
```tsx
<div className="relative">
  {/* 滚动容器层：通过 py-4 -my-4 提供悬停缩放缓冲，消除物理截断 */}
  <div className="flex overflow-x-auto space-x-3 md:space-x-4 py-4 -my-4 scrollbar-hide scroll-smooth">
    {movies.map((movie) => (
      <div key={movie.id} className="w-[140px] md:w-[180px] shrink-0">
        <DoubanCard movie={movie} />
      </div>
    ))}
  </div>
</div>
```

### 3.2 视口交叉滚动渐入与波浪动效 (Scroll Reveal & Stagger Animation)
为了让页面加载与向下滚动时的内容呈现更富有高端灵动的“呼吸感”，影视板块、追剧日历板块应统一支持视口交叉渐入和卡片的波浪入场动效。
- **技术原理**：采用原生 `IntersectionObserver` 监测板块是否进入可见区域，配合 Tailwind CSS 的过渡属性和 React 内联 `transitionDelay` 属性实现差时波浪。
- **动效标准**：
  - **行标题入场**：随板块可见平滑下落微移入场：`transition-all duration-700 ease-out transform`，激活前 `opacity-0 -translate-y-2`，激活后 `opacity-100 translate-y-0`。
  - **卡片入场**：随板块可见，呈 35ms 递增波浪式上滑缩放显现：`transition-all duration-700 ease-out transform`，激活前 `opacity-0 translate-y-4 scale-95`，激活后 `opacity-100 translate-y-0 scale-100`。
  - **组件化示范 (React Hooks)**：
    ```typescript
    const rowRef = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.02, rootMargin: "0px 0px -45px 0px" }
      );
      if (rowRef.current) observer.observe(rowRef.current);
      return () => observer.disconnect();
    }, []);
    ```

---

## 4. 文本与语义适配规范

亮色和暗色主题下，所有文本和标签必须有自适应的语义化颜色适配，不能直接写死暗色文本或亮色背景。

1. **标题文字**：
   - 使用 `text-foreground` / `text-neutral-900 dark:text-neutral-100`，绝对禁止在浅色模式下残留浅灰色文字。
2. **副标题与描述信息**：
   - 使用 `text-muted-foreground` / `text-neutral-500 dark:text-neutral-400`。
3. **加载骨架屏与占位图**：
   - 统一使用 `bg-foreground/5 dark:bg-gray-800` 进行过渡，在图片加载完成前为用户提供最和谐的视觉锚点。
4. **霓虹高亮标签**：
   - 在浅色底上，原先淡紫色的偏光霓虹层极不协调，需要适配为 `opacity-20` 的浅调或使用背景边框融合，避免产生“斑驳霓虹污染”。
