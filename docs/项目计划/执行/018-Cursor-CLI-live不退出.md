---
id: exec-007-cursor-cli-stuck
parent: ../00.项目任务清单.md
legacy_ref: "007"
status: 已完成
updated: "2004-05-14"
---

# 018 — 任务已结束，Cursor CLI / live 仍不退出，只能手动停

**返回：**[`../00.项目任务清单.md`](../00.项目任务清单.md)

## 元数据（自原索引迁入）

| 字段 | 内容 |
|------|------|
| 负责人 | AI |
| 状态 | 已完成 |
| 下一步 | 结论：**issue `done` 与 run 行仍 `running` 不同步** 多见于 (1) Board/agent 先 PATCH 关单，heartbeat 里 `setRunStatus`（`heartbeat.ts` ~7838）尚未落库或续跑插队；(2) 恢复/continuation 在 issue 已闭后仍排队（例 ROU-18）；(3) **adapter_failed**（Cursor 池子/额度）时 CLI 进程与 DB 状态解耦。**OS 侧**：Windows 子进程树未全杀时 CLI 仍「活着」。未改产品代码 |
| 证据 | 代码：`server/src/services/heartbeat.ts`；Board：ROU-18 |

## 说明

本单由原 `00.项目任务清单.md` 索引 **007** 行拆出；`00` 仅保留索引，详单以本文件为准。
