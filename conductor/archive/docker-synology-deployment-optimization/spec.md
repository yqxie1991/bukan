# Specification: Docker 部署配置升级与群晖兼容性优化

## 1. 业务需求 (Requirements)

项目从 kerkerker 品牌更名为 bukan 后，需要对 Docker 部署配置进行全面升级，同时解决群晖 NAS 用户在实际部署中遇到的多个关键兼容性和稳定性问题：

1. **品牌命名统一**：`docker-compose.yml` 中所有容器名、网络名、卷名从 kerkerker 迁移至 bukan。
2. **群晖 AVX 兼容性**：MongoDB 5.0+ 要求 CPU 支持 AVX 指令集，绝大多数群晖 CPU（J3455、J4125、N5105 等）不支持，导致 `mongo:7` 容器启动后反复闪退。
3. **数据卷命名冲突**：旧版 MongoDB 数据卷在切换 mongo 版本后可能导致 WiredTiger 引擎冲突。
4. **部署文档缺失**：README.md 缺少面向群晖 DSM 用户的详细部署步骤说明。
5. **安全合规**：作为公开项目，默认管理员密码应设为已知值（bukan）并附带醒目的修改提醒。
6. **CI/CD 完善**：GitHub Actions 需添加容器元数据标签，使 Packages 页面能自动关联到仓库。

## 2. 技术设计方案 (Technical Design)

### 2.1 docker-compose.yml 品牌命名升级
* 所有 `kerkerker-*` 命名（container_name、network、volume）统一更换为 `bukan-*`。
* 镜像地址更新为 `ghcr.io/yqxie1991/bukan:v2.0`，并附带版本号修改提醒。

### 2.2 群晖 AVX 兼容性修复
* 将 MongoDB 默认镜像从 `mongo:7` 修改为 `mongo:4.4`，彻底解决无 AVX 指令集 CPU 的闪退问题。
* 在 docker-compose.yml 中保留详细的 AVX 兼容性说明注释。

### 2.3 数据卷版本化命名
* MongoDB 数据卷从 `mongodb-data` / `mongodb-config` 升级为 `bukan-mongodb-data-v1` / `bukan-mongodb-config-v1`。
* 防范从 mongo:7 降级到 mongo:4.4 时因 WiredTiger 存储引擎版本不兼容导致的启动失败。

### 2.4 安全配置
* 默认管理员密码设为 `bukan`，并在 docker-compose.yml 和 README.md 中添加醒目的安全警告。

### 2.5 README.md 群晖部署文档
* 新增详细的群晖 DSM Container Manager 部署步骤。
* 包含 docker-compose 配置说明和注意事项。

### 2.6 GitHub Actions CI 配置
* 在构建工作流中添加 `org.opencontainers.image.source` 标签。
* 实现 Packages 页面与 GitHub 仓库的自动关联。

### 2.7 注释清理
* 清理多余的 `👈` 箭头注释，保持配置文件简洁专业。
