# Specification: 更新 README.md 中的 GitHub 仓库链接与部署地址为 bukan

## 1. 业务需求 (Requirements)
GitHub 仓库已正式更名为 `bukan`。为防范外部一键部署、本地克隆说明以及 VPS 一键安装因仓库名变更或旧路径未做重定向而失效，需要将主 `README.md` 中的所有 `kerkerker` 仓库链接更改为 `bukan`。

## 2. 技术设计方案 (Technical Design)

### 2.1 README.md 链接更新范围
* **Vercel 一键部署按钮**:
  - 原链接: `https://vercel.com/new/clone?repository-url=https://github.com/unilei/kerkerker`
  - 修改为: `https://vercel.com/new/clone?repository-url=https://github.com/unilei/bukan`
* **本地克隆示例**:
  - 原示例: `git clone https://github.com/unilei/kerkerker.git bukan`
  - 修改为: `git clone https://github.com/unilei/bukan.git` (由于仓库已更名为 bukan，克隆下来默认就是 bukan 文件夹，所以可直接使用原 clone 格式，无需末尾指定 bukan 目录，这也让说明更加干净)。
* **VPS 一键安装脚本路径**:
  - 原 curl / wget 路径中的 `raw.githubusercontent.com/unilei/kerkerker`
  - 修改为: `raw.githubusercontent.com/unilei/bukan`
