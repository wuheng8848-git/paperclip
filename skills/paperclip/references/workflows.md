# Paperclip 工作流手册

从 `SKILL.md` 指向的特定工作流的参考材料。仅在任务匹配时加载。

---

## 项目设置（CEO/经理）

当要求设置一个带有工作空间配置（本地文件夹和/或 GitHub 仓库）的新项目时：

1. 使用项目字段 `POST /api/companies/{companyId}/projects`。
2. 可选择在同一创建调用中包含 `workspace`，或在创建后立即调用 `POST /api/projects/{projectId}/workspaces`。

工作空间规则：

- 提供至少一个 `cwd`（本地文件夹）或 `repoUrl`（远程仓库）。
- 对于仅仓库设置，省略 `cwd` 并提供 `repoUrl`。
- 当本地和远程引用都应该被跟踪时，包含两者 `cwd` + `repoUrl`。

---

## OpenClaw 邀请（CEO）

当要求邀请新的 OpenClaw 员工时使用此方法。

1. 生成新的 OpenClaw 邀请提示：

```
POST /api/companies/{companyId}/openclaw/invite-prompt
{ "agentMessage": "optional onboarding note for OpenClaw" }
```

访问控制：

- 具有邀请权限的董事会用户可以调用它。
- 智能体调用者：只有公司 CEO 智能体可以调用它。

2. 为董事会构建可复制的 OpenClaw 提示：

- 使用响应中的 `onboardingTextUrl`。
- 要求董事会将该提示粘贴到 OpenClaw 中。
- 如果事务包含 OpenClaw URL（例如 `ws://127.0.0.1:18789`），在你的评论中包含该 URL，以便董事会/OpenClaw 在 `agentDefaultsPayload.url` 中使用它。

3. 在事务评论中发布提示，以便人类可以将其粘贴到 OpenClaw 中。

4. OpenClaw 提交加入请求后，监控审批并继续入职（审批 + API 密钥声明 + 技能安装）。

---

## 设置智能体指令路径

当你需要设置智能体的指令 markdown 路径（例如 `AGENTS.md`）时，使用专用路由而不是通用的 `PATCH /api/agents/:id`。

```bash
PATCH /api/agents/{agentId}/instructions-path
{
  "path": "agents/cmo/AGENTS.md"
}
```

规则：

- 允许：目标智能体本身，或该智能体报告链中的祖先经理。
- 对于 `codex_local` 和 `claude_local`，默认配置键是 `instructionsFilePath`。
- 相对路径针对目标智能体的 `adapterConfig.cwd` 解析；绝对路径按原样接受。
- 要清除路径，发送 `{ "path": null }`。
- 对于具有不同键的适配器，显式提供它：

```bash
PATCH /api/agents/{agentId}/instructions-path
{
  "path": "/absolute/path/to/AGENTS.md",
  "adapterConfigKey": "yourAdapterSpecificPathField"
}
```

---

## 公司导入/导出

当 CEO 智能体需要检查或移动包内容时，使用公司范围的路由。

- CEO 安全导入：
  - `POST /api/companies/{companyId}/imports/preview`
  - `POST /api/companies/{companyId}/imports/apply`
- 允许的调用者：董事会用户和该公司的 CEO 智能体。
- 安全导入规则：
  - 现有公司导入是非破坏性的
  - `replace` 被拒绝
  - 冲突通过 `rename` 或 `skip` 解决
  - 事务始终作为新事务创建
- CEO 智能体可以使用安全路由和 `target.mode = "new_company"` 直接创建新公司。Paperclip 从源公司复制活跃用户成员资格，以便新公司不会成为孤岛。

对于导出，首先预览并保持任务明确：

- `POST /api/companies/{companyId}/exports/preview`
- `POST /api/companies/{companyId}/exports`
- 导出预览默认为 `issues: false`
- 仅当你故意需要任务文件时添加 `issues` 或 `projectIssues`
- 在检查预演清单后，使用 `selectedFiles` 将最终包缩小到特定的智能体、技能、项目或任务

完整模式示例请参见 `api-reference.md`。

---

## 自测试手册（应用级）

当验证 Paperclip 本身（分配流程、签出、运行可见性和状态转换）时使用此方法。

1. 创建一个分配给已知本地智能体（`claudecoder` 或 `codexcoder`）的一次性事务：

```bash
npx paperclipai issue create \
  --company-id "$PAPERCLIP_COMPANY_ID" \
  --title "Self-test: assignment/watch flow" \
  --description "Temporary validation issue" \
  --status todo \
  --assignee-agent-id "$PAPERCLIP_AGENT_ID"
```

2. 触发并观察该分配者的心跳：

```bash
npx paperclipai heartbeat run --agent-id "$PAPERCLIP_AGENT_ID"
```

3. 验证事务转换（`todo -> in_progress -> done` 或 `blocked`）并发布评论：

```bash
npx paperclipai issue get <issue-id-or-identifier>
```

4. 重新分配测试（可选）：在同一事务在 `claudecoder` 和 `codexcoder` 之间移动并确认唤醒/运行行为：

```bash
npx paperclipai issue update <issue-id> --assignee-agent-id <other-agent-id> --status todo
```

5. 清理：用清晰的注释标记临时事务为完成/已取消。

如果你在这些测试期间使用直接的 `curl`，在心跳内运行时，在所有变更事务请求中包含 `X-Paperclip-Run-Id`。
