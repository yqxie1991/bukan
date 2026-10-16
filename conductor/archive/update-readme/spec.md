# Specification: 更新项目 README.md 说明文档匹配当前方案

## 1. 业务需求 (Requirements)
随着项目完成了“空闲写盘频次压制”、“智能分片直连与内存限制性能优化”以及“自动/手动多态主题切换支持”这几个重大的更新，主 README.md 原有的功能特性介绍和群晖部署说明已相对滞后。需更新文档以完全匹配并突出当前方案。

## 2. 技术设计方案 (Technical Design)

### 2.1 功能特性 (Features) 模块更新
* 新增：**多态主题切换** 支持（自动 System 跟随系统、手动 Light 与 Dark 切换，内置 localStorage 持久化及防闪烁技术）。
* 新增：**极致系统资源优化** 亮点（包含空闲写盘压制、Node 代理流量卸载等）。

### 2.2 部署说明 (Deployment Guide) 模块加固
* 在 Docker 部署和群晖优化项中，增补：
  - **空闲写盘压制**（WiredTiger 无 Journal、`--quiet` 日志级别、TS 控制台高频日志过滤）。
  - **CPU 负载与带宽释放**（m3u8 智能分片直连技术，流量直发 CDN 不经本地 Node 中转）。
  - **内存硬限制**（WiredTiger Cache 限制为 256MB，防止 Docker 爆内存）。
  - **安全性与稳定性保障**（防目录穿越漏洞、防止播放器全局监听遗漏内存泄露）。
