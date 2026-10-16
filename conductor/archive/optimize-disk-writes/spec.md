# Specification: 优化群晖 Docker 磁盘持续写入

## 1. 问题背景 (Context)
用户在群晖 Synology NAS 上使用 Docker (Container Manager) 部署本项目后，反馈后台一直有持续不断的硬盘读写动作，导致硬盘磁头咔哒作响且无法进入休眠状态，影响硬盘寿命和产生噪音。

## 2. 根因分析 (First Principles Analysis)
* **MongoDB 诊断数据**：MongoDB 的 WiredTiger 引擎默认每 1 秒会把系统诊断指标写入 `diagnostic.data`，造成高频微小盘写。
* **高频健康检查**：`docker-compose.yml` 原配置中 MongoDB 设置了每 10 秒一次的健康检查（`mongosh` 连接），导致数据库日志与 Docker 容器事件日志每 10 秒就在群晖宿主机上追加写入一次。
* **未限制日志体积**：容器控制台的 stdout 实时写入宿主机 JSON 日志中，无限制增长，高频刷写。

## 3. 设计方案 (Proposed Solution)

### 3.1 禁用 MongoDB 诊断日志
在 `mongodb` 服务启动命令中注入参数：
```yaml
command: mongod --setParameter diagnosticDataCollectionEnabled=false
```

### 3.2 优化与弱化健康检查
考虑到 Next.js 具备完善的懒加载和自愈重连机制，无需通过 Compose 引入繁重的健康检测，直接移除 `healthcheck` 段，并将 `app` 对 `mongodb` 的依赖关系从 `service_healthy` 降级为常规的容器启动依赖：
```diff
- depends_on:
-   mongodb:
-     condition: service_healthy
+ depends_on:
+   - mongodb
```

### 3.3 限制 Docker 日志文件大小
为 `app` 和 `mongodb` 统一引入日志限额，防止高频日志在物理磁盘的无序写盘：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
