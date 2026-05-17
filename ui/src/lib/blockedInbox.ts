import type {
  Issue,
  IssueBlockedInboxAttention,
  IssueBlockedInboxReason,
  IssueBlockedInboxSeverity,
} from "@paperclipai/shared";

export type BlockedReasonVariant =
  | "needs_decision"
  | "stalled"
  | "needs_attention"
  | "recovery_required"
  | "external_wait"
  | "owner_paused";

const VARIANT_BY_REASON: Record<IssueBlockedInboxReason, BlockedReasonVariant> = {
  pending_board_decision: "needs_decision",
  pending_user_decision: "needs_decision",
  missing_successful_run_disposition: "needs_decision",
  blocked_chain_stalled: "stalled",
  blocked_by_unassigned_issue: "needs_attention",
  blocked_by_assigned_backlog_issue: "needs_attention",
  blocked_by_cancelled_issue: "needs_attention",
  in_review_without_action_path: "needs_attention",
  invalid_review_participant: "needs_attention",
  open_recovery_issue: "recovery_required",
  external_owner_action: "external_wait",
  blocked_by_uninvokable_assignee: "owner_paused",
};

export const BLOCKED_REASON_VARIANT_ORDER: BlockedReasonVariant[] = [
  "needs_decision",
  "stalled",
  "needs_attention",
  "recovery_required",
  "external_wait",
  "owner_paused",
];

export const BLOCKED_VARIANT_LABELS: Record<BlockedReasonVariant, string> = {
  needs_decision: "需要决策",
  stalled: "阻塞链路停滞",
  needs_attention: "需要关注",
  recovery_required: "需要恢复",
  external_wait: "等待外部",
  owner_paused: "负责人暂停",
};

const REASON_LABELS: Record<IssueBlockedInboxReason, string> = {
  pending_board_decision: "等待董事会决策",
  pending_user_decision: "等待用户决策",
  missing_successful_run_disposition: "需要选择处置方式",
  blocked_chain_stalled: "阻塞链路停滞",
  blocked_by_unassigned_issue: "阻塞项未分配",
  blocked_by_assigned_backlog_issue: "阻塞项已搁置",
  blocked_by_cancelled_issue: "阻塞项已取消",
  in_review_without_action_path: "评审缺少行动路径",
  invalid_review_participant: "评审参与者无效",
  open_recovery_issue: "恢复事务进行中",
  external_owner_action: "等待外部负责人",
  blocked_by_uninvokable_assignee: "负责人暂停",
};

const SEVERITY_RANK: Record<IssueBlockedInboxSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type BlockedInboxBadgeTone = "muted" | "amber" | "red";

export function blockedReasonVariant(reason: IssueBlockedInboxReason): BlockedReasonVariant {
  return VARIANT_BY_REASON[reason] ?? "needs_attention";
}

export function blockedReasonLabel(reason: IssueBlockedInboxReason): string {
  return REASON_LABELS[reason] ?? "已停滞";
}

export function blockedVariantLabel(variant: BlockedReasonVariant): string {
  return BLOCKED_VARIANT_LABELS[variant];
}

export function blockedSeverityRank(severity: IssueBlockedInboxSeverity): number {
  return SEVERITY_RANK[severity] ?? 9;
}

export function compareBlockedAttention(
  a: IssueBlockedInboxAttention,
  b: IssueBlockedInboxAttention,
): number {
  const sevDiff = blockedSeverityRank(a.severity) - blockedSeverityRank(b.severity);
  if (sevDiff !== 0) return sevDiff;
  const aSince = a.stoppedSinceAt ? new Date(a.stoppedSinceAt).getTime() : Number.POSITIVE_INFINITY;
  const bSince = b.stoppedSinceAt ? new Date(b.stoppedSinceAt).getTime() : Number.POSITIVE_INFINITY;
  const sinceDiff = aSince - bSince;
  return Number.isFinite(sinceDiff) ? sinceDiff : 0;
}

export interface BlockedInboxIssueRow {
  issue: Issue;
  attention: IssueBlockedInboxAttention;
  variant: BlockedReasonVariant;
  reasonLabel: string;
  stoppedAtMs: number | null;
}

export type BlockedInboxGroupBy = "blocker_type" | "none";
export type BlockedInboxSort = "urgency" | "most_recent" | "longest_stopped";

export const BLOCKED_GROUP_OPTIONS: readonly [BlockedInboxGroupBy, string][] = [
  ["blocker_type", "阻塞类型"],
  ["none", "不分组"],
];

export const BLOCKED_SORT_OPTIONS: readonly [BlockedInboxSort, string][] = [
  ["urgency", "最紧急"],
  ["most_recent", "最近更新"],
  ["longest_stopped", "停滞最久"],
];

export interface BlockedInboxGroup {
  variant: BlockedReasonVariant;
  label: string;
  rows: BlockedInboxIssueRow[];
}

export function buildBlockedInboxRows(issues: readonly Issue[]): BlockedInboxIssueRow[] {
  const rows: BlockedInboxIssueRow[] = [];
  for (const issue of issues) {
    const attention = issue.blockedInboxAttention ?? synthesizeBlockedInboxAttention(issue);
    if (!attention) continue;
    rows.push({
      issue,
      attention,
      variant: blockedReasonVariant(attention.reason),
      reasonLabel: blockedReasonLabel(attention.reason),
      stoppedAtMs: attention.stoppedSinceAt ? new Date(attention.stoppedSinceAt).getTime() : null,
    });
  }
  return rows;
}

function issueRef(issue: Issue) {
  return {
    id: issue.id,
    identifier: issue.identifier ?? null,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId ?? null,
    assigneeUserId: issue.assigneeUserId ?? null,
  };
}

function synthesizeBlockedInboxAttention(issue: Issue): IssueBlockedInboxAttention | null {
  const blockerAttention = issue.blockerAttention;
  if (issue.status !== "blocked" || !blockerAttention || blockerAttention.state === "none") return null;

  const sampleIssueIdentifier =
    blockerAttention.sampleBlockerIdentifier ?? blockerAttention.sampleStalledBlockerIdentifier ?? null;
  const isStalled = blockerAttention.state === "stalled" || blockerAttention.stalledBlockerCount > 0;
  const needsAttention = blockerAttention.state === "needs_attention" || blockerAttention.attentionBlockerCount > 0;
  const reason: IssueBlockedInboxReason = isStalled ? "blocked_chain_stalled" : "blocked_by_unassigned_issue";
  const severity: IssueBlockedInboxSeverity = needsAttention ? "critical" : isStalled ? "high" : "medium";
  const detail = sampleIssueIdentifier
    ? `示例阻塞项：${sampleIssueIdentifier}`
    : `${blockerAttention.unresolvedBlockerCount} 个未解决阻塞项`;

  return {
    kind: "blocked",
    state: "needs_attention",
    reason,
    severity,
    stoppedSinceAt: String(issue.updatedAt),
    owner: {
      type: "unknown",
      agentId: null,
      userId: null,
      label: null,
    },
    action: {
      label: "检查阻塞链路",
      detail,
    },
    sourceIssue: issueRef(issue),
    leafIssue: null,
    recoveryIssue: null,
    approvalId: null,
    interactionId: null,
    sampleIssueIdentifier,
    redaction: {
      externalDetailsRedacted: false,
      secretFieldsOmitted: true,
    },
  };
}

function issueTimestampMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function blockedRowRecencyMs(row: BlockedInboxIssueRow): number {
  return row.stoppedAtMs ?? issueTimestampMs(row.issue.updatedAt) ?? 0;
}

function compareBlockedRowsByTitle(a: BlockedInboxIssueRow, b: BlockedInboxIssueRow): number {
  const byTitle = a.issue.title.localeCompare(b.issue.title);
  if (byTitle !== 0) return byTitle;
  return a.issue.id.localeCompare(b.issue.id);
}

export function compareBlockedRows(
  a: BlockedInboxIssueRow,
  b: BlockedInboxIssueRow,
  sort: BlockedInboxSort = "urgency",
): number {
  if (sort === "most_recent") {
    const recencyDiff = blockedRowRecencyMs(b) - blockedRowRecencyMs(a);
    if (recencyDiff !== 0) return recencyDiff;
    const attentionDiff = compareBlockedAttention(a.attention, b.attention);
    if (attentionDiff !== 0) return attentionDiff;
    return compareBlockedRowsByTitle(a, b);
  }

  if (sort === "longest_stopped") {
    const aStopped = a.stoppedAtMs ?? Number.POSITIVE_INFINITY;
    const bStopped = b.stoppedAtMs ?? Number.POSITIVE_INFINITY;
    const stoppedDiff = aStopped - bStopped;
    if (stoppedDiff !== 0) return stoppedDiff;
    const severityDiff = blockedSeverityRank(a.attention.severity) - blockedSeverityRank(b.attention.severity);
    if (severityDiff !== 0) return severityDiff;
    return compareBlockedRowsByTitle(a, b);
  }

  const attentionDiff = compareBlockedAttention(a.attention, b.attention);
  if (attentionDiff !== 0) return attentionDiff;
  const recencyDiff = blockedRowRecencyMs(b) - blockedRowRecencyMs(a);
  if (recencyDiff !== 0) return recencyDiff;
  return compareBlockedRowsByTitle(a, b);
}

export function sortBlockedInboxRows(
  rows: readonly BlockedInboxIssueRow[],
  sort: BlockedInboxSort = "urgency",
): BlockedInboxIssueRow[] {
  return [...rows].sort((a, b) => compareBlockedRows(a, b, sort));
}

export function groupBlockedInboxRows(
  rows: readonly BlockedInboxIssueRow[],
  sort: BlockedInboxSort = "urgency",
): BlockedInboxGroup[] {
  const buckets = new Map<BlockedReasonVariant, BlockedInboxIssueRow[]>();
  for (const row of rows) {
    const list = buckets.get(row.variant) ?? [];
    list.push(row);
    buckets.set(row.variant, list);
  }
  const groups: BlockedInboxGroup[] = [];
  for (const variant of BLOCKED_REASON_VARIANT_ORDER) {
    const list = buckets.get(variant);
    if (!list || list.length === 0) continue;
    const sorted = sortBlockedInboxRows(list, sort);
    groups.push({ variant, label: BLOCKED_VARIANT_LABELS[variant], rows: sorted });
  }
  return groups;
}

export function blockedRowMatchesSearch(row: BlockedInboxIssueRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.issue.title,
    row.issue.identifier ?? "",
    row.attention.owner.label ?? "",
    row.attention.action.label,
    row.attention.action.detail ?? "",
    row.reasonLabel,
    row.attention.leafIssue?.identifier ?? "",
    row.attention.leafIssue?.title ?? "",
    row.attention.recoveryIssue?.identifier ?? "",
    row.attention.recoveryIssue?.title ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function blockedBadgeTone(rows: readonly BlockedInboxIssueRow[]): BlockedInboxBadgeTone {
  if (rows.length === 0) return "muted";
  let highest: IssueBlockedInboxSeverity = "low";
  for (const row of rows) {
    if (blockedSeverityRank(row.attention.severity) < blockedSeverityRank(highest)) {
      highest = row.attention.severity;
    }
  }
  if (highest === "critical") return "red";
  if (highest === "high") return "amber";
  return "muted";
}

export function formatStoppedAge(stoppedSinceAt: string | null, now: number = Date.now()): string {
  if (!stoppedSinceAt) return "已停滞";
  const then = new Date(stoppedSinceAt).getTime();
  if (!Number.isFinite(then)) return "已停滞";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "刚刚停滞";
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `停滞 ${m} 分钟`;
  }
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    return `停滞 ${h} 小时`;
  }
  if (seconds < 86_400 * 7) {
    const d = Math.floor(seconds / 86_400);
    return `停滞 ${d} 天`;
  }
  if (seconds < 86_400 * 30) {
    const w = Math.floor(seconds / (86_400 * 7));
    return `停滞 ${w} 周`;
  }
  const mo = Math.floor(seconds / (86_400 * 30));
  return `停滞 ${mo} 个月`;
}
