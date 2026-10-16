# Track Index: secure-admin-api-endpoints

## 轨道元数据
- **任务轨道 ID**: `secure-admin-api-endpoints`
- **任务轨道名称**: 加固后台敏感设置 API 接口的权限验证
- **当前状态**: `[x] 已完成`
- **优先级**: `High`
- **创建日期**: 2026-06-12
- **关联规范**: [tech-stack.md](../../tech-stack.md)

## 说明
在清理无用文件审查中发现，虽然 Next.js 中间件能够保护 `/admin` 开头的管理页面路由，但在后台用于更新配置的 API 接口中，完全没有执行 `validateSession()` 会话校验。这允许未授权的用户直接通过 POST/PUT 请求篡改平台的核心配置（如修改视频源、短剧源、Dailymotion 频道和播放器参数）。
本轨道旨在将这五个敏感的后台 API 写操作接口加固，引入 `validateSession()` 权限校验，并阻断所有未授权请求。
