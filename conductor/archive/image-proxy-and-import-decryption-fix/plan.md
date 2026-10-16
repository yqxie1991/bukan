# Plan: image-proxy-and-import-decryption-fix

## Phase 1: 解决演示地址图片加载失败与订阅导入解密异常问题
- [x] 任务 1: 重定向外部海报图片至本地代理接口以支持 Edge CDN 缓存加载 2526ac4
- [x] 任务 2: 重构解密路由与前端导入 Tab，支持跨域免密代理拉取与多格式兼容解析 7097f22
- [x] 任务 3: 修复加密订阅链接由于解析为合法 JSON 而被前端明文校验误拦截的问题 c67c97e
- [x] 任务 4: 修正默认管理员密码为 bukan 并更新登录页面提示 0d5b8db
- [x] 任务 5: 修正默认 MongoDB 数据库名称默认值为 bukan 0a7a709
