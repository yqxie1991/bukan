# Plan: optimize-disk-writes

## Phase 1: 磁盘持续读写根因诊断
- [x] 任务 1: 分析项目数据库 MongoDB 及 Next.js 运行机制，定位高频写盘源头 <!-- SHA: c82f79f -->
- [x] 任务 2: 评估 Docker 容器健康检查（10s 一次）对群晖宿主机日志写入的影响 <!-- SHA: c82f79f -->

## Phase 2: 优化配置实施
- [x] 任务 3: 修改 `docker-compose.yml`，增加 `diagnosticDataCollectionEnabled=false`，移除 `healthcheck` 块并限制日志大小 <!-- SHA: c82f79f -->
- [x] 任务 4: 同步更新生产环境 `docker-compose.server.yml` 和开发环境 `docker-compose.dev.yml` <!-- SHA: c82f79f -->

## Phase 3: 验证与推送
- [x] 任务 5: 在本地验证配置文件语法，保证无报错 <!-- SHA: c82f79f -->
- [x] 任务 6: 提交更改并 `git push` 到远程 GitHub 仓库 <!-- SHA: c82f79f -->

## Phase: Review Fixes
- [x] Task: Apply review suggestions 425b040
