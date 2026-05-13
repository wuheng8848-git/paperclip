# Requirements

## User

**吴衡** — 一个人 + 一群 AI，建一家可复制的软件开发公司。

当前痛点：
- 手动管理多个 agent 的状态、任务分配、执行追踪——没有统一控制平面
- 不知道 agent 在干什么、花了多少钱、产出是什么
- 每次启动 agent 都要手动操作：创建 issue → checkout → 启动进程 → 盯心跳
- 贾维斯（CEO/策略层）和赫尔墨斯（信使/路由层）缺少可靠的执行平面

## Outcome

当 Paperclip 在当前环境中就绪时：
- routic 公司的 agent（b064fe96 Cursor agent）可以通过心跳自动拉取 queued run 并执行
- 完整的 issue→checkout→heartbeat→run→completion 链路跑通至少一次
- 吴衡可以通过 Paperclip Board UI 看到：谁在干什么、花了多少钱、产出是什么
- 僵尸 run 能被识别和清理（不会堆积阻塞后续任务）

**不应改变：**
- Paperclip 上游代码的核心行为（这是 fork，不是上游贡献）
- 现有数据库结构和 API 契约
- 已有的 routic 公司配置和 agent 定义

## Scope

### In

- 理解 Paperclip 完整生命周期：company → agent → issue → checkout → heartbeat → run → done
- routic 公司（cc098628-d91e-4e10-b4e4-000a6c822946）的 agent 心跳验证
- 端到端执行一次完整任务（创建 issue → agent 自动拉取 → 执行 → 完成）
- 僵尸 run 诊断与清理流程
- 本地开发环境稳定性（端口 3100，PGlite，避开 NTFS 坑）

### Out

- Paperclip 上游新功能开发
- Cloud 部署 / 多用户认证
- 新 adapter 开发
- 生产环境配置
- 向 upstream 提交 PR

## Open Questions

- Paperclip 当前 fork 的 Hermes 外置化分支是否稳定？是否切到 `feat/externalize-hermes-adapter`？
- routic 公司的 agent b064fe96（Composer 2 Fast）是否需要重新配置 adapter？
- 心跳轮询间隔多少合适？当前是否有僵尸 run 需要手动清理？
- 贾维斯和赫尔墨斯通过什么接口对接 Paperclip？API key 还是直接数据库操作？
