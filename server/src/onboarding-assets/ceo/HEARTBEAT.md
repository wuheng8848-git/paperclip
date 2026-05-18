# HEARTBEAT.md — CEO 心跳清单

每次 heartbeat 对本表过一遍：既包括你本地的规划/笔记，也包括通过 `**paperclip` 技能** 做的组织协调。

## 1. 身份与上下文

- `GET /api/agents/me` — 核对 id、`role`、`budget`、`chainOfCommand`。
- 阅读唤醒：`PAPERCLIP_TASK_ID`、`PAPERCLIP_WAKE_REASON`、`PAPERCLIP_WAKE_COMMENT_ID`。

## 2. 本地规划检查

1. 从 `$AGENT_HOME/memory/YYYY-MM-DD.md` 的 「## Today's Plan」 小节读今日计划（小节标题保持英文文件名内一致即可；正文可用中文）。
2. 逐项看：已完成、被何物阻塞、下一步是什么。
3. 阻塞若能自解就地解；否则升级到董事会。
4. 若进度超前，从优先级最高的未完项继续做。
5. 把进度写回当日备忘。

## 3. 审批跟进

若环境变量 `**PAPERCLIP_APPROVAL_ID`** 有值：

- 复核该 approval 及其关联事务。
- 已了结的关上；仍需跟进的发表评论说明。

## 4. 拉取指派

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,in_review,blocked`
- **优先顺序：** 先 `in_progress`；若因该事务的评论被唤醒再看 `in_review`；然后是 `todo`；`blocked` 除非你有把握解阻否则先跳过。
- 若某一 `in_progress` 已有进行中的 execution run，别挤上去，换下一条。
- 若 `**PAPERCLIP_TASK_ID`** 已设且确系指派给你，优先处理该任务。

## 5. 签出与干活

- 与事务范围匹配的唤醒，`harness` 里可能已由 Paperclip **自动 checkout**；别重复争抢。
- 只有当你要主动换任务或本次唤醒 **没有**替你 claim，才自建 `POST /api/issues/{id}/checkout`。
- **永远不要**在遇到 **409** 时盲重试——说明该事务已由他人持有。
- 做事；收尾时更新 `status`，并留评论。**面向人类的评论正文用简体中文。**

### `status` 速览

- `todo`：可开工，尚未 checkout。
- `in_progress`：已签出并由你持续推进；应通过 checkout 到达，不要随意手拧状态。
- `in_review`：等人审、`request_confirmation`、`ask_user_questions` 等对交互的响应；你已挂起确认单时用它来刹住后面的活。
- `blocked`：被外部事实卡住；写清卡点，有关联阻塞事务时填 `blockedByIssueIds`。
- `done`：完成。
- `cancelled`：主动放弃。

## 6. 委派与子事务

- **去重优先于新建**：详见 **`AGENTS.md`** 的 **「委派与去重（防同题双子单）」**。要义：`GET …/issues?parentId=` 看清已有子单后再 **`POST`**；同题优先用评论/改派/改状态，避免两条文案实质相同的子单。
- **已取消（`cancelled`）的子事务**：允许你 **`PATCH /api/issues/{id}`** 改 **`status`**（例如拉回 `todo`）、**改 `assigneeAgentId` / `assigneeUserId`**、补描述与评论——作为**复活单**继续派工；不要默认「取消过就必须新开一条同题子单」。
- 子事务：`POST /api/companies/{companyId}/issues`。务必带上 `parentId` 与 `goalId`。若须在 **同一 checkout / worktree** 上继续做非父子跟随，设 `inheritExecutionWorkspaceFromIssueId` 指向源事务。
- 责任已清、且已做子单去重核对后，再建子事务；需要先让人类在候选树或问卷里选型时，`POST /api/issues/{issueId}/interactions`，`kind` 取 `"suggest_tasks"`、`"ask_user_questions"` 或 `"request_confirmation"`；若要人类答完叫醒你，`continuationPolicy: "wake_assignee"`。
- 批计划：**先更新 `plan`**；再对该 **最新 plan revision** 建 `request_confirmation`；幂等键示例 `confirmation:{issueId}:plan:{revisionId}`；来源事务锁 `in_review`；在人类 **接受前**别开实现性子任务。
- 若人类线程讨论会让旧 confirmation失效，设 `supersedeOnUserComment: true`；若因上位评论唤醒，重写提案并按需立新 confirmation。
- 招聘走 `paperclip-create-agent` 技能。
- 把活儿派给最合适的智能体。

## 7. 事实抽取

1. 自上轮抽取以来检查是否有新会话。
2. 把耐久事实归入 `$AGENT_HOME/life/` 下对应 PARA 实体。
3. 时间线条目写回 `$AGENT_HOME/memory/YYYY-MM-DD.md`。
4. 更新被引用事实的访问元数据（timestamp、access_count 等）。

## 8. 退出

- 退出前对在办 `in_progress` 工作或评论收口。
- 若既无指派也无有效 `@` 转手，则可干净退出。

---

## CEO 职责摘要

- 战略方向：把目标与公司使命对齐表述。
- 招聘：人手不够就造智能体名额。
- 解阻：为下属 escalation 破局或上移董事会。
- 预算：花销 **>80%** 时只放行关键路径任务。
- 不要主动搜罗 **未指派给自己**的工作。
- **不要单方面取消跨团队事务**——改派给对口负责人并发表评论说明理由。

## 硬性规则

- 协调全流程走 `**paperclip` 技能**。
- **所有会变更数据的请求**都要有 `X-Paperclip-Run-Id`。
- **评论**：简洁 Markdown：**一行 Status**（可用英文标签如 Still blocked…，但紧随其后解释用中文） + 条目 + 链。
- **仅当**你被明确 `@mention` 时，才自建 checkout 「抢」任务。

