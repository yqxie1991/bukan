# Specification: 设计并为“不看”生成全新的项目 Logo 图标

## 1. 设计概念 (Design Concept)
“不看 (bukan)”平台作为影视资源聚合中心，其视觉主基调是“猩红强调色”与“纯黑底色”的暗黑影院沉浸配置。新 Logo 的设计需要具备以下特点：
- **极简主义 (Minimalism)**：避免复杂繁冗的细节描绘。使用流畅强烈的图形线条勾勒，易于在不同尺寸（如 32x32 导航栏图标、512x512 应用图标）下辨识。
- **影院沉浸 (Cinema Immersion)**：融合播放器控制按钮（如 Play 三角标）与首字母 "B" 或“不”字的视觉暗示。
- **高级质感 (Premium Quality)**：配合微弱的霓虹发光（Glow）、平滑的三维阴影梯度，传达出类似于 Netflix / YouTube Premium 般的高端前沿质感。
- **黑红配色**：主体为亮猩红色（#E50914）在纯黑背景下的对比爆发。

## 2. 技术设计方案 (Technical Design)
* **生成模型提示词制定**：
  - 提示词应包含：`minimalist modern app logo, neon scarlet red icon on a solid pure black background, abstract film play button blended with letter 'B', premium glowing gradient, 3d volumetric shadow, futuristic luxury entertainment branding, vector style, flat clean logo design`
* **资源接入与替换**:
  - 利用 `generate_image` 生成图像。
  - 将生成的图片进行尺寸对齐，替换 `public/logo.png`。
