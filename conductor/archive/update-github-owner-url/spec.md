# Specification: 更新 README.md 中的 GitHub 用户名由 unilei 为 yqxie1991

## 1. 业务需求 (Requirements)
在推送至远程 GitHub 时，日志表明仓库真实归属于用户 `yqxie1991`（即 `https://github.com/yqxie1991/bukan`），而非旧代号 `unilei`。为防范外部一键部署及克隆 404，需将 README.md 中涉及 `unilei` 的地址全部替换为 `yqxie1991`。

## 2. 技术设计方案 (Technical Design)

### 2.1 README.md 链接更新范围
* **Vercel 一键部署**:
  - 修改为: `https://vercel.com/new/clone?repository-url=https://github.com/yqxie1991/bukan`
* **克隆命令**:
  - 修改为: `git clone https://github.com/yqxie1991/bukan.git`
* **VPS 部署脚本下载地址**:
  - 修改为: `https://raw.githubusercontent.com/yqxie1991/bukan/master/scripts/install.sh`
