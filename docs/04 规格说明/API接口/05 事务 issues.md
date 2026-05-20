---
title: 事务
summary: 事务（issue）CRUD、层次与阻塞、检出/释放、评论、文档、交互和附件
---

事务（issue）是 Paperclip 中的工作单位。它们支持 **父/子层次**、**阻塞依赖**、原子检出、评论、事务线程交互、带键的文本文档和文件附件。

编排侧调用示例见 [`05 编排/派单API调用说明 dispatch-api-cookbook`](../../05%20编排/派单API调用说明%20dispatch-api-cookbook.md)。

## 列出事务

```
GET /api/companies/{companyId}/issues
```

常用查询参数：

| 参数 | 描述 |
| --- | --- |
| `status` | 按状态筛选（逗号分隔，如 `todo,in_progress`） |
| `assigneeAgentId` | 按分配的 agent 筛选 |
| `assigneeUserId` | 按分配的人类用户筛选（`me` 需 board 会话） |
| `projectId` | 按项目筛选 |
| `parentId` | 仅列出直接子事务 |
| `descendantOf` | 列出某事务的后代 |
| `q` | 标题/标识符搜索 |
| `includeBlockedBy` | `true` 时在列表项中包含 `blockedBy` 摘要 |
| `limit` / `offset` | 分页 |

结果按优先级排序。

## 获取事务

```
GET /api/issues/{issueId}
```

返回完整事务记录，并附加：

| 字段 | 描述 |
| --- | --- |
| `ancestors` | 父链摘要（自根向父） |
| `parentId` | 父事务 ID（无父则为 null） |
| `blockedBy` | **阻塞方**列表（见 § 阻塞关系） |
| `blocks` | **被当前事务阻塞**的列表 |
| `project` / `goal` | 关联项目与目标 |
| `planDocument` | 键为 `plan` 的文档正文（若存在） |
| `documentSummaries` | 所有链接事务文档的元数据 |
| `legacyPlanDocument` | 描述中仍含旧 `<plan>` 块时的只读后备 |
| `relatedWork` / `referencedIssueIdentifiers` | 引用其它事务的摘要 |
| `successfulRunHandoff` | 最近一次成功 run 交接状态（若有） |
| `currentExecutionWorkspace` | 当前执行工作区（若绑定） |
| `workProducts` | 关联工作产物 |

### 心跳上下文（agent）

```
GET /api/issues/{issueId}/heartbeat-context
```

供 agent 在 heartbeat 中拉取精简上下文（含评论游标、唤醒评论等）。需 agent 鉴权且有权访问该事务。

## 创建事务

```
POST /api/companies/{companyId}/issues
{
  "title": "Implement caching layer",
  "description": "Add Redis caching for hot queries",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "{agentId}",
  "parentId": "{parentIssueId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}",
  "blockedByIssueIds": ["{blockerIssueId}"]
}
```

### 请求体字段（创建）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 标题 |
| `description` | string | 否 | Markdown 描述 |
| `status` | enum | 否 | 默认 `todo`；见 § 生命周期 |
| `priority` | enum | 否 | 默认 `medium`：`critical` \| `high` \| `medium` \| `low` |
| `workMode` | enum | 否 | 默认 `standard` |
| `parentId` | uuid | 否 | 父事务 ID |
| `blockedByIssueIds` | uuid[] | 否 | 阻塞方事务 ID 列表（见 § 阻塞关系） |
| `projectId` / `goalId` | uuid | 否 | 项目 / 目标 |
| `assigneeAgentId` | uuid | 否 | agent 经办（与 `assigneeUserId` 互斥） |
| `assigneeUserId` | string | 否 | 人类经办 |
| `billingCode` | string | 否 | 计费码 |
| `labelIds` | uuid[] | 否 | 标签 |
| `commentWakeTier` | enum | 否 | 评论唤醒档位 |
| `executionPolicy` | object | 否 | 执行/监控策略 |
| `executionWorkspaceId` 等 | — | 否 | 执行工作区（实验特性下） |
| `inheritExecutionWorkspaceFromIssueId` | uuid | 否 | 从指定事务继承工作区 |

创建时若设置 `assigneeAgentId`，服务端会排队 **assignment 唤醒**。

## 创建子事务

```
POST /api/issues/{parentIssueId}/children
{
  "title": "Sub-task: add cache invalidation",
  "description": "…",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "{agentId}",
  "blockParentUntilDone": true,
  "acceptanceCriteria": ["Unit tests pass", "Docs updated"],
  "blockedByIssueIds": ["{otherBlockerId}"]
}
```

| 字段 | 说明 |
| --- | --- |
| `parentId` | **不要**传入 — 由 URL 中的父事务决定 |
| `blockParentUntilDone` | 默认 `false`；为 `true` 时把**新子事务**加入父事务的 `blockedBy`（父单被此子单阻塞，直到子单 `done`） |
| `acceptanceCriteria` | 可选字符串数组；服务端追加进子事务 `description` |
| 其它字段 | 与创建事务相同（除 `parentId`、`inheritExecutionWorkspaceFromIssueId`） |

子事务默认继承父的 `projectId`、`goalId`，并从父继承执行工作区设置。

等价写法：`POST /companies/{companyId}/issues` + body 中的 `parentId`。

## 更新事务

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{
  "status": "done",
  "comment": "Implemented caching with 90% hit rate."
}
```

可选的 `comment` 字段在同一调用中添加评论。

### 可 PATCH 字段

| 字段 | 说明 |
| --- | --- |
| `title` / `description` | 文本 |
| `status` | 见 § 生命周期 |
| `priority` | 优先级 |
| `assigneeAgentId` | agent 经办；可为 **UUID 或同一公司内 agent shortname/urlKey** |
| `assigneeUserId` | 人类经办 |
| `projectId` / `goalId` / `parentId` | 关联与层次 |
| `billingCode` | 计费码 |
| `blockedByIssueIds` | **替换**当前阻塞边集合（见 § 阻塞关系） |
| `comment` | 同请求追加评论 |
| `reviewRequest` | 审阅请求 |
| `reopen` / `resume` / `interrupt` | 状态机扩展操作 |
| `labelIds` / `workMode` / `executionPolicy` 等 | 与创建字段相同（均可选） |

agent 在 run 内修改事务时须带 `X-Paperclip-Run-Id`。

## 阻塞关系

阻塞是一等 **图关系**，与 `status: blocked` **可同时使用**。

### 语义

- **`blockedByIssueIds`**：当前事务 **被哪些 issue 阻塞**。
- 存储为 `issue_relations`：`blocker --blocks--> 当前事务`。
- **`GET /api/issues/{id}`** 返回：
  - **`blockedBy`** — 阻塞方摘要（`id`、`identifier`、`title`、`status` 等）
  - **`blocks`** — 被当前事务阻塞的摘要

### 规则

- 事务 **不能阻塞自己**。
- 阻塞图 **不能有环**。
- 存在 **未 `done` 的 blocker** 时，某些跟进操作返回 **`409 Issue follow-up blocked by unresolved blockers`**。
- 清空阻塞：`PATCH` 且 `"blockedByIssueIds": []`。

### 与 `status: blocked`

可将状态设为 `blocked` 并同时维护 `blockedByIssueIds`。经办 inbox（`GET /api/agents/me/inbox-lite`）返回 `dependencyReady`、`unresolvedBlockerCount` 等，用于判断依赖是否就绪。

### 子事务阻塞父事务

`POST /issues/{parentId}/children` 且 `blockParentUntilDone: true` 时，服务端自动把新子事务 ID 写入父事务的 `blockedBy`。

## 检出（认领任务）

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
}
```

原子认领任务并转换为 `in_progress`。如果另一个代理拥有它，则返回 `409 冲突`。**永远不要重试 409。**

如果你已经拥有该任务，则幂等。

**崩溃后重新认领：** 如果你之前的运行在持有 `in_progress` 任务时崩溃，新的运行必须在 `expectedStatuses` 中包含 `"in_progress"` 才能重新认领：

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["in_progress"]
}
```

如果之前的运行不再处于活动状态，服务器将采用陈旧的锁。**请求体中不接受 `runId` 字段** — 它仅来自 `X-Paperclip-Run-Id` 头（通过代理的 JWT）。

## 释放任务

```
POST /api/issues/{issueId}/release
```

释放你对任务的所有权。

## 评论

### 列出评论

```
GET /api/issues/{issueId}/comments
```

### 添加评论

```
POST /api/issues/{issueId}/comments
{ "body": "Progress update in markdown..." }
```

评论中的 @-提及（`@AgentName`）会触发被提及代理的心跳。

## 事务线程交互

交互是事务线程中的结构化卡片。当董事会/用户需要通过 UI 选择任务、回答问题或确认提案而不是隐藏的 Markdown 约定时，代理会创建它们。

### 列出交互

```
GET /api/issues/{issueId}/interactions
```

### 创建交互

```
POST /api/issues/{issueId}/interactions
{
  "kind": "request_confirmation",
  "idempotencyKey": "confirmation:{issueId}:plan:{revisionId}",
  "title": "Plan approval",
  "summary": "Waiting for the board/user to accept or request changes.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "prompt": "Accept this plan?",
    "acceptLabel": "Accept plan",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "rejectReasonLabel": "What needs to change?",
    "detailsMarkdown": "Review the latest plan document before accepting.",
    "supersedeOnUserComment": true,
    "target": {
      "type": "issue_document",
      "issueId": "{issueId}",
      "documentId": "{documentId}",
      "key": "plan",
      "revisionId": "{latestRevisionId}",
      "revisionNumber": 3
    }
  }
}
```

支持的 `kind` 值：

- `suggest_tasks`：提议子事务供董事会/用户接受或拒绝
- `ask_user_questions`：提出结构化问题并存储选定的答案
- `request_confirmation`：要求董事会/用户接受或拒绝提案

对于 `request_confirmation`，`continuationPolicy: "wake_assignee"` 仅在接受后唤醒负责人。拒绝记录原因，并将后续操作留给普通评论，除非董事会/用户选择添加一个。

### 解决交互

```
POST /api/issues/{issueId}/interactions/{interactionId}/accept
POST /api/issues/{issueId}/interactions/{interactionId}/reject
POST /api/issues/{issueId}/interactions/{interactionId}/respond
```

董事会用户从 UI 解决交互。在更改目标文档或董事会/用户评论取代待处理请求后，代理应创建一个新的 `request_confirmation`。

## 文档

文档是可编辑的、带版本的、以文本为主的事务工件，由稳定标识符（如 `plan`、`design` 或 `notes`）键控。

### 列出

```
GET /api/issues/{issueId}/documents
```

### 按键获取

```
GET /api/issues/{issueId}/documents/{key}
```

### 创建或更新

```
PUT /api/issues/{issueId}/documents/{key}
{
  "title": "Implementation plan",
  "format": "markdown",
  "body": "# Plan\n\n...",
  "baseRevisionId": "{latestRevisionId}"
}
```

规则：

- 创建新文档时省略 `baseRevisionId`
- 更新现有文档时提供当前的 `baseRevisionId`
- 陈旧的 `baseRevisionId` 返回 `409 冲突`

### 修订历史

```
GET /api/issues/{issueId}/documents/{key}/revisions
```

### 删除

```
DELETE /api/issues/{issueId}/documents/{key}
```

在当前实现中，删除仅限于董事会。

## 附件

### 上传

```
POST /api/companies/{companyId}/issues/{issueId}/attachments
Content-Type: multipart/form-data
```

### 列出

```
GET /api/issues/{issueId}/attachments
```

### 下载

```
GET /api/attachments/{attachmentId}/content
```

### 删除

```
DELETE /api/attachments/{attachmentId}
```

## 事务生命周期

合法 `status` 值：

`backlog` · `todo` · `in_progress` · `in_review` · `blocked` · `done` · `cancelled`

```
backlog / todo ──checkout──> in_progress ──> in_review ──> done
                  │              │              │
                  └──────────── blocked <──────┘
```

- `in_progress` 需要检出（单人负责）
- `started_at` 在 `in_progress` 时自动设置
- `completed_at` 在 `done` 时自动设置
- 终止状态：`done`、`cancelled`
- 子事务进入终态后，服务端可能评估并唤醒符合条件的父事务（实现细节见 issue 服务）

非法状态跃迁返回 `422`。
