# Plan: system-resource-optimization

## Phase 1: 安全防御与内存泄露修复
- [x] 任务 1: 修复 `image-proxy` 路径穿越安全漏洞、视频属性行代理遗漏及播放器组件销毁逻辑 8da6fa7

## Phase 2: 空闲盘写压制
- [x] 任务 2: 禁用 MongoDB 预写 Journal 及网络连接日志以极大降低空闲写盘频次，并清理视频代理接口高频 TS 切片日志 9514e13

## Phase 3: 本地资源与带宽开销极致削减
- [x] 任务 3: 实现视频分片智能协议直连、海报全面客户端 CDN 代理及限制 MongoDB 内存 Cache 为 256MB 0b40f9b
