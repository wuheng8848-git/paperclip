/**
 * zh-CN messages for recovery module human-readable comments.
 * Used in recovery issue escalation, stranded-work recovery comments,
 * successful-run handoff notices, and liveness continuation messages.
 *
 * IMPORTANT: `SUCCESSFUL_RUN_HANDOFF_REQUIRED_NOTICE_BODY` and
 * `LEGACY_SUCCESSFUL_RUN_HANDOFF_NOTICE_PREFIXES` are used in SQL queries
 * and `isSuccessfulRunHandoffRequiredNoticeBody()` for backward-compatible
 * matching against existing database rows. Their values MUST remain stable
 * (or be updated together with the SQL query in heartbeat.ts).
 */

// ── Stable identifiers (re-exported by successful-run-handoff.ts) ──

export const FINISH_SUCCESSFUL_RUN_HANDOFF_REASON = "finish_successful_run_handoff";
export const SUCCESSFUL_RUN_MISSING_STATE_REASON = "successful_run_missing_state";
export const SUCCESSFUL_RUN_HANDOFF_OPTIONS = [
  "mark_done_or_cancelled",
  "send_for_review_or_ask_for_input",
  "mark_blocked",
  "delegate_or_continue_from_checkpoint",
] as const;

// ── Stranded recovery escalation (buildRecoveryEscalationCommentLines) ──

export const RECOVERY_ESCALATION_TITLE = "Paperclip 已停止针对此恢复事务的自动滞留工作恢复。";

export function buildRecoveryEscalationCommentLines(input: {
  issueLink: string;
  previousStatus: string;
  runLink: string;
  runStatus: string;
  retryReason: string;
  failureLine: string;
}): string[] {
  return [
    RECOVERY_ESCALATION_TITLE,
    "",
    `- 恢复事务：${input.issueLink}`,
    `- 原状态：\`${input.previousStatus}\``,
    `- 最近运行：${input.runLink}`,
    `- 最近运行状态：\`${input.runStatus}\``,
    `- 重试原因：\`${input.retryReason}\``,
    input.failureLine,
    "- 保护规则：恢复事务不会创建嵌套的 `stranded_issue_recovery` 事务。",
    "",
    "下一步：当前恢复经办人应检查失败运行证据，恢复实时执行路径或记录手动处理结果，然后将此恢复事务移出 `blocked` 状态。",
  ];
}

function formatDurationMs(ms: number | null) {
  if (ms === null) return "未知";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分钟` : `${hours} 小时`;
}

function formatStaleRunLevelLabel(level: "suspicious" | "critical") {
  return level === "critical" ? "严重" : "可疑";
}

/** Stale active run evaluation issue description (P3-C · D-11). */
export function buildStaleRunEvaluationDescription(input: {
  level: "suspicious" | "critical";
  runLink: string;
  agentName: string;
  adapterType: string;
  invocation: string;
  sourceIssueLink: string;
  startedAt: string;
  processStartedAt: string;
  lastOutputAt: string;
  lastOutputSeq: number;
  silenceAgeMs: number | null;
  suspiciousThresholdMs: number;
  criticalThresholdMs: number;
  processPid: string;
  processGroupId: string;
  hasInMemoryHandle: boolean;
  safeTail: string | null;
  recentEventsMarkdown: string;
  childIssuesMarkdown: string;
  blockersMarkdown: string;
}): string {
  const levelLabel = formatStaleRunLevelLabel(input.level);
  return [
    `Paperclip 在活跃心跳运行中检测到${levelLabel}输出静默。`,
    "",
    "## 运行",
    "",
    `- 运行: ${input.runLink}`,
    `- 智能体: ${input.agentName}（${input.adapterType}）`,
    `- 唤起: ${input.invocation}`,
    `- 源事务: ${input.sourceIssueLink}`,
    `- 开始于: ${input.startedAt}`,
    `- 进程开始于: ${input.processStartedAt}`,
    `- 最后输出于: ${input.lastOutputAt}`,
    `- 最后输出序号: ${input.lastOutputSeq}`,
    `- 已静默: ${formatDurationMs(input.silenceAgeMs)}`,
    `- 阈值: ${formatStaleRunLevelLabel("suspicious")} ${formatDurationMs(input.suspiciousThresholdMs)} 后，${formatStaleRunLevelLabel("critical")} ${formatDurationMs(input.criticalThresholdMs)} 后`,
    `- 进程元数据: pid \`${input.processPid}\`，进程组 \`${input.processGroupId}\`，内存句柄 \`${input.hasInMemoryHandle ? "是" : "否"}\``,
    "",
    "## 最后输出摘录",
    "",
    input.safeTail ? `\`\`\`text\n${input.safeTail}\n\`\`\`` : "_无可用运行日志尾部。_",
    "",
    "## 最近运行事件",
    "",
    input.recentEventsMarkdown,
    "",
    "## 相关工作",
    "",
    "活跃子事务:",
    input.childIssuesMarkdown,
    "",
    "当前源阻塞项:",
    input.blockersMarkdown,
    "",
    "## 决策清单",
    "",
    "- 若运行有意保持安静，可继续或延后处理。",
    "- 若工作可能在转写外委派，请向运行负责人确认上下文。",
    "- 在取消前保留工件、分支状态与有用输出。",
    "- 经授权时通过显式运行恢复控件取消或恢复。",
    "- 仅在记录原因后，才可将此事务作为误报关闭。",
  ].join("\n");
}

export function buildStaleRunEvaluationTitle(agentName: string) {
  return `审阅 ${agentName} 的静默活跃运行`;
}

// ── Liveness escalation description (issue description, D-11 / D-12) ──

export function buildLivenessEscalationDescription(finding: {
  issueId: string;
  identifier: string | null;
  recoveryIssueId: string;
  incidentKey: string;
  state: string;
  dependencyPath: Array<{ identifier: string | null; issueId: string }>;
  reason: string;
  recommendedOwnerAgentId: string | null;
  recommendedOwnerCandidateAgentIds: string[];
  recommendedAction: string;
}): string {
  const source = finding.dependencyPath[0];
  const recovery = finding.dependencyPath.find((entry) => entry.issueId === finding.recoveryIssueId);
  const selectedOwner = finding.recommendedOwnerAgentId ?? "无";

  return [
    "Paperclip 在事务依赖图中检测到 harness 级存活事件。",
    "",
    "## 来源",
    "",
    `- 源事务: ${source?.identifier ?? source?.issueId ?? finding.issueId}`,
    `- 恢复目标事务: ${recovery?.identifier ?? recovery?.issueId ?? finding.recoveryIssueId}`,
    `- 事件键: \`${finding.incidentKey}\``,
    `- 检测到的不变量: \`${finding.state}\``,
    `- 依赖路径: ${finding.dependencyPath.map((entry) => entry.identifier ?? entry.issueId).join(" -> ")}`,
    `- 原因: ${finding.reason}`,
    "",
    "## 归属",
    "",
    `- 选定的负责人: \`${selectedOwner}\``,
    `- 候选负责人: ${finding.recommendedOwnerCandidateAgentIds.length > 0 ? finding.recommendedOwnerCandidateAgentIds.map((id) => `\`${id}\``).join(", ") : "无"}`,
    "",
    "## 下一步",
    "",
    finding.recommendedAction,
    "",
    "解决阻塞链后，将此升级事务标记为 done，以便原事务在所有阻塞清除后恢复执行。",
  ].join("\n");
}

// ── Liveness original issue comment (posted on source issue) ──

export function buildLivenessOriginalIssueComment(
  finding: { incidentKey: string; state: string; reason: string; recommendedAction: string },
  escalation: { identifier: string | null; id: string },
) {
  return [
    "Paperclip 在此事务的依赖图中检测到 harness 级存活事件。",
    "",
    `- 升级事务: ${escalation.identifier ?? escalation.id}`,
    `- 事件键: \`${finding.incidentKey}\``,
    `- 发现: \`${finding.state}\``,
    `- 原因: ${finding.reason}`,
    `- 已请求管理器操作: ${finding.recommendedAction}`,
    "",
    "此事务保留其原有阻塞项，同时也被升级事务阻塞，以便依赖唤醒保持明确。",
  ].join("\n");
}

// ── Nested stranded recovery line (suppressed nested recovery) ──

export function buildNestedStrandedRecoveryLine(sourceIssueLink: string) {
  return [
    "",
    "- 嵌套恢复：已抑制，因为此事务已经是 `stranded_issue_recovery` 类型的事务。",
    sourceIssueLink,
    "- 下一步：恢复经办人或看板管理员应修复运行时/适配器问题，解决或重新指派原始源事务，然后将此恢复事务标记为 done 或 cancelled。",
  ].join("\n");
}

// ── Successful run handoff exhausted comment (body for recovery issue) ──

export const SUCCESSFUL_RUN_HANDOFF_EXHAUSTED_COMMENT = [
  "Paperclip 已用尽对有成功运行但仍未获得有效事务处置的有界修正交接。",
  "",
  "这不是运行时/适配器崩溃报告。源运行已成功；剩余问题是缺失 `done`、`in_review`、`blocked`、委派后续或显式续跑路径。",
  "",
  "## 安全证据",
  "",
  "- 检查源事务和运行元数据，而非原始对话记录摘录。",
  "- 选择有效的事务处置：`done`/`cancelled`、`in_review` 并指定负责人、`blocked` 并提供一级阻塞项、委派后续工作，或显式续跑路径。",
  "- 当源事务有明确的负责人和处置后，将此恢复事务标记为 done。",
].join("\n");

// ── Stranded assigned issue exhausted comment ──

export const STRANDED_ASSIGNED_ISSUE_EXHAUSTED_COMMENT = [
  "Paperclip 已用尽对已指派事务的自动恢复，并创建了此显式恢复任务。",
  "",
  "## 来源",
  "",
  "- 选定的负责人：首个可用且具有预算的管理者/创建者/执行候选人。",
  "",
  "## 所需操作",
  "",
  "- 检查最近运行和源事务状态。",
  "- 修复运行时/适配器问题，重新指派源事务，或将源事务转换为清晰的手动审阅状态。",
  "- 当源事务有活跃执行路径或已被有意解决后，将此恢复事务标记为 done。",
].join("\n");

// ── Recovery follow-up lines (recoveryLine variants) ──

export function buildRecoveryLineWithIssue(recoveryIssueLink: string, recoveryOwnerName: string) {
  return [
    "",
    `- 恢复事务：${recoveryIssueLink}`,
    `- 恢复负责人：${recoveryOwnerName}`,
    "- 下一步：恢复负责人应恢复实时执行路径或记录手动处理结果，然后将此恢复事务标记为 done。",
  ].join("\n");
}

export const RECOVERY_LINE_DISABLED = [
  "",
  "- 恢复事务：未创建 — 此服务器实例已禁用自动滞留事务恢复（`PAPERCLIP_STRANDED_ISSUE_RECOVERY_ENABLED=false`）。",
  "- 下一步：手动处理此事务，或将环境变量设为 `true` 后重启服务器。",
].join("\n");

export const RECOVERY_LINE_NO_INVOKABLE_OWNER = [
  "",
  "- 恢复事务：未创建，因为 Paperclip 无法找到可用的管理者、创建者或执行负责人且具有可用预算。",
  "- 下一步：看板管理员应指派可用的恢复负责人，修复智能体/运行时状态，或记录有意的手动处理结果。",
].join("\n");

// ── Automatic recovery retry comments ──

export const AUTO_RECOVERY_TODO_ASSIGNMENT_FAILED =
  "Paperclip 在此已指派 `todo` 事务丢失唤醒/运行后自动重试了派发，" +
  "但它仍然没有活跃执行路径。将其移至 `blocked` 以便人工介入。";

export const AUTO_RECOVERY_INPROGRESS_CONTINUATION_MADE_PROGRESS =
  "Paperclip 在此已指派 `in_progress` 事务的自动重试续跑取得了进展，" +
  "但它仍然没有活跃执行路径。将其移至 `blocked` 以便人工介入。";

export const AUTO_RECOVERY_INPROGRESS_CONTINUATION_FAILED =
  "Paperclip 在此已指派 `in_progress` 事务的活跃执行消失后自动重试了续跑，" +
  "但它仍然没有活跃执行路径。将其移至 `blocked` 以便人工介入。";

// ── Successful run handoff notice (metadata labels — displayed in Board) ──

export const HANDOFF_NOTICE_TITLE_REQUIRED = "缺失事务处置";
export const HANDOFF_NOTICE_TITLE_EXHAUSTED = "缺失处置恢复阻塞";
export const HANDOFF_SECTION_REQUIRED_ACTION = "所需操作";
export const HANDOFF_SECTION_RUN_EVIDENCE = "运行证据";
export const HANDOFF_SECTION_RECOVERY_OWNER = "恢复负责人";
export const HANDOFF_LABEL_SOURCE_ISSUE = "源事务";
export const HANDOFF_LABEL_ASSIGNEE = "经办人";
export const HANDOFF_LABEL_MISSING_DISPOSITION = "缺失处置";
export const HANDOFF_LABEL_VALID_DISPOSITIONS = "有效处置";
export const HANDOFF_LABEL_DETECTED_PROGRESS = "检测到的进展";
export const HANDOFF_LABEL_AUTOMATIC_RETRY = "自动重试";
export const HANDOFF_LABEL_RECOVERY_ISSUE = "恢复事务";
export const HANDOFF_LABEL_RECOVERY_OWNER = "恢复负责人";
export const HANDOFF_LABEL_SOURCE_ASSIGNEE = "源经办人";
export const HANDOFF_LABEL_SUGGESTED_ACTION = "建议操作";
export const HANDOFF_LABEL_SOURCE_RUN = "源运行";
export const HANDOFF_LABEL_CORRECTIVE_HANDOFF_RUN = "修正交接运行";
export const HANDOFF_LABEL_LATEST_ISSUE_STATUS = "最新事务状态";
export const HANDOFF_LABEL_LATEST_HANDOFF_RUN_STATUS = "最新交接运行状态";
export const HANDOFF_LABEL_NORMALIZED_CAUSE = "标准化原因";
export const HANDOFF_VALUE_ONE_RETRY_QUEUED = "已排队一次修正交接唤醒";
export const HANDOFF_VALUE_CHOOSE_DISPOSITION = "选择并记录有效的事务处置，不要复制对话记录内容";
export const HANDOFF_VALUE_VALID_DISPOSITIONS =
  "done、cancelled、in_review 并指定负责人、blocked 并提供阻塞项、委派后续工作，或显式续跑";

// ── Recovery notice body constants (used in SQL queries — keep stable) ──
// These are the canonical zh-CN values. The SQL query in heartbeat.ts
// uses these constants directly, so any change here must be accompanied
// by a migration or update to the query.

export const SUCCESSFUL_RUN_HANDOFF_REQUIRED_NOTICE_BODY =
  "Paperclip 需要事务处置才能继续。";

export const SUCCESSFUL_RUN_HANDOFF_EXHAUSTED_NOTICE_BODY =
  "Paperclip 无法自动解决此事务缺失处置的问题。该事务已被恢复负责人阻塞。";

export const LEGACY_SUCCESSFUL_RUN_HANDOFF_NOTICE_PREFIXES = [
  "## This issue still needs a next step",
  "## Successful run missing issue disposition",
  "Paperclip needs a disposition before this issue can continue.",
  "Paperclip could not resolve this issue's missing disposition automatically. The issue is blocked on a recovery owner.",
] as const;

// ── Run liveness continuation ──

export const RUN_LIVENESS_CONTINUATION_INSTRUCTION =
  "上一次运行结束但没有具体进展。现在采取第一个具体行动，或将事务标记为阻塞并提供明确的解除请求。";
