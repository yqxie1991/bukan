# Track Index: docker-synology-deployment-optimization

## 轨道元数据
- **任务轨道 ID**: `docker-synology-deployment-optimization`
- **任务轨道名称**: Docker 部署配置升级与群晖兼容性优化
- **当前状态**: `[x] 已完成`
- **优先级**: `High`
- **创建日期**: 2026-06-12
- **关联规范**: [product-guidelines.md](../../product-guidelines.md)

## 说明
本轨道为回溯性补录，统一管理项目从 kerkerker 到 bukan 品牌迁移过程中涉及的所有 Docker 部署配置变更、群晖 NAS 兼容性修复、部署文档编写及 CI/CD 优化工作。涵盖以下核心改进：
1. **docker-compose.yml 品牌命名升级**：全面替换容器名、卷名、网络名为 bukan 命名空间。
2. **群晖 AVX 兼容性修复**：将 MongoDB 默认镜像降级为 mongo:4.4 以兼容无 AVX 指令集的群晖 CPU。
3. **数据卷版本化**：升级卷名以防范 WiredTiger 引擎版本冲突。
4. **部署文档与安全提醒**：为 README.md 添加群晖 DSM 部署指南和密码修改警告。
5. **CI/CD 容器元数据标签**：在 GitHub Actions 中添加 OCI 标签实现 Packages 与仓库自动关联。
