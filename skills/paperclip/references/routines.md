# Paperclip 例程

例程是周期性任务。每次例程触发时，它会创建一个分配给例程智能体的执行事务 — 智体在正常心跳流程中接收它。

例程具有：
- 一个分配的智能体和一个项目
- 一个或多个触发器（`schedule`、`webhook` 或 `api`）
- 并发策略（当上一次运行仍处于活动状态时该怎么办）
- 补救策略（对错过的计划运行该怎么办）

**授权：** 智能体可以读取其公司中的所有例程，但只能创建或管理分配给自己的例程。董事会操作员拥有完全访问权限，包括重新分配。

---

## 生命周期

```
active <-> paused
active  -> archived  (终端 — 无法重新激活)
```

暂停的例程不会触发。已归档的例程不会触发且无法取消归档。

---

## 创建例程

```
POST /api/companies/{companyId}/routines
{
  "title": "Weekly CEO briefing",
  "description": "Compile status report and post to Slack",
  "assigneeAgentId": "{agentId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}",           // 可选
  "parentIssueId": "{issueId}",   // 可选 — 运行事务的父事务
  "priority": "medium",
  "status": "active",
  "concurrencyPolicy": "coalesce_if_active",
  "catchUpPolicy": "skip_missed"
}
```

| 字段 | 必需 | 说明 |
|-------|----------|-------|
| `title` | 是 | 最多 200 个字符 |
| `description` | 否 | 例程的人类可读描述 |
| `assigneeAgentId` | 是 | 智能体：必须是自己 |
| `projectId` | 是 | |
| `goalId` | 否 | 由运行事务继承 |
| `parentIssueId` | 否 | 运行事务成为此事务的子事务 |
| `priority` | 否 | `critical` `high` `medium`（默认）`low` |
| `status` | 否 | `active`（默认）`paused` `archived` |
| `concurrencyPolicy` | 否 | 见下文 |
| `catchUpPolicy` | 否 | 见下文 |

---

## 并发策略

控制当上一次运行事务仍处于打开或活动状态时触发器触发时发生的情况。

| 策略 | 行为 |
|--------|-----------|
| `coalesce_if_active` **（默认）** | 新运行标记为 `coalesced` 并链接到现有的活动运行 — 不创建新事务 |
| `skip_if_active` | 新运行标记为 `skipped` 并链接到现有的活动运行 — 不创建新事务 |
| `always_enqueue` | 无论活动运行如何，始终创建新事务 |

---

## 补救策略

控制对错过的计划运行（例如服务器停机期间）的处理方式。

| 策略 | 行为 |
|--------|-----------|
| `skip_missed` **（默认）** | 错过的运行被丢弃 |
| `enqueue_missed_with_cap` | 错过的运行排队，上限为 25 |

---

## 添加触发器

例程可以有多个不同类型的触发器。

所有触发器类型都接受可选的 `label` 字段（最多 120 个字符），这对于区分一个例程上的多个相同类型的触发器很有用。

```
POST /api/routines/{routineId}/triggers
```

### 计划（cron）

```json
{
  "kind": "schedule",
  "cronExpression": "0 9 * * 1",
  "timezone": "Europe/Amsterdam"
}
```

- `cronExpression`：标准 5 字段 cron 语法
- `timezone`：IANA 时区字符串（例如 `UTC` 或 `America/New_York`）
- 服务器自动计算 `nextRunAt`

### Webhook

```json
{
  "kind": "webhook",
  "signingMode": "hmac_sha256",
  "replayWindowSec": 300
}
```

- `signingMode`：`bearer`（默认）或 `hmac_sha256`
- `replayWindowSec`：30-86400（默认 300）
- 响应包括 webhook URL（基于 `publicId`）和签名密钥
- 外部触发：`POST /api/routine-triggers/public/{publicId}/fire`
  - Bearer：`Authorization: Bearer <secret>`
  - HMAC：`X-Paperclip-Signature` + `X-Paperclip-Timestamp` 标头

### API（仅手动）

```json
{
  "kind": "api"
}
```

无需配置。通过手动运行端点触发。

---

## 更新和删除触发器

```
PATCH /api/routine-triggers/{triggerId}
{ "enabled": false, "cronExpression": "0 10 * * 1" }

DELETE /api/routine-triggers/{triggerId}
```

要轮换 webhook 密钥（旧密钥立即失效）：

```
POST /api/routine-triggers/{triggerId}/rotate-secret
```

---

## 手动运行

立即触发运行，绕过计划。并发策略仍然适用。

```
POST /api/routines/{routineId}/run
{
  "source": "manual",
  "triggerId": "{triggerId}",       // 可选 — 将运行归因于特定触发器
  "payload": { "context": "..." }, // 可选 — 传递给运行事务
  "idempotencyKey": "unique-key"   // 可选 — 防止重复运行
}
```

---

## 更新例程

所有创建字段都可更新。智能体不能将例程重新分配给另一个智能体。

```
PATCH /api/routines/{routineId}
{ "status": "paused", "title": "New title" }
```

---

## 读取例程和运行

```
GET /api/companies/{companyId}/routines
GET /api/routines/{routineId}
GET /api/routines/{routineId}/runs?limit=50
```

当你需要完整的跨域参考时，请使用 `skills/paperclip/references/api-reference.md` 中的通用 API 端点表。当你需要例程特定的行为、负载形状或策略详细信息时，请使用此文件。
