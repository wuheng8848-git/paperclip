---
status: 已完成
---

# 运行详情深链、适配器 JSON 宽松落盘与 `resultJson` 原样读出

**母本（长期需求）：** [`../长期需求/27 适配器执行与异步解析器拆分-长期需求 2026-05-18.md`](../长期需求/27%20适配器执行与异步解析器拆分-长期需求%202026-05-18.md)

本轮落地与 **§2 目标架构** 中「适配器将原始输出完整落库、**不把结构化解析失败等同于执行失败**」及 **§3 条文 1**「执行成功与解析成功解耦」**方向一致**：先在 **CodeBuddy / Qwen** 适配器与控制面 **读库** 打通「exit 0 即执行可记成功路径 + 原始流进 `resultJson`」；**独立异步解析器组件**仍按母本分期，未在本单实现。

## 目标（本轮已落地）

1. **智能体运行详情**：支持「URL 带 `runId` 但近期列表未含该条」时仍能拉详情；桌面端带 `runId` 时补充返回「运行列表 / 控制台」导航。
2. **CodeBuddy / Qwen 本地适配器**：CLI **退出码 0** 但无法从 `--print` / `-o json|stream-json` 输出中解析到终结 `result` 时，**不再**将整次 run 记为适配器解析失败；以 **原始 stdout/stderr 写入 `resultJson`** 为准。
3. **服务端读库**：`getRun` 对 `heartbeat_runs.result_json` **不再做 SQL 层「超 64KB 则裁成缩略 JSON」**投影，详情接口返回**与库内一致**的 JSON（UTF-8 库；`SQL_ASCII` 保守路径不变）。

**未改**：`cursor_local` 适配器（按约定本轮不动）。

## 代码与路径索引

| 区域 | 路径 | 摘要 |
| --- | --- | --- |
| UI 运行 tab | `ui/src/pages/AgentDetail.tsx` | `RunsTab`：`selectedRunId` 不在 `heartbeats` 列表时用 `heartbeatsApi.get(runId)` 拉取；错误/加载态；桌面列表为空但详情有数据时单栏展示；`urlRunId && !isMobile` 时标题下导航链 |
| UI 文案 | `ui/src/lib/i18n.ts` | `agentDetailUi`：`runDetailLoading`、`runNotFound`、`runWrongAgentPage`、`openRunOnCorrectAgent`、`runDetailNotInRecentList` 等 |
| CodeBuddy | `packages/adapters/codebuddy-local/src/server/execute.ts` | `!resultJson` 且 `exitCode===0` → 成功 + `codebuddyParseSkipped` + 原始流；非 0 → `codebuddy_execution_error` + 摘录 |
| CodeBuddy 测 | `packages/adapters/codebuddy-local/src/server/execute.test.ts` | `buildParseSkippedSummary` |
| Qwen | `packages/adapters/qwen-local/src/server/execute.ts` | 同上逻辑，`qwenParseSkipped`；废除 **`qwen_parse_error`**（成功路径） |
| Qwen 测 | `packages/adapters/qwen-local/src/server/execute.test.ts` | `buildQwenParseSkippedSummary` |
| 心跳服务 | `server/src/services/heartbeat.ts` | 删除 `heartbeatRunSafeResultJsonColumn` 大段 `CASE/jsonb_build_object`；`heartbeatRunSafeColumns` 与表列一致 |
| 心跳测 | `server/src/__tests__/heartbeat-list.test.ts` | 超大 `resultJson` 的 `getRun` 期望改为**全量相等** |

## 关联任务单（口径对齐，非重复劳动）

- **长期需求母本：** [`27 适配器执行与异步解析器拆分-长期需求 2026-05-18.md`](../长期需求/27%20适配器执行与异步解析器拆分-长期需求%202026-05-18.md)（架构条文；055 为其中一节分期落地）。
- [`047-适配器_stdout解析失败与结构化摘要.md`](047-适配器_stdout解析失败与结构化摘要.md)（与本母本 **047 技术设计**、**27** 中 **047/C1** 同向；055 为当期「先不截断、先不因 parse 判死」的落地子步）。

## 验证证据

| 检查 | 命令 / 结论 |
| --- | --- |
| UI 包 `tsc` | `pnpm exec tsc --noEmit -p ui`（或等效）通过 |
| CodeBuddy adapter | `pnpm exec vitest run packages/adapters/codebuddy-local/src/server/execute.test.ts` |
| Qwen adapter | `pnpm exec vitest run packages/adapters/qwen-local/src/server/execute.test.ts` |
| Server | `pnpm exec tsc --noEmit -p server`；`pnpm exec vitest run server/src/__tests__/heartbeat-list.test.ts` |

## 残留与后续（可选）

- **列表接口** `heartbeatService.list` 仍为摘要型拼装 `resultJson`，非整库字段；全量以 **单条 run 详情** 为准。
- **047** 母本中的 NDJSON/分段/磁盘 spill 等未在本单实现，仍归 **047** 或其它执行单。
