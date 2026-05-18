/**
 * Agent 可见的 Paperclip 唤醒段落中文版式。
 * 不得从 `ui` 引用 `i18n.ts`：`adapter-utils` 需独立于前端包。
 * 若将来需要英文或其它语言，可在此文件旁增加 locale 映射或 `options.locale` 分支。
 *
 * 文风：叙述与操作顺序用中文；凡与契约对齐的 **API 路径、HTTP 方法、`kind` / `status`、
 * `continuationPolicy`、`idempotencyKey`、JSON 字段名、Paperclip 环境变量名** 保持 **英文原样**
 *（正文里常用反引号包起来），避免与实现对不上号。
 */

export const PAPERCLIP_WAKE_SECTION_ZH = "## Paperclip 唤醒负载";
export const PAPERCLIP_RESUME_DELTA_SECTION_ZH = "## Paperclip 恢复增量";

/** 续会话分支：引导语 */
export const RESUME_DELTA_INTRO_ZH = [
  "你在继续已有的 Paperclip 会话。",
  "本心跳仅针对下文事务；在处理好本次唤醒前，不要切换到其他事务。",
  "聚焦下方新的唤醒增量，在当前任务上继续推进，不必重复完整心跳套话。",
  "仅当 `fallbackFetchNeeded` 为真，或你需要比本批次更广的历史时，再去拉取 API 线程。",
] as const;

/** 非续会话分支：引导语（payload = 本段内联的唤醒数据，与 HTTP body 的 payload 同义） */
export const WAKE_PAYLOAD_INTRO_ZH = [
  "将下面这份 **wake payload**（唤醒包）视为当前心跳里优先级最高的输入；其中 API 名、字段名保持英文。",
  "本心跳仅针对下文事务；在处理好本次唤醒前，不要切换到其他事务。",
  "在进行泛泛的仓库探索或套话式心跳更新之前，先确认最新评论并说明它如何影响你的下一步动作。",
  "优先使用本段内联唤醒数据，再去重新拉取事务讨论线程。",
  "仅当 `fallbackFetchNeeded` 为真，或你需要比本批次更广的历史时，再去拉取 API 线程。",
] as const;

/** 规划模式指令（与 server heartbeat task markdown 语义对齐，便于两端口径一致） */
export const PLANNING_DIRECTIVE_ASSIGNMENT_ZH =
  "只做规划，不要写代码或做实现性工作。";
export const PLANNING_DIRECTIVE_COMMENT_ZH =
  "只更新规划，不要写代码或做实现性工作。";
export const PLANNING_DIRECTIVE_ACCEPTED_ZH =
  "仅从已通过的规划中拆分子事务，不要在规划事务本体上做实现性工作。";
export const ACCEPTED_PLAN_CONTINUATION_LINE_ZH =
  "- 已通过规划后续：可从已通过规划中创建实现性子事务，但不得在规划事务本体上开始实现性工作";

export function formatWakePrincipalLabelZh(
  principal: {
    type?: "agent" | "user" | null;
    agentId?: string | null;
    userId?: string | null;
  } | null,
): string {
  if (!principal || !principal.type) return "未知";
  if (principal.type === "agent") {
    return principal.agentId ? `智能体 ${principal.agentId}` : "智能体";
  }
  return principal.userId ? `用户 ${principal.userId}` : "用户";
}

export function formatWakeRoleLabelZh(role: string | undefined): string {
  switch (role) {
    case "reviewer":
      return "评审者";
    case "approver":
      return "审批者";
    case "executor":
      return "执行者";
    default:
      return role ?? "未知";
  }
}
