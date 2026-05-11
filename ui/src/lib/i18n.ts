/**
 * Lightweight UI strings for Paperclip board UI (MVP).
 * Default locale: zh-CN. No runtime locale switching yet.
 */

import type { IssueBlockerAttention } from "@paperclipai/shared";

export const UI_LOCALE = "zh-CN" as const;

/** Issue workflow statuses (display only — API values stay English). */
const ISSUE_STATUS: Record<string, string> = {
  backlog: "待整理",
  todo: "待办",
  in_progress: "进行中",
  in_review: "审查中",
  done: "已完成",
  blocked: "阻塞",
  cancelled: "已取消",
  pending_approval: "待审批",
  failed: "失败",
  timed_out: "超时",
};

/** Agent lifecycle statuses */
const AGENT_STATUS: Record<string, string> = {
  active: "活跃",
  running: "运行中",
  idle: "空闲",
  paused: "已暂停",
  error: "错误",
  pending_approval: "待审批",
  terminated: "已终止",
  archived: "已归档",
};

/** Heartbeat / run record statuses */
const RUN_STATUS: Record<string, string> = {
  queued: "排队中",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
  timed_out: "超时",
  scheduled_retry: "已安排重试",
  cancelled: "已取消",
  completed: "已完成",
  // misc
  pending: "等待中",
  ok: "正常",
  warning: "警告",
  info: "信息",
};

/** Goal / project-style statuses that appear in StatusBadge */
const OTHER_ENTITY_STATUS: Record<string, string> = {
  planned: "已计划",
  achieved: "已达成",
  completed: "已完成",
  approved: "已批准",
  rejected: "已拒绝",
  revision_requested: "需修改",
};

function titleCaseUnderscores(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Issue + shared kanban / filters */
export function formatIssueStatus(status: string): string {
  return ISSUE_STATUS[status] ?? titleCaseUnderscores(status);
}

/** StatusBadge: issues, agents, runs, goals, approvals */
export function formatBadgeStatus(status: string): string {
  return (
    ISSUE_STATUS[status]
    ?? AGENT_STATUS[status]
    ?? RUN_STATUS[status]
    ?? OTHER_ENTITY_STATUS[status]
    ?? titleCaseUnderscores(status)
  );
}

/** Kanban / icon dropdown: same as issue statuses for known keys */
export function formatIssueStatusShort(status: string): string {
  return formatIssueStatus(status);
}

export const issueStatusLabelsBoard: Record<string, string> = {
  backlog: ISSUE_STATUS.backlog!,
  todo: ISSUE_STATUS.todo!,
  in_progress: ISSUE_STATUS.in_progress!,
  in_review: ISSUE_STATUS.in_review!,
  done: ISSUE_STATUS.done!,
  blocked: ISSUE_STATUS.blocked!,
  cancelled: ISSUE_STATUS.cancelled!,
};

/** Activity chart legend (Issues by Status) */
export function chartIssueStatusLabel(status: string): string {
  return formatIssueStatus(status);
}

const PRIORITY_ZH: Record<string, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

export function formatPriorityLabel(priority: string): string {
  return PRIORITY_ZH[priority] ?? titleCaseUnderscores(priority);
}

// ——— Run ledger / liveness (heartbeat UI) ———

export type LivenessCopyZh = { label: string; description: string };

const LIVENESS_ZH: Record<string, LivenessCopyZh> = {
  completed: { label: "已完成", description: "事务已达到终态。" },
  advanced: { label: "已推进", description: "运行产出了明确进展证据。" },
  plan_only: { label: "仅计划", description: "运行描述了后续工作，但缺少可验证行动。" },
  empty_response: { label: "空响应", description: "运行结束但没有有效输出。" },
  blocked: { label: "阻塞", description: "运行或事务声明了阻塞。" },
  failed: { label: "失败", description: "运行未成功结束。" },
  needs_followup: { label: "需跟进", description: "有输出但未证明实质进展。" },
};

export const LIVENESS_PENDING_ZH: LivenessCopyZh = {
  label: "结束后检测",
  description: "活跃度在运行结束后评估。",
};

export const LIVENESS_RETRY_PENDING_ZH: LivenessCopyZh = {
  label: "重试排队中",
  description: "Paperclip 已排队自动重试，尚未开始。",
};

export const LIVENESS_MISSING_ZH: LivenessCopyZh = {
  label: "无活跃度数据",
  description: "此运行未持久化活跃度分类。",
};

export function getLivenessCopyZh(state: string | undefined): LivenessCopyZh | undefined {
  if (!state) return undefined;
  return LIVENESS_ZH[state];
}

const RUN_OUTPUT_SILENCE_ZH: Partial<Record<string, { label: string }>> = {
  suspicious: { label: "静默监控" },
  critical: { label: "运行停滞" },
  snoozed: { label: "已暂停告警" },
};

export function runOutputSilenceLabelZh(level: string | undefined): string | undefined {
  if (!level) return undefined;
  return RUN_OUTPUT_SILENCE_ZH[level]?.label;
}

// ——— Retry badges (runRetryState.ts) ———

export const RETRY_REASON_ZH: Record<string, string> = {
  transient_failure: "瞬时故障",
  missing_issue_comment: "缺少事务评论",
  process_lost: "进程丢失",
  assignment_recovery: "分配恢复",
  issue_continuation_needed: "需要接续",
  max_turns_continuation: "达到轮次接续",
};

export const RETRY_BADGE_ZH = {
  continuationScheduled: "已安排接续",
  retryScheduled: "已安排重试",
  continuationExhausted: "接续耗尽",
  retryExhausted: "重试耗尽",
  continuedRun: "接续运行",
  retriedRun: "重试运行",
  nextContinuation: "下次接续",
  nextRetry: "下次重试",
  nextPendingSchedule: "等待排期",
  automaticRetriesExhausted: "自动重试已用尽",
} as const;

export const runRetryUi = {
  attemptLabel: (n: number) => `第 ${n} 次尝试`,
  manualInterventionPhrase: "Manual intervention required",
} as const;

// ——— Navigation & common pages ———

export const nav = {
  newIssue: "新建事务",
  search: "搜索",
  dashboard: "工作台",
  inbox: "收件箱",
  issues: "事务",
  routines: "例行任务",
  goals: "目标",
  workspaces: "工作区",
  work: "工作",
  org: "组织",
  skills: "技能",
  costs: "成本",
  activity: "活动",
  settings: "设置",
  company: "团队",
  agents: "智能体",
  sidebarAgents: "智能体",
  browseAgents: "浏览智能体",
  newAgent: "新建智能体",
  companies: "团队列表",
  newCompany: "新建团队",
  recentRuns: "最近运行",
} as const;

export const dashboard = {
  welcomeNoCompany: "欢迎使用 Paperclip。先创建团队与智能体即可开始。",
  getStarted: "开始",
  selectCompany: "创建或选择团队以查看工作台。",
  noAgentsBanner: "当前还没有智能体。",
  createAgentLink: "在此创建",
  budgetIncidents: (n: number) => `${n} 个预算事件`,
  budgetDetail: (pausedAgents: number, pausedProjects: number, pending: number) =>
    `${pausedAgents} 个智能体已暂停 · ${pausedProjects} 个项目已暂停 · ${pending} 笔待审批预算`,
  openBudgets: "查看预算",
  agentsEnabled: "可用智能体",
  runningPausedErrors: (running: number, paused: number, errors: number) =>
    `${running} 运行中，${paused} 已暂停，${errors} 错误`,
  tasksInProgress: "进行中事务",
  openBlocked: (open: number, blocked: number) => `${open} 未结，${blocked} 阻塞`,
  monthSpend: "本月支出",
  unlimitedBudget: "无预算上限",
  pctOfBudget: (pct: number | string, budget: string) => `${pct}% · 预算 ${budget}`,
  pendingApprovals: "待审批",
  budgetOverridesPending: (n: number) => `${n} 笔预算覆盖待董事会处理`,
  awaitingReview: "等待董事会处理",
  runActivity: "运行活动",
  last14Days: "最近 14 天",
  issuesByPriority: "按优先级",
  issuesByStatus: "按状态",
  successRate: "成功率",
  recentActivity: "最近活动",
  recentTasks: "最近事务",
  noTasksYet: "暂无事务。",
  noRunsYet: "尚无运行。",
  noIssuesYet: "暂无事务。",
  moreRuns: (n: number) => `还有 ${n} 个进行中或近期运行`,
} as const;

export const dashboardLive = {
  liveRunsBreadcrumb: "实时运行",
  createCompanyHint: "创建团队以查看实时运行。",
  selectCompanyHint: "选择团队以查看实时运行。",
  backDashboard: "工作台",
  title: "智能体实时运行",
  subtitle: "进行中的运行优先，其次为最近完成的运行。",
  showingUpTo: (n: number) => `最多显示 ${n} 条`,
  activeRecent: "进行中 / 最近",
  emptyRuns: "暂无活动或近期的智能体运行。",
} as const;

export const activeAgentsPanel = {
  defaultTitle: "智能体",
  defaultEmpty: "暂无最近的智能体运行。",
} as const;

export const companiesPage = {
  newCompany: "新建团队",
  title: "团队",
  loading: "正在加载团队…",
  agents: "智能体",
  agentCount: (n: number) => `${n} 个智能体`,
  issues: "事务",
  issueCount: (n: number) => `${n} 条事务`,
  budget: "预算",
  unlimitedBudget: "无预算上限",
  select: "当前",
  rename: "重命名",
  renameMenu: "重命名",
  delete: "删除",
  deleteCompany: "删除团队",
  cancel: "取消",
  save: "保存",
  confirmDelete: "确定删除此团队及全部数据？此操作不可撤销。",
  deleting: "删除中…",
  createdPrefix: "创建于",
} as const;

export const agentsPage = {
  all: "全部",
  active: "活跃",
  paused: "已暂停",
  error: "错误",
  filters: "筛选",
  showTerminated: "显示已终止",
  newAgent: "新建智能体",
  agentCount: (n: number) => `${n} 个智能体`,
  empty: "创建第一个智能体以开始。",
  emptySelectCompany: "选择团队以查看智能体。",
  noMatch: "没有符合筛选条件的智能体。",
  noOrg: "尚未定义组织层级。",
  list: "列表",
  tree: "组织",
  live: (n: number) => (n > 1 ? `进行中 (${n})` : "进行中"),
} as const;

export const agentDetail = {
  agentsCrumb: "智能体",
  runs: "运行",
  runPrefix: "运行",
  instructions: "指令",
  configuration: "配置",
  skills: "技能",
  budget: "预算",
  dashboard: "概览",
} as const;

export const issuesPage = {
  title: "事务",
  emptySelectCompany: "选择团队以查看事务。",
} as const;

export const issuesList = {
  searchPlaceholder: "搜索事务…",
  searchAria: "搜索事务",
  nextUp: "下一步",
  waitingBlockers: "等待阻塞项",
  board: "董事会",
  me: "我",
  noWorkspace: "无工作区",
  noProject: "无项目",
  noParent: "无父事务",
  unassigned: "未分配",
  user: "用户",
  createIssue: "创建事务",
  newIssue: "新建事务",
  listView: "列表视图",
  boardView: "看板视图",
  nestingToggle: "父子嵌套显示",
  columnsPicker: "选择显示的列",
  sort: "排序",
  group: "分组",
  colWorkflow: "工作流",
  colStatus: "状态",
  colPriority: "优先级",
  colTitle: "标题",
  colCreated: "创建时间",
  colUpdated: "更新时间",
  groupStatus: "状态",
  groupPriority: "优先级",
  groupAssignee: "经办人",
  groupProject: "项目",
  groupWorkspace: "工作区",
  groupParent: "父事务",
  groupNone: "不分组",
  noMatch: "没有符合当前筛选或搜索的事务。",
  paused: "已暂停",
  needsNext: "需要下一步",
  needsNextTitle: "此事务需要下一步操作",
  searchAssignees: "搜索经办人…",
  loadingMore: "加载更多事务…",
  scrollLoad: "滚动加载更多",
} as const;

export const onboarding = {
  addAgentTitle: (name: string) => `向 ${name} 添加智能体`,
  createAnotherCompany: "再创建一个团队",
  firstCompany: "创建你的第一个团队",
  addAgentDesc: "重新运行引导以为此团队添加智能体和入门任务。",
  anotherCompanyDesc: "重新运行引导以创建另一个团队并初始化首位智能体。",
  firstDesc: "从创建团队和你的第一位智能体开始。",
  addAgent: "添加智能体",
  startOnboarding: "开始引导",
  loading: "加载中…",
  firstCompanyTitle: "创建你的第一个团队",
  firstCompanyBody: "从创建一个团队开始。",
  newCompany: "新建团队",
} as const;

export const newIssue = {
  subIssue: "新建子事务",
  newIssue: "新建事务",
  titlePlaceholder: "事务标题",
  descriptionPlaceholder: "添加描述…",
  for: "分配给",
  assignee: "经办人",
  noAssignee: "无经办人",
  searchAssignees: "搜索经办人…",
  noAssignees: "未找到经办人。",
  discardDraft: "放弃草稿",
  creating: "正在创建…",
  creatingEllipsis: "创建中…",
  create: "创建事务",
  createSub: "创建子事务",
  failedCreateFallback: "创建事务失败，请重试。",
  statusBacklogDesc: "搁置 — 不会唤醒经办人",
  statusTodoDesc: "可执行 — 会唤醒经办人",
  workModeStandard: "标准",
  workModePlanning: "规划",
  execShared: "项目默认",
  execIsolated: "新建隔离工作区",
  execReuse: "复用已有工作区",
  execWorkspaceSection: "执行工作区",
  execWorkspacePolicyHint:
    "选择智能体执行任务时的工作区策略。API 与机器标识保持不变。",
  priorityChip: "优先级",
  upload: "上传",
  project: "项目",
  noProject: "无项目",
  searchProjects: "搜索项目…",
  noProjectsFound: "未找到项目。",
  reviewer: "审阅人",
  noReviewer: "无审阅人",
  searchReviewers: "搜索审阅人…",
  noReviewersFound: "未找到审阅人。",
  approver: "审批人",
  noApprover: "无审批人",
  searchApprovers: "搜索审批人…",
  noApproversFound: "未找到审批人。",
  addReviewerApprover: "添加审阅人或审批人",
  modelLane: "模型通道",
  model: "模型",
  defaultModel: "默认模型",
  searchModels: "搜索模型…",
  noModels: "未找到模型。",
  thinkingEffort: "思考强度",
  enableChrome: "启用 Chrome (--chrome)",
  documents: "文档",
  attachments: "附件",
  removeDocument: "移除文档",
  removeAttachment: "移除附件",
  startDate: "开始日期",
  dueDate: "截止日期",
  backlogAssignWarning:
    "分配经办人表示可执行意图；若仅为搁置请保持「待整理」。在状态为「待办」或「进行中」之前，经办人不会被唤醒。",
  agentOptions: "智能体选项",
  claudeOptions: "Claude 选项",
  codexOptions: "Codex 选项",
  opencodeOptions: "OpenCode 选项",
  reusingWorkspaceLine: (name: string, location: string) => `复用 ${name}（${location}）。`,
  existingWorkspaceFallback: "既有执行工作区",
  subIssueOf: "父事务",
  chooseReuseWorkspace: "选择已有工作区",
  subIssueWorkspaceMismatch: (parentLabel: string | undefined) =>
    parentLabel
      ? `警告：此子事务将不再使用父事务工作区（${parentLabel}）。`
      : "警告：此子事务将不再使用父事务工作区。",
  primaryLaneHelp: "使用智能体主模型运行。",
  customLaneHelp: "仅为本事务覆盖模型与思考强度。",
  modelLanePrimary: "主模型",
  modelLaneCheap: "经济通道",
  modelLaneCustom: "自定义",
  inProjectRow: "于",
  priority: {
    critical: "紧急",
    high: "高",
    medium: "中",
    low: "低",
  },
  thinkingDefault: "默认",
  thinkingMinimal: "最低",
  thinkingLow: "低",
  thinkingMedium: "中",
  thinkingHigh: "高",
  thinkingXHigh: "极高",
  thinkingMax: "最高",
} as const;

export const newAgent = {
  title: "添加智能体",
  recommendBody:
    "建议由 CEO 负责智能体配置 — 他们了解组织结构，能设置汇报关系、权限与适配器。",
  askCeo: "请 CEO 创建新智能体",
  advancedLink: "我要自行高级配置",
  back: "返回",
  chooseAdapter: "选择适配器类型以进行高级设置。",
  recommended: "推荐",
} as const;

export const sidebarCompany = {
  selectWorkspace: "选择工作区",
  openSwitcher: "打开工作区切换",
  edit: "编辑",
  done: "完成",
  noWorkspaces: "暂无工作区",
  addCompany: "添加团队…",
  invite: "邀请成员",
  inviteTo: (name: string) => `邀请加入 ${name}`,
  companySettings: "团队设置",
  signingOut: "正在退出…",
  signOut: "退出登录",
} as const;

export const issueBreadcrumb = {
  inbox: "收件箱",
  issues: "事务",
} as const;

export const issueFilters = {
  all: "全部",
  active: "活跃",
  backlog: "待整理",
  done: "已完成",
} as const;

export const mobileNav = {
  create: "新建",
} as const;

export const runLedger = {
  sectionTitle: "运行账本",
  waitingFirst: "等待第一条运行记录。",
  noRunsLinked: "尚未关联运行。",
  latestRun: "最新运行",
  childWork: "子事务",
  activeDoneCancelled: (active: number, done: number, cancelled: number) =>
    `${active} 个进行中，${done} 已完成，${cancelled} 已取消`,
  allTerminal: (total: number, done: number, cancelled: number) =>
    `全部 ${total} 个已结束（${done} 完成，${cancelled} 取消）`,
  more: (n: number) => `另有 ${n} 个`,
  staleAlert: "停滞运行告警",
  silenceWarn: "输出静默监控",
  silentFor: "最近活跃运行已静默",
  extended: "较长时间",
  recoveryReview: "查看恢复上下文。",
  continueMonitoring: "继续监控",
  snooze1h: "推迟 1 小时",
  falsePositive: "标记误报",
  watchdogNotRecorded: "看门狗决策未记录",
  emptyHistory: "有历史后，运行与活动将显示在此。",
  emptyLegacy: "关联到该事务的历史运行将显示在此（即使无活跃度元数据）。",
  run: "运行",
  by: "由",
  live: "实时",
  exhausted: "已耗尽",
  continuationAttempt: (n: number) => `接续尝试 ${n}`,
  stopRetryPending: "重试等待中",
  stopQueued: "等待开始",
  stopRunning: "仍在运行",
  stopUnavailable: "不可用",
  stopNoReason: "无停止原因",
  waitingNextAttempt: "等待下一次尝试",
  noActionYet: "尚无动作记录",
  noConcreteAction: "无具体动作",
  noUsefulOutput: "无有效输出",
  noneRecorded: "无记录",
  underOneMinute: "不足 1 分钟",
  minutes: (n: number) => `${n} 分钟`,
  hours: (n: number) => `${n} 小时`,
  hoursMinutes: (h: number, m: number) => `${h} 小时 ${m} 分钟`,
} as const;

/** Blocked state detail for StatusIcon (parity with former English helper). */
export function formatBlockedAttentionLabel(blockerAttention: IssueBlockerAttention | null | undefined): string {
  if (!blockerAttention || blockerAttention.state === "none") return "阻塞";

  if (blockerAttention.reason === "active_child") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return `阻塞 · 等待活跃子事务 ${blockerAttention.sampleBlockerIdentifier}`;
    }
    if (count === 1) return "阻塞 · 等待 1 个活跃子事务";
    return `阻塞 · 等待 ${count} 个活跃子事务`;
  }

  if (blockerAttention.reason === "active_dependency") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return `阻塞 · 由活跃依赖 ${blockerAttention.sampleBlockerIdentifier} 覆盖`;
    }
    if (count === 1) return "阻塞 · 由 1 个活跃依赖覆盖";
    return `阻塞 · 由 ${count} 个活跃依赖覆盖`;
  }

  if (blockerAttention.reason === "stalled_review") {
    const count = blockerAttention.stalledBlockerCount;
    const leaf =
      blockerAttention.sampleStalledBlockerIdentifier ?? blockerAttention.sampleBlockerIdentifier;
    if (count === 1 && leaf) return `阻塞 · 审查停滞于 ${leaf}`;
    if (count === 1) return "阻塞 · 审查停滞，缺少明确下一步";
    return `阻塞 · ${count} 项审查停滞，缺少明确下一步`;
  }

  if (blockerAttention.reason === "attention_required") {
    const count =
      blockerAttention.attentionBlockerCount || blockerAttention.unresolvedBlockerCount;
    const attentionCopy = `${count} 个阻塞项需要处理`;
    const coveredCount = blockerAttention.coveredBlockerCount;
    if (coveredCount > 0) {
      return `阻塞 · ${attentionCopy}；${coveredCount} 个已由活跃工作覆盖`;
    }
    return `阻塞 · ${attentionCopy}`;
  }

  return "阻塞";
}
