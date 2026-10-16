# Specification: 加固后台敏感设置 API 接口的权限验证

## 1. 业务需求 (Requirements)
为了确保不看 (bukan) 影视聚合平台后台管理配置的安全性，需要防止恶意用户通过直接调用 API 接口越权篡改配置。
尽管可以通过中间件（`proxy.ts`）在客户端路由层面实现重定向拦截，但是必须在服务端 API 控制层也进行会话状态校验。
涉及的敏感写操作接口（修改数据库或配置）有：
- `/api/dailymotion-config` (POST)
- `/api/database/test` (POST)
- `/api/player-config` (POST)
- `/api/shorts-sources` (POST, PUT)
- `/api/vod-sources` (POST, PUT)

## 2. 技术设计方案 (Technical Design)
在每个对应 API 的 `route.ts` 中，当收到 POST/PUT 请求时，引入 `lib/auth.ts` 暴露的 `validateSession` 方法来进行鉴权：
1. 调用 `await validateSession()`。
2. 若返回 `false`（未登录或 Cookie 失效），则直接返回 `401 Unauthorized` 响应，阻断后续逻辑。
3. 响应格式为 `{ code: 401, message: '未授权访问' }`（或配合各自 API 的键名，如 `msg` 或 `error`）。
