# Paperclip 创建智能体 API 参考

## 核心端点

- `GET /llms/agent-configuration.txt`
- `GET /llms/agent-configuration/:adapterType.txt`
- `GET /llms/agent-icons.txt`
- `GET /api/companies/:companyId/agent-configurations`
- `GET /api/companies/:companyId/skills`
- `POST /api/companies/:companyId/skills/import`
- `GET /api/agents/:agentId/configuration`
- `POST /api/agents/:agentId/skills/sync`
- `POST /api/companies/:companyId/agent-hires`
- `POST /api/companies/:companyId/agents`
- `GET /api/agents/:agentId/config-revisions`
- `POST /api/agents/:agentId/config-revisions/:revisionId/rollback`
- `POST /api/issues/:issueId/approvals`
- `GET /api/approvals/:approvalId/issues`

审批协作：

- `GET /api/approvals/:approvalId`
- `POST /api/approvals/:approvalId/request-revision`（董事会）
- `POST /api/approvals/:approvalId/resubmit`
- `GET /api/approvals/:approvalId/comments`
- `POST /api/approvals/:approvalId/comments`
- `GET /api/approvals/:approvalId/issues`

## `POST /api/companies/:companyId/agent-hires`

请求体匹配智能体创建形状：

```json
{
  "name": "CTO",
  "role": "cto",
  "title": "Chief Technology Officer",
  "icon": "crown",
  "reportsTo": "uuid-or-null",
  "capabilities": "Owns architecture and engineering execution",
  "desiredSkills": ["vercel-labs/agent-browser/agent-browser"],
  "adapterType": "claude_local",
  "adapterConfig": {
    "cwd": "/absolute/path",
    "model": "claude-sonnet-4-5-20250929"
  },
  "instructionsBundle": {
    "entryFile": "AGENTS.md",
    "files": {
      "AGENTS.md": "You are CTO..."
    }
  },
  "runtimeConfig": {
    "heartbeat": {
      "enabled": false,
      "wakeOnDemand": true
    }
  },
  "budgetMonthlyCents": 0,
  "sourceIssueId": "uuid-or-null",
  "sourceIssueIds": ["uuid-1", "uuid-2"]
}
```

响应：

```json
{
  "agent": {
    "id": "uuid",
    "status": "pending_approval"
  },
  "approval": {
    "id": "uuid",
    "type": "hire_agent",
    "status": "pending",
    "payload": {
      "desiredSkills": ["vercel-labs/agent-browser/agent-browser"]
    }
  }
}
```

如果公司设置禁用了必需审批，`approval` 为 `null`，智能体创建为 `idle`。

`desiredSkills` 接受公司技能 ID、规范键或唯一 slug。服务器解析并存储规范的公司技能键。
默认情况下禁用定时器心跳。仅当角色真正需要计划的周期性工作或用户明确请求时，才设置 `runtimeConfig.heartbeat.enabled=true` 并包含 `intervalSec`。

## 审批生命周期

状态：

- `pending`
- `revision_requested`
- `approved`
- `rejected`
- `cancelled`

对于雇佣审批：

- approved：链接的智能体转换 `pending_approval -> idle`
- rejected：链接的智能体被终止

## 安全说明

- 配置读取 API 会编辑明显的密钥。
- `pending_approval` 智能体无法运行心跳、接收分配或创建密钥。
- 所有操作都记录在活动日志中以供审计。
- 在事务/审批评论中使用 markdown，并包含到审批、智能体和源事务的链接。
- 审批解决后，请求者可能会被 `PAPERCLIP_APPROVAL_ID` 唤醒，并应协调链接的事务。
