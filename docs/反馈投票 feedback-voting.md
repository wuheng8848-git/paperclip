---
title: 反馈投票
summary: 本地数据指南
---

当您使用**有帮助**（竖起大拇指）或**需要工作**（向下大拇指）对智能体的回复进行评分时，Paperclip 会将您的投票与您的运行实例一起本地保存。本指南涵盖存储的内容、如何访问以及如何导出。

## 投票如何工作

1. 在任何智能体评论或文档修订上点击**有帮助**或**需要工作**。
2. 如果您点击**需要工作**，会出现一个可选的文本提示：_"哪里可以更好？"_ 您可以输入原因或关闭它。
3. 一个同意对话框询问是保留投票本地还是共享它。您的选择会被记住以供以后投票。

### 存储的内容

每次投票会创建两个本地记录：

| 记录 | 包含内容 |
|------|----------|
| **投票** | 您的投票（上/下）、可选的原因文本、共享偏好、同意版本、时间戳 |
| **跟踪包** | 完整上下文快照：投票的评论/修订文本、事务标题、智能体信息、您的投票和原因——单独理解反馈所需的一切 |

所有数据都保存在您的本地 Paperclip 数据库中。除非您明确选择共享，否则没有任何内容离开您的机器。

当投票被标记为共享时，Paperclip 会立即尝试通过遥测后端上传跟踪包。上传在传输过程中被压缩，因此完整的跟踪包保持在网关大小限制之下。如果该即时推送失败，跟踪会留在可重试的失败状态，以便稍后刷新尝试。应用服务器从不直接将原始反馈跟踪包上传到对象存储。

## 查看您的投票

### 快速报告（终端）

```bash
pnpm paperclipai feedback report
```

显示颜色编码的摘要：投票计数、带有原因的每个跟踪详细信息以及导出状态。

```bash
# 已安装的 CLI
paperclipai feedback report

# 指向不同的服务器或公司
pnpm paperclipai feedback report --api-base http://127.0.0.1:3000 --company-id <company-id>

# 在报告中包含原始有效负载转储
pnpm paperclipai feedback report --payloads
```

### API 端点

所有端点都需要董事会用户访问权限（在本地开发中自动）。

**列出事务的投票：**
```bash
curl http://127.0.0.1:3102/api/issues/<issueId>/feedback-votes
```

**列出事务的跟踪包（包含完整有效负载）：**
```bash
curl 'http://127.0.0.1:3102/api/issues/<issueId>/feedback-traces?includePayload=true'
```

**列出整个公司的所有跟踪：**
```bash
curl 'http://127.0.0.1:3102/api/companies/<companyId>/feedback-traces?includePayload=true'
```

**获取单个跟踪信封记录：**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>
```

**获取跟踪的完整导出包：**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>/bundle
```

#### 过滤

跟踪端点接受查询参数：

| 参数 | 值 | 描述 |
|------|----|------|
| `vote` | `up`, `down` | 按投票方向过滤 |
| `status` | `local_only`, `pending`, `sent`, `failed` | 按导出状态过滤 |
| `targetType` | `issue_comment`, `issue_document_revision` | 按投票对象过滤 |
| `sharedOnly` | `true` | 仅显示用户选择共享的投票 |
| `includePayload` | `true` | 包含完整上下文快照 |
| `from` / `to` | ISO 日期 | 日期范围过滤 |

## 导出您的数据

### 导出到文件 + zip

```bash
pnpm paperclipai feedback export
```

创建一个带时间戳的目录，包含：

```
feedback-export-20260331T120000Z/
  index.json                    # 包含摘要统计的清单
  votes/
    PAP-123-a1b2c3d4.json      # 投票元数据（每个投票一个）
  traces/
    PAP-123-e5f6g7h8.json      # Paperclip 反馈信封（每个跟踪一个）
  full-traces/
    PAP-123-e5f6g7h8/
      bundle.json              # 跟踪的完整导出清单
      ...原始适配器文件         # 可用时的 codex / claude / opencode 会话工件
feedback-export-20260331T120000Z.zip
```

默认情况下导出是完整的。`traces/` 保留 Paperclip 信封，而 `full-traces/` 包含更丰富的每个跟踪包以及任何可恢复的适配器原生文件。

```bash
# 自定义服务器和输出目录
pnpm paperclipai feedback export --api-base http://127.0.0.1:3000 --company-id <company-id> --out ./my-export
```

### 读取导出的跟踪

打开 `traces/` 中的任何文件查看：

```json
{
  "id": "trace-uuid",
  "vote": "down",
  "issueIdentifier": "PAP-123",
  "issueTitle": "Fix login timeout",
  "targetType": "issue_comment",
  "targetSummary": {
    "label": "Comment",
    "excerpt": "The first 80 chars of the comment that was voted on..."
  },
  "payloadSnapshot": {
    "vote": {
      "value": "down",
      "reason": "Did not address the root cause"
    },
    "target": {
      "body": "Full text of the agent comment..."
    },
    "issue": {
      "identifier": "PAP-123",
      "title": "Fix login timeout"
    }
  }
}
```

打开 `full-traces/<issue>-<trace>/bundle.json` 查看扩展的导出元数据，包括捕获说明、适配器类型、完整性元数据以及与其一起写入的原始文件的清单。

`bundle.json.files[]` 中的每个条目都包含实际捕获的文件有效负载在 `contents` 下，而不仅仅是路径名。对于文本工件，这存储为 UTF-8 文本；二进制工件使用 base64 和 `encoding` 标记。

内置的本地适配器现在更直接地导出其原生会话工件：

- `codex_local`：`adapter/codex/session.jsonl`
- `claude_local`：`adapter/claude/session.jsonl`，加上任何 `adapter/claude/session/...` 附属文件和 `adapter/claude/debug.txt`（如果存在）
- `opencode_local`：`adapter/opencode/session.json`、`adapter/opencode/messages/*.json` 和 `adapter/opencode/parts/<messageId>/*.json`，以及可选的 `project.json`、`todo.json` 和 `session-diff.json`

## 共享偏好

您第一次投票时，同意对话框会询问：

- **保持本地** — 投票仅本地存储（`sharedWithLabs: false`）
- **共享此投票** — 投票标记为共享（`sharedWithLabs: true`）

您的偏好按公司保存。您可以随时通过反馈设置更改它。标记为“保持本地”的投票永远不会排队等待导出。

## 数据生命周期

| 状态 | 含义 |
|------|------|
| `local_only` | 投票本地存储，未标记为共享 |
| `pending` | 标记为共享，本地保存，等待即时上传尝试 |
| `sent` | 成功传输 |
| `failed` | 传输尝试但失败（例如后端不可达或未配置）；稍后的刷新在后端可用时重试 |

无论共享状态如何，您的本地数据库始终保留完整的投票和跟踪数据。

## 远程同步

您选择共享的投票会从投票请求立即发送到遥测后端。服务器还保留一个后台刷新工作器，以便失败的跟踪可以在稍后重试。遥测后端验证请求，然后将包持久化到其配置的对象存储中。

- 应用服务器责任：构建包，POST 到遥测后端，更新跟踪状态
- 遥测后端责任：认证请求，验证有效负载形状，压缩/存储包，返回最终对象键
- 重试行为：失败的上传移动到 `failed`，在 `failureReason` 中包含错误消息，工作器在后续刻度重试它们
- 默认端点：当未配置反馈导出后端 URL 时，Paperclip 回退到 `https://telemetry.paperclip.ing`
- 重要细微差别：上传的对象是投票时完整包的快照。如果您稍后获取本地包，而底层适配器会话文件继续增长，本地重新生成的包可能比同一跟踪的已上传快照更大。

导出对象使用确定性键模式，因此易于检查：

```text
feedback-traces/<companyId>/YYYY/MM/DD/<exportId-or-traceId>.json
```