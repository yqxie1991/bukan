# Specification: 修正主 README.md 文档中的项目名称为“不看”

## 1. 业务需求 (Requirements)
项目实际名称已正式修改为“不看 (bukan)”，但 `README.md` 的标题、正文及部分部署路径中仍残留历史开发代号 "Kerkerker"。需对其进行系统化梳理和替换，确保文档统一和产品信息准确。

## 2. 技术设计方案 (Technical Design)

### 2.1 README.md 文档更名范围
* **标题与小标**:
  - 将 `# 🎬 Kerkerker - 影视资源聚合平台` 修正为 `# 🎬 不看 (bukan) - 影视资源聚合平台`。
  - 将副标题等处进行对应修改。
* **部署路径与命令**:
  - 本地 git 克隆、cd 目录、VPS 部署路径等可适当引导用户使用 `bukan`，例如 `cd bukan`、`~/bukan`（但若作为底层系统变量名或工程目录名 `kerkerker` 暂时可以保留或兼容说明，主文档表意要全面指向“不看”）。
  - 在目录结构图示中，将 `kerkerker/` 更正为 `bukan/` 或说明其为开发目录名。
