# 数据面查证

**用途：** 不依赖 Board UI，直接查 **Postgres** 里的公司、智能体、事务、run、活动；API 在线时可用等价路由或 **`pnpm issue:forensics`** 加速。**以 DB 行为准**；个案长表与归因仍在 [`../探查/`](../探查/README.md)。

**AI 列清单与七表字典：** [`013-实践-编排平面AI查数据脚手架`](../项目计划/最佳实践/013-实践-编排平面AI查数据脚手架.md) · [`orchestration-schema-snapshot.json`](../项目计划/执行/orchestration-schema-snapshot.json)

---

## 1. 连接与 `DATABASE_URL`

### 1.1 按优先级解析

1. 当前 shell 已 **`export DATABASE_URL`**
2. **仓库根** `.env`（见 [11 本地运维](11%20本地运维%20local-instance-ops.md)）
3. **`%USERPROFILE%\.paperclip\instances\default\.env`**

忽略空行与 `#` 注释；值两端引号读入后去掉。连不上先起 Compose **`db`**，端口以 compose 映射为准，勿假定 5432。

### 1.2 连库方式

- **`psql "$DATABASE_URL" -c '…'`**
- 任意 Postgres 客户端（DBeaver、pgAdmin）
- 一次性 **`postgres`（js）** 脚本：`import postgres from "postgres"` → `await sql\`…\`` → `await sql.end()`

### 1.3 服务进程「没带」库地址时

说的是 Node 里**没有有效 `DATABASE_URL`**，退回内嵌 Postgres（日志 *no DATABASE_URL / embedded*）。**不是** PowerShell `echo` 空不空——常见原因：三处都没写、cwd/实例路径不对、`.env` 格式错误。**验收：** 看启动日志是否仍说「用内嵌库」。链路见 **`server/src/config.ts`** 与 [11 本地运维](11%20本地运维%20local-instance-ops.md)。

### 1.4 Key 与库实例

`agent_api_keys` / `board_api_keys` 与业务表在**同一颗 Postgres**；连容器就查容器里的 Key，误连内嵌则 Key 在内嵌里——删内嵌数据目录不会删容器 Key。

---

## 2. 核心表（编排平面）

| 表 | 查什么 |
| --- | --- |
| **`companies`** | 租户；`issue_prefix` 常比 `name` 更稳 |
| **`agents`** | `adapter_type`、`adapter_config`、`runtime_config`、暂停 |
| **`issues`** | 事务状态、`identifier`、`checkout_run_id` / `execution_run_id` |
| **`heartbeat_runs`** | 单次 run：`status`、`error_code`、`context_snapshot`（含 **`issueId`**）、`process_pid` |
| **`heartbeat_run_events`** | run 事件流（`event_type`、`payload`） |
| **`activity_log`** | 编排突变：`action`、`actor`、`run_id`、`details` |
| **`issue_comments`** | 评论；`created_by_run_id` 绑定 run |
| **`agent_wakeup_requests`** | 唤醒队列；与 timer 退让、`skipped` 原因对账 |

**拼现场：** `issues` ↔ `heartbeat_runs`（`execution_run_id` 或 `context_snapshot.issueId`）↔ `heartbeat_run_events`；控制面写了啥 ↔ `activity_log`。

**纪律：** 查询默认带 **`company_id`**；JSON 键以代码写入为准，勿臆造；`adapter_config.env` 含 Key 时**禁止**原样贴协作聊天。

---

## 3. 公司与智能体（SQL）

**按前缀找公司：**

```sql
SELECT id, name, issue_prefix FROM companies
WHERE name ILIKE '%routic%' OR issue_prefix IN ('ROU', 'ROUA')
ORDER BY name;
```

**某公司下全部 agent：**

```sql
SELECT id, name, role, title, status, adapter_type, paused_at, pause_reason,
       adapter_config, runtime_config
FROM agents
WHERE company_id = '<company_uuid>'
ORDER BY name;
```

**读完检查单：** `adapter_type` / `command` / `model` 是否符合预期；`paused_at` 非空则心搏开着也不会执行；多家同名公司以 `issue_prefix` + agent 数量区分空壳。

---

## 4. 事务与 run（SQL）

**按人类标识找事务：**

```sql
SELECT id, identifier, status, assignee_agent_id,
       checkout_run_id, execution_run_id, completed_at, cancelled_at
FROM issues
WHERE company_id = '<company_uuid>' AND identifier = 'ROU-20';
```

**某事务相关的 runs**（`context_snapshot.issueId`；与 API `runsForIssue` 同思路，可能多于 `execution_run_id` 一条）：

```sql
SELECT id, status, agent_id, invocation_source, error_code,
       LEFT(error, 200) AS error_preview,
       context_snapshot->>'wakeReason' AS wake_reason,
       context_snapshot->>'issueId' AS issue_id,
       retry_of_run_id, process_loss_retry_count, process_pid,
       created_at, finished_at
FROM heartbeat_runs
WHERE company_id = '<company_uuid>'
  AND context_snapshot->>'issueId' = '<issue_uuid>'
ORDER BY created_at;
```

**仍在排队 / 运行（僵尸 run 入口）：**

```sql
SELECT id, agent_id, status,
       context_snapshot->>'issueId' AS issue_id,
       process_pid, created_at
FROM heartbeat_runs
WHERE company_id = '<company_uuid>'
  AND status IN ('queued', 'running')
ORDER BY created_at DESC;
```

**某 agent 最近 runs：**

```sql
SELECT id, status, error_code, invocation_source,
       context_snapshot->>'issueId' AS issue_id,
       context_snapshot->>'wakeReason' AS wake_reason,
       created_at
FROM heartbeat_runs
WHERE company_id = '<company_uuid>' AND agent_id = '<agent_uuid>'
ORDER BY created_at DESC
LIMIT 50;
```

**活动日志（某事务）：**

```sql
SELECT created_at, action, actor, run_id, details
FROM activity_log
WHERE company_id = '<company_uuid>'
  AND entity_type = 'issue' AND entity_id = '<issue_uuid>'
ORDER BY created_at DESC
LIMIT 80;
```

**run 事件（节选）：**

```sql
SELECT seq, event_type, LEFT(payload::text, 300) AS payload_preview, created_at
FROM heartbeat_run_events
WHERE run_id = '<run_uuid>'
ORDER BY seq;
```

---

## 5. 典型场景

### 5.1 僵尸 run（事务已完，run 仍 `queued` / `running`）

1. 用 §4 **仍在排队/运行** SQL 列出目标。
2. **取消**须走 API：`POST /api/heartbeat-runs/{id}/cancel`（或 Board 终止智能体）。SQL 只读，不改状态。
3. 活动里成簇 **`heartbeat.cancelled`** 可与人工清理对账；见 [`探查/001`](../探查/001-探查-活动日志异常汇总.md)。

### 5.2 关单后仍像在打 / 反复唤醒

1. **先区分：** 多条 run 的 **`issueId` 不同**（依赖/父单级联） vs **同一 `issueId` 高密度重复**（误唤醒）。
2. **推荐顺序：** §4 活动 SQL → agent 维度 runs SQL → 单条 run 字段 + `retry_of_run_id` / `wake_reason` → 必要时 §6 API 拉 events。
3. **`process_lost_retry`：** 对 `retry_of_run_id` 再查原 run；规则见 [`探查/004`](../探查/004-探查-process_lost_retry.md)。
4. 编排准绳：[`关单后运行结案对账`](关单后运行结案对账.md)

### 5.3 Board 时间线三类来源

| 类别 | 怎么认（`activity_log.actor` / API activity） |
| --- | --- |
| **人** | `user:local-board` 等 |
| **智能体** | `agent:<uuid>`，常带 `run_id` |
| **系统** | `system:heartbeat`；`details` 里 `deferred_comment_wake`、`process_lost_retry` 等 |

判读时**先 actor 类型**，再对 `run_id`，最后拉 run + events；勿混成「Board 自己在乱读事务」。

### 5.4 重复派单、裸 `on_demand` wake

同一标题双 issue；`on_demand` run **无 `issueId`** 只有 `wakeReason` 文案。代码路径：`heartbeat.ts`、`issue-assignment-wakeup.ts`、`routes/agents.ts`、`run-liveness.ts`、各适配器 `execute.ts`。产品修复见执行单 **010**；本文只保「从哪查」。

### 5.5 Timer 与 `maxConcurrentRuns` 退让

查 **`agent_wakeup_requests`** 里 `skipped`、`reason` 含 `heartbeat.timer_yield_non_timer_pending`；语义见 [`043-timer避让`](../项目计划/执行/043-timer避让与并行语义产品化-已完成.md)。

---

## 6. API 与脚本（服务在线时）

**前置：** `curl http://127.0.0.1:4100/api/health` → ok；`local_trusted` 下无 Cookie 可读；`authenticated` 需 Bearer / 会话。

| 目的 | 路由 |
| --- | --- |
| 事务 | `GET /api/issues/{ROU-20 或 uuid}` |
| 本事务 runs | `GET /api/issues/{ref}/runs`（字段 **`runId`**，不是 `id`） |
| run 详情 | `GET /api/heartbeat-runs/{runId}`（含 `error` / `errorCode`） |
| run 事件 | `GET /api/heartbeat-runs/{runId}/events` |
| 活动 | `GET /api/issues/{ref}/activity` |
| 公司维度 runs | `GET /api/companies/{id}/heartbeat-runs?agentId=` |
| live（探查勿带 minCount） | `GET /api/companies/{id}/live-runs` |

**一键脚本（仓库根）：**

```sh
pnpm issue:forensics -- --company <companyUuid> --issue ROU-20
pnpm issue:forensics -- --company <uuid> --issue ROU-20 --run 4
pnpm issue:forensics -- --company <uuid> --issue ROU-20 --issue-activity
pnpm issue:forensics -- --company <uuid> --issue ROU-20 --reverse-last-per-run
```

- **`--base`** 默认 `http://127.0.0.1:4100`（**不要**写成带 `/api` 的根；上游默认 3100）
- **`authenticated`**：加 `--auth "Bearer …"` 或 **`PAPERCLIP_AUTH`**
- 实现：`scripts/issue-run-forensics.mjs`

**踩坑：** 列表 JSON 体积大勿肉眼扫；PowerShell 勿用 cmd 的 `for %i`；列表无 `error` 须再调 run 详情。

**验收 SOP（非探案）：** [`024-实践-运行验收与闭环判读`](../项目计划/最佳实践/024-实践-运行验收与闭环判读.md)

---

## 7. 探查收口模板

> 于 **{时间}** 对 **`{identifier}`**（`issues.id = …`）查 **`heartbeat_runs`** 得 **N** 条；关键 run **`{uuid}`** 的 `status` / `error_code` / `retry_of_run_id` / `wake_reason` 为 …；活动 **`{action}`** 由 **`{actor}`** 发起；结论：**{一句话}**。

---

## 8. 延伸阅读

- 排障总索引：[020-实践-排障指南](../项目计划/最佳实践/020-实践-排障指南.md)
- ROU-20 个案：[005](../探查/005-探查-ROU-20-运行记录.md)、[007 合订](../探查/007-探查-ROU-20-process_lost-retry与反复触发-合订.md)
- run 多 turn：[018-实践-排障-run与token多轮](../项目计划/最佳实践/018-实践-排障-run与token多轮.md)

---

*2026-05-20 · 合并原 010 / 002 / 004（部署 13–15）*
