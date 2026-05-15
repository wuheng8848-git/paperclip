# 事务工作空间运行时控制

当事务具有隔离的执行工作空间并且你需要检查或运行该工作空间的服务时，特别是对于 QA/浏览器验证，使用此参考。

## 发现工作空间

从事务开始，而不是从记忆开始：

```sh
curl -sS -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID/heartbeat-context"
```

读取 `currentExecutionWorkspace`：

- `id` — 用于控制端点的执行工作空间 ID
- `cwd` / `branchName` — 本地签出上下文
- `status` / `closedAt` — 工作空间是否可用
- `runtimeServices[]` — 当前服务，包括 `serviceName`、`status`、`healthStatus`、`url`、`port` 和 `runtimeServiceId`

如果 `currentExecutionWorkspace` 为 `null`，则事务当前没有已实现的执行工作空间。对于子/后续工作，使用 `parentId` 创建子事务或使用 `inheritExecutionWorkspaceFromIssueId`，以便 Paperclip 保持工作空间连续性。

## 控制服务

优先使用 Paperclip 管理的运行时服务控制，而不是手动的 `pnpm dev &` 或临时后台进程。这些端点使服务状态、URL、日志和所有权对其他智能体和董事会可见。

```sh
# 启动所有配置的服务；等待配置的就绪检查。
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  "$PAPERCLIP_API_URL/api/execution-workspaces/<workspace-id>/runtime-services/start" \
  -d '{}'

# 重启所有配置的服务。
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  "$PAPERCLIP_API_URL/api/execution-workspaces/<workspace-id>/runtime-services/restart" \
  -d '{}'

# 停止所有运行中的服务。
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  "$PAPERCLIP_API_URL/api/execution-workspaces/<workspace-id>/runtime-services/stop" \
  -d '{}'
```

要定位配置的服务，传递以下之一：

```json
{ "workspaceCommandId": "web" }
{ "runtimeServiceId": "<runtime-service-id>" }
{ "serviceIndex": 0 }
```

响应包括更新的 `workspace.runtimeServices[]` 列表和用于日志的 `workspaceOperation`/`operation` 记录。

## 读取 URL

在 `start` 或 `restart` 之后，从以下位置读取服务 URL：

- 响应 `workspace.runtimeServices[].url`
- 或新的 `GET /api/issues/:issueId/heartbeat-context` 响应中的 `currentExecutionWorkspace.runtimeServices[].url`

对于 QA/浏览器检查，使用 `status` 为 `running` 且 `healthStatus` 不是 `unhealthy` 的服务。如果多个服务正在运行，优先使用名为 `web`、`preview` 的服务或事务提到的配置服务。

## MCP 工具

当 Paperclip MCP 工具可用时，优先使用这些事务范围工具：

- `paperclipGetIssueWorkspaceRuntime` — 读取事务的 `currentExecutionWorkspace` 和服务 URL。
- `paperclipControlIssueWorkspaceServices` — 启动、停止或重启当前事务工作空间服务。
- `paperclipWaitForIssueWorkspaceService` — 等到选定的服务运行并在暴露时返回其 URL。

这些工具为你解析事务的工作空间 ID，因此 QA 智能体不需要首先知道较低级别的执行工作空间端点。
