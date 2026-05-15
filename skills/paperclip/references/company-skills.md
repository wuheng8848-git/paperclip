# 公司技能工作流

当董事会用户、CEO 或经理要求你查找技能、将其安装到公司库或将其分配给智能体时，使用此参考。

## 存在的内容

- 公司技能库：为整个公司安装、检查、更新和读取导入的技能。
- 智能体技能分配：在现有智能体上添加或删除公司技能。
- 雇佣/创建组合：在创建或雇佣智能体时传递 `desiredSkills`，以便立即应用相同的分配模型。

规范模型是：

1. 将技能安装到公司
2. 将公司技能分配给智能体
3. 可选择在雇佣/创建期间通过 `desiredSkills` 执行步骤 2

## 权限模型

- 公司技能读取：任何同公司参与者
- 公司技能变更：董事会、CEO 或具有有效 `agents:create` 能力的智能体
- 智能体技能分配：与更新该智能体相同的权限模型

## 核心端点

- `GET /api/companies/:companyId/skills`
- `GET /api/companies/:companyId/skills/:skillId`
- `POST /api/companies/:companyId/skills/import`
- `POST /api/companies/:companyId/skills/scan-projects`
- `POST /api/companies/:companyId/skills/:skillId/install-update`
- `GET /api/agents/:agentId/skills`
- `POST /api/agents/:agentId/skills/sync`
- `POST /api/companies/:companyId/agent-hires`
- `POST /api/companies/:companyId/agents`

## 将技能安装到公司

使用 **skills.sh URL**、键样式源字符串、GitHub URL 或本地路径导入。

### 源类型（按优先级）

| 源格式 | 示例 | 何时使用 |
|---|---|---|
| **skills.sh URL** | `https://skills.sh/google-labs-code/stitch-skills/design-md` | 当用户给你 `skills.sh` 链接时。这是托管技能注册表 — **如果有，始终优先使用它**。 |
| **键样式字符串** | `google-labs-code/stitch-skills/design-md` | 同一技能的简写 — `org/repo/skill-name` 格式。等同于 skills.sh URL。 |
| **GitHub URL** | `https://github.com/vercel-labs/agent-browser` | 当技能在 GitHub 仓库中但不在 skills.sh 上时。 |
| **本地路径** | `/abs/path/to/skill-dir` | 当技能在磁盘上时（仅开发/测试）。 |

**关键：** 如果用户给你 `https://skills.sh/...` URL，使用该 URL 或其键样式等效项（`org/repo/skill-name`）作为 `source`。**不要**将其转换为 GitHub URL — skills.sh 是托管注册表，是版本控制、发现和更新的真实来源。

### 示例：skills.sh 导入（首选）

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://skills.sh/google-labs-code/stitch-skills/design-md"
  }'
```

或等效地使用键样式字符串：

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "google-labs-code/stitch-skills/design-md"
  }'
```

### 示例：GitHub 导入

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://github.com/vercel-labs/agent-browser"
  }'
```

你也可以使用源字符串，例如：

- `google-labs-code/stitch-skills/design-md`
- `vercel-labs/agent-browser/agent-browser`
- `npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser`

如果任务是从公司项目工作空间首先发现技能：

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/scan-projects" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 检查已安装的内容

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

读取技能条目及其 `SKILL.md`：

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/<skill-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/<skill-id>/files?path=SKILL.md" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

## 将技能分配给现有智能体

`desiredSkills` 接受：

- 精确的公司技能键
- 精确的公司技能 ID
- 在公司中唯一时的精确 slug

服务器持久化规范的公司技能键。

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/agents/<agent-id>/skills/sync" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "desiredSkills": [
      "vercel-labs/agent-browser/agent-browser"
    ]
  }'
```

如果你首先需要当前状态：

```sh
curl -sS "$PAPERCLIP_API_URL/api/agents/<agent-id>/skills" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

## 在雇佣或创建期间包含技能

在雇佣或创建智能体时，在 `desiredSkills` 中使用相同的公司技能键或引用：

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Browser Agent",
    "role": "qa",
    "adapterType": "codex_local",
    "adapterConfig": {
      "cwd": "/abs/path/to/repo"
    },
    "desiredSkills": [
      "agent-browser"
    ]
  }'
```

对于无需审批的直接创建：

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Browser Agent",
    "role": "qa",
    "adapterType": "codex_local",
    "adapterConfig": {
      "cwd": "/abs/path/to/repo"
    },
    "desiredSkills": [
      "agent-browser"
    ]
  }'
```

## 注意事项

- 内置的 Paperclip 运行时技能在适配器需要时仍然会自动添加。
- 如果引用缺失或模糊，API 返回 `422`。
- 当你评论技能更改时，优先链接回相关的事务、审批和智能体。
- 当你需要整包导入/导出而不仅仅是技能时，使用公司可移植性路由：
  - `POST /api/companies/:companyId/imports/preview`
  - `POST /api/companies/:companyId/imports/apply`
  - `POST /api/companies/:companyId/exports/preview`
  - `POST /api/companies/:companyId/exports`
- 当任务专门是将技能添加到公司库而不导入周围的公司/团队/包结构时，使用仅技能导入。
