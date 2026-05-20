---
title: CodeBuddy 无头进程与并发（现状）
summary: Paperclip 调度 codebuddy_local 时的进程模型与排障入口
---

**真源：** 配置字段与默认 CLI 见 [`10 CodeBuddy 本地适配器 codebuddy-local.md`](10%20CodeBuddy%20本地适配器%20codebuddy-local.md)。本文只描述 **Paperclip 侧现状**，不收录未在 CodeBuddy 官方 CLI 文档中证实的启动参数。

## 进程模型（现状）

| 项 | 行为 |
| --- | --- |
| 粒度 | **每个 heartbeat / 指派 run** 由适配器 `spawn` **一个** `codebuddy` 子进程 |
| 复用 | **无**全局常驻单例；会话上下文靠 `--resume` + 持久化的 `session_id` |
| 工作目录 | 与执行工作区 `cwd` 绑定；目录变更则丢弃旧会话 |
| 收尾 | 见到流式 `type:result` 后按 `terminalResultCleanupGraceMs`（默认 5000ms）等待退出；超时/快停见 10 号文档 §059 |

## 减轻无头空转（适配器内置）

`applyDefaultCodebuddyHeadlessEnv` 默认为 `true` 时，子进程 env 注入（可被 `adapter_config.env` 覆盖）：

- `CODEBUDDY_DISABLE_CRON=1`
- `CODEBUDDY_DISABLE_HOT_RELOAD=1`

**不要**在 `extraArgs` 中随意添加 `--no-watch`、`--single-worker` 等未在本机 `codebuddy --help` 证实的开关；无效参数会导致 run 直接失败（见 `07` 探查纪要）。

## CPU / 多 node 现象时怎么查

1. **并发：** Board 上同时跑几个 CodeBuddy agent？单 agent 的 `maxConcurrentRuns` 是否大于 1？优先改为串行或降低并发。
2. **滞留：** run 已结束但 OS 仍有多余 `node`/`codebuddy` → 查运行详情是否卡在收尾宽限、或 `process_lost` / 手动 kill 链（`07 测试与排障`）。
3. **止血（本机运维）：** 确认无在跑事务后，再清理孤儿进程；勿在仍有 active run 时 `taskkill` 全量 node。

## 与「追加 CLI 参数」的关系

`extraArgs` 会拼在适配器固定 argv **之后**。仅用于 **CodeBuddy 官方文档存在** 的参数；Paperclip 无头默认已含 `--print`、`--output-format stream-json`、`-y` 等，重复或冲突参数需自行承担风险。
