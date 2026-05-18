# 026 — 探查：工单「为何出现」— API / 数据库 / UI / 文档对照情报

**范围：** §1–§7 为仓库静态对照；§8 起可挂 **实例取证附录**（与本节方法论交叉验证）。

---

## 1）数据库（真源：`packages/db/src/schema/issues.ts`）

| 列（PostgreSQL） | 用途 |
| --- | --- |
| `origin_kind` | 内置枚举见 `packages/shared/src/constants.ts` **`ISSUE_ORIGIN_KINDS`**：`manual`、`routine_execution`、`stale_active_run_evaluation`、`harness_liveness_escalation`、`issue_productivity_review`、`stranded_issue_recovery`；另有 **`plugin:*:operation`** 形态 |
| `origin_id` | 语义随 kind（例行触发 ID、源 issue UUID、`runId` 等）；部分唯一索引防重复开单 |
| `origin_run_id` | 可选，追溯到具体跑次 |
| `origin_fingerprint` | 去重/变体键（默认 `default`）；生产力复核、关系图叶子等有分支指纹 |
| `parent_id` | 父子单；滞留回收 / 监控恢复子单常指向源单 |

**recovery 常量别名：** `server/src/services/recovery/origins.ts` **`RECOVERY_ORIGIN_KINDS`** 与上表四类自动化 origin 对齐。

---

## 2）API（取证顺序）

| 步骤 | 方法 | 说明 |
| --- | --- | --- |
| ① | `GET /api/issues/{identifier \| uuid}` | JSON 含 **`companyId`、`originKind`、`originId`、`parentId`、`identifier`** 等；与脚本 **`pnpm issue:forensics`** 对齐前先确认 **`companyId`** |
| ② | `GET /api/issues/{ref}/activity` | 创建后与闸门相关的 **`action`**（见 §4） |
| ③ | `GET /api/issues/{ref}/runs` + `GET /api/heartbeat-runs/{runId}` | 唤醒链、`wakeReason`；见 **[002](../最佳实践/002-实践-工单运行记录API取证路径.md)** |
| ④ | `GET /api/companies/{companyId}/activity` | 公司宽表；**`pnpm activity:company`**，见 **[012](../最佳实践/012-实践-回形针外部开发工具与排障流水线.md)** |
| ⑤ | `GET /api/issues?originKind=…` | 列表筛选（Board 列表同源）；`originKindPrefix` 供插件 operation |

**编排节拍入口（对照闸门）：** `server/src/index.ts` 在 **`heartbeatSchedulerEnabled`** 下：`reconcileStrandedAssignedIssues` → `reconcileIssueGraphLiveness` → `scanSilentActiveRuns` → `reconcileProductivityReviews`；例行并行 **`routineService.tickScheduledTriggers`**。

---

## 3）`originKind` → 编排闸门表行 → 服务端落点（摘要）

编排闸门页文案来自 **`ui/src/lib/i18n.ts`** **`orchestrationGatesRows`**；代码锚点如下。

| `originKind` | 闸门页近似行 | 服务端（优先读） |
| --- | --- | --- |
| `manual` | （非自动化） | `server/src/routes/issues.ts` POST 创建、`issue.created` |
| `routine_execution` | 例行计划到点 | `server/src/services/routines.ts` **`tickScheduledTriggers`** |
| `stranded_issue_recovery` | 滞留回收 **或** 执行盯梢 recovery | **`ensureStrandedIssueRecoveryIssue`**、`reconcileStrandedAssignedIssues`；监控路径另见 **`performIssueMonitorRecovery`**（`recoveryPolicy=create_recovery_issue`），与滞留 **同源 `originKind`**，靠 **`originFingerprint`**（如 `issue_monitor:…`）、标题与活动 **`issue.monitor_recovery_issue_created`** 区分 |
| `harness_liveness_escalation` | 关系图活性对账 | `recovery/service.ts` **`reconcileIssueGraphLiveness`**、`recovery/issue-graph-liveness.ts` |
| `stale_active_run_evaluation` | 活跃无输出盯梢 | `recovery/service.ts` **`scanSilentActiveRuns`** |
| `issue_productivity_review` | 产出纠偏 | `server/src/services/productivity-review.ts` **`reconcileProductivityReviews`** |

**插件：** `plugin:*:operation` — 插件宿主创建路径，见 `plugin-host-services` / 路由；闸门表未单列。

---

## 4）活动日志 `action` 线索（非穷尽）

| `action`（示例） | 大致含义 |
| --- | --- |
| `issue.created` | 人工/API/插件等创建 |
| `issue.harness_liveness_escalation_created` | 关系图活性升级单 |
| `issue.productivity_review_created` / `_updated` / `_continuation_held` | 产出纠偏 |
| `issue.monitor_recovery_issue_created` | 执行盯梢 recovery 子单 |
| `heartbeat.watchdog_*` | 静默活跃 run 盯梢决策 |
| `source: recovery.scan_silent_active_runs` | 出现在 **`details.source`**（与其它 recovery 日志同读） |

滞留回收路径多见 **`issue.updated` / `issue.blockers.updated`** 配合 **`details`**；合订叙事见 **[001](001-探查-活动日志异常汇总.md)**、**[018](018-探查-agent-pause-checkout-recovery链路与止损结论.md)**。

---

## 5）UI（`ui/src/pages/IssueDetail.tsx`）

| 可见线索 | 覆盖 `originKind` |
| --- | --- |
| 例行芯片 + 链到 `/routines/{originId}` | **`routine_execution`** |
| 产出纠偏芯片 / `ProductivityReviewBadge` | **`issue_productivity_review`**（及关联 **`productivityReview`** 载荷） |
| **无**专用芯片 | **`stranded_issue_recovery`、`stale_active_run_evaluation`、`harness_liveness_escalation`** —— 须靠详情字段或活动/API |

收件箱过滤Routine：`ui/src/lib/inbox.ts`、`issue-filters.ts`（隐藏 `routine_execution` 选项）。

---

## 6）文档索引（人类读本）

| 类型 | 路径 |
| --- | --- |
| 取证流水线 / 脚本 | **[012](../最佳实践/012-实践-回形针外部开发工具与排障流水线.md)**、**[002](../最佳实践/002-实践-工单运行记录API取证路径.md)** |
| 心跳 / 活动顺序 | **[004](../最佳实践/004-实践-工单心跳与僵尸run排障.md)** |
| 闸门 vs 单次 run | **[018](../最佳实践/018-实践-排障-run与token多轮.md)** §4 |
| 库表列清单 | **[013](../最佳实践/013-实践-编排平面AI查数据脚手架.md)**、`docs/项目计划/执行/orchestration-schema-snapshot.json` |
| 运行时索引 | **[../系统逻辑/README.md](../系统逻辑/README.md)** |
| 滞留回收个案范式 | **[020](020-探查-ROU-44滞留回收单与ROU-41收口链.md)** |

---

## 7）下一手（对任意工单）

1. `GET /api/issues/<ref>` → **`originKind` + `parentId` + `originFingerprint`**  
2. `pnpm issue:forensics -- --company <uuid> --issue <ref> --issue-activity`  
3. 按 §3 打开对应 `server` 文件核对触发条件  
4. DB 直查：`SELECT origin_kind, origin_id, parent_id, origin_fingerprint FROM issues WHERE identifier = '…';`

---

## 8）实例附录：`ROU-105`（2026-05-18 本机 API 取证）

**取证命令：** `GET http://127.0.0.1:3100/api/issues/ROU-105`；`pnpm issue:forensics -- --company cc098628-d91e-4e10-b4e4-000a6c822946 --issue ROU-105 --issue-activity`。

| 字段 | 值 |
| --- | --- |
| `identifier` | `ROU-105` |
| `id` | `8abafd61-4e77-41c0-a38a-bac882da7522` |
| `companyId` | `cc098628-d91e-4e10-b4e4-000a6c822946` |
| `parentId` / 父单 | `3352e109-4846-43e7-a11d-b898c947251e` → **`ROU-98`** |
| `originKind` | **`stranded_issue_recovery`** |
| `originId` | 与 **`parentId`** 同（源单 UUID） |
| `originRunId` | `f4cd3670-3e0f-4a2b-84c3-bd83d395fdd8`（描述中称 corrective handoff run） |
| `originFingerprint`（摘要） | 含 **`successful_run_missing_state`**、源单 UUID、上述 runId |
| 描述内归因 | **`Normalized cause: successful_run_missing_state`**；**`Missing disposition: clear_next_step`** |
| 描述内源 run | `98a4e17c-b335-475f-9299-4ff31adaec25` |
| 工单状态（取证时） | **`cancelled`**（`cancelledAt` ≈ `2026-05-18T06:50:09.866Z`） |

**编排闸门对照：** **滞留回收**（`orchestrationGatesRows` **`stranded-recovery`**）；服务端 **`reconcileStrandedAssignedIssues` → `ensureStrandedIssueRecoveryIssue`** 一脉；本指纹区分于「执行盯梢 recovery」：`originFingerprint` **不以** `issue_monitor:` 开头，且无 **`issue.monitor_recovery_issue_created`** 活动预期。

**活动面备注：** `GET /api/issues/ROU-105/activity` 当次仅 **4** 条（含指派变更、`cancelled`、`read_marked` 等），**未见** `issue.created`；归因以 issue 详情 **`originKind` / `originFingerprint` / 正文** 为主。

**runs 面备注（待查）：** `issue:forensics` 曾列出一条 **`running` + `heartbeat_timer`** 与 **`cancelled`** 工单并存；若再现需对该 **`runId`** 调 **`GET /api/heartbeat-runs/{id}`** 与 **[004](../最佳实践/004-实践-工单心跳与僵尸run排障.md)** 对账。

---

上级：[探查 README](README.md) · [最佳实践 README](../最佳实践/README.md)
