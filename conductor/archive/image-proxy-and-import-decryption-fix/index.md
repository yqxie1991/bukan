# Track Index: image-proxy-and-import-decryption-fix

## 轨道元数据
- **任务轨道 ID**: `image-proxy-and-import-decryption-fix`
- **任务轨道名称**: 解决演示地址图片加载失败与订阅导入解密异常问题
- **当前状态**: `[x] 已完成`
- **优先级**: `High`
- **创建日期**: 2026-06-12
- **关联规范**: [product-guidelines.md](../../product-guidelines.md)

## 说明
用户在部署及在线演示平台测试中遇到两个关键问题：
1. **大量图片无法显示**：豆瓣封面图国内访问 `images.weserv.nl` 时由于网络环境限制导致裂图，需要走本地图片代理，并利用 Edge CDN 缓存实现加速。
2. **导入链接解密失败**：在前端直接拉取订阅 URL 产生 CORS 跨域错误，且在没有密码的情况下无法正常导入明文订阅配置。需要通过服务端代理免密拉取并自动兼容各种格式配置。
