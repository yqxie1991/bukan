# Specification: 解决演示地址图片加载失败与订阅导入解密异常问题

## 1. 业务需求 (Requirements)
确保在在线演示地址（Vercel 部署环境）和国内直连环境下：
- 豆瓣电影海报及详情页图片能够 100% 正常显示并快速加载。
- 用户能够直接输入各类明文/加密的第三方订阅链接并点击“解析预览”顺利导入配置，无论是否有密码保护。

## 2. 技术设计方案 (Technical Design)

### 2.1 图片代理重定向
1. 修改 `lib/utils/image-utils.ts` 的 `getImageUrl`。
2. 识别为外部 URL 时，不再拼接 `https://images.weserv.nl/` 供客户端直接加载，而是代理请求至本地的 `/api/image-proxy?url=...`。
3. 利用本地的图片中转路由依次调用代理池（`wsrv.link0.me`、`weserv.nl` 或带 `Referer: https://movie.douban.com/` 头的直连 fetch），确保必定能获取到防盗链海报，并在 Vercel Edge 节点级别通过 `Cache-Control: public, max-age=31536000` 将图片缓存，以零带宽消耗和极速的载入响应网页图片。

### 2.2 服务端代理拉取与免密兼容解密
1. 修改加解密路由 `app/api/decrypt/route.ts`。
2. 客户端在 `subscriptionUrl` 请求中就算没有 `password`，后端也要去 fetch 该 URL 配置。
3. 用 `JSON.parse` 对内容进行明文解析或 Base64 解码，若是加密格式但无密码则提示错误；若是明文格式（比如 TVBox JSON、数组等）则绕开解密，将明文数据作为成功数据透传返回给前端。
4. 前端修改三个 Tab 组件（`VodSourcesTab`、`ShortsSourcesTab`、`DailymotionChannelsTab`），在输入是订阅链接时即使密码为空也不做前端错误拦截，统一交由 `/api/decrypt` 处理。
5. 前端获取到解密后/代理拉取回的 Payload 后，利用统一的多格式解析提取代码（支持打包格式、sources字段、sites字段和列表格式）适配并预览展示。
