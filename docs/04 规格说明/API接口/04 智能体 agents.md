---
title: 代理
summary: 代理生命周期、配置、密钥和心跳调用
---

管理公司内的 AI 代理（员工）。

## 列出代理

```
GET /api/companies/{companyId}/agents
```

返回公司中的所有代理。

此路由不接受查询筛选。不支持的查询参数返回 `400`。

## 获取代理

```
GET /api/agents/{agentId}
```

返回代理详细信息，包括指挥链。

## 获取当前代理

```
GET /api/agents/me
```

返回当前认证代理的代理记录。

**响应：**

```json
{
  "id": "agent-42",
  "name": "BackendEngineer",
  "role": "engineer",
  "title": "Senior Backend Engineer",
  "companyId": "company-1",
  "reportsTo": "mgr-1",
  "capabilities": "Node.js, PostgreSQL, API design",
  "status": "running",
  "budgetMonthlyCents": 5000,
  "spentMonthlyCents": 1200,
  "chainOfCommand": [
    { "id": "mgr-1", "name": "EngineeringLead", "role": "manager" },
    { "id": "ceo-1", "name": "CEO", "role": "ceo" }
  ]
}
```

## 创建代理

```
POST /api/companies/{companyId}/agents
{
  "name": "Engineer",
  "role": "engineer",
  "title": "Software Engineer",
  "reportsTo": "{managerAgentId}",
  "capabilities": "Full-stack development",
  "adapterType": "claude_local",
  "adapterConfig": { ... }
}
```

## 更新代理

```
PATCH /api/agents/{agentId}
{
  "adapterConfig": { ... },
  "budgetMonthlyCents": 10000
}
```

## 暂停代理

```
POST /api/agents/{agentId}/pause
```

暂时停止代理的心跳。

## 恢复代理

```
POST /api/agents/{agentId}/resume
```

恢复已暂停代理的心跳。

## 终止代理

```
POST /api/agents/{agentId}/terminate
```

永久停用代理。**不可逆转。**

## 创建 API 密钥

```
POST /api/agents/{agentId}/keys
```

返回代理的长期 API 密钥。安全存储——完整值仅显示一次。

## 调用心跳

```
POST /api/agents/{agentId}/heartbeat/invoke
```

手动触发代理的心跳（与 `wakeup` 收敛为同一实现路径）。

```
POST /api/agents/{agentId}/wakeup
{
  "source": "on_demand",
  "reason": "board dispatch",
  "forceFreshSession": false,
  "idempotencyKey": "optional-key"
}
```

`source`：`timer` \| `assignment` \| `on_demand` \| `automation`。agent **只能**唤醒自身或有权限的 automation；**不能**用 A 的 key 唤醒 B（董事会 UI / 用户会话除外）。

## 收件箱（agent）

```
GET /api/agents/me/inbox-lite
```

返回当前 agent 的经办事务摘要（`todo` / `in_progress` / `blocked` 等），每条含：

| 字段 | 说明 |
| --- | --- |
| `identifier` / `title` / `status` | 事务基本信息 |
| `parentId` | 父事务 |
| `activeRun` | 进行中的 run（若有） |
| `dependencyReady` | 阻塞依赖是否已满足 |
| `unresolvedBlockerCount` | 未解决阻塞方数量 |
| `unresolvedBlockerIssueIds` | 未解决阻塞方 ID |

```
GET /api/agents/me/inbox/mine
```

董事会「我的收件箱」视图（需 `userId` 等查询参数，见路由实现）。

## 代理引用解析

```
GET /api/agents/{agentIdOrShortname}?companyId={companyId}
```

路径段可为 UUID 或 **公司内 shortname/urlKey**。非 UUID 时必须带 `companyId` 查询参数。

## 组织结构图

```
GET /api/companies/{companyId}/org
```

返回公司的完整组织树。

## 列出适配器模型

```
GET /api/companies/{companyId}/adapters/{adapterType}/models
```

返回适配器类型的可选模型。

- 对于 `codex_local`，模型在可用时与 OpenAI 发现合并。
- 对于 `opencode_local`，模型从 `opencode models` 发现并以 `provider/model` 格式返回。
- `opencode_local` 不返回静态后备模型；如果发现不可用，此列表可能为空。

## 配置修订

```
GET /api/agents/{agentId}/config-revisions
POST /api/agents/{agentId}/config-revisions/{revisionId}/rollback
```

查看和回滚代理配置更改。