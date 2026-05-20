import type { Agent } from "@paperclipai/shared";
import { describe, expect, it } from "vitest";
import { formatActivityVerb, formatIssueActivityAction } from "./activity-format";

describe("activity formatting", () => {
  const agentMap = new Map<string, Agent>([
    ["agent-reviewer", { id: "agent-reviewer", name: "Reviewer Bot" } as Agent],
    ["agent-approver", { id: "agent-approver", name: "Approver Bot" } as Agent],
  ]);

  it("formats blocker activity using linked issue identifiers", () => {
    const details = {
      addedBlockedByIssues: [
        { id: "issue-2", identifier: "PAP-22", title: "Blocked task" },
      ],
      removedBlockedByIssues: [],
    };

    expect(formatActivityVerb("issue.blockers_updated", details)).toBe("添加了 阻塞 PAP-22 于");
    expect(formatIssueActivityAction("issue.blockers_updated", details)).toBe("添加了 阻塞 PAP-22");
  });

  it("formats reviewer activity using agent names", () => {
    const details = {
      addedParticipants: [
        { type: "agent", agentId: "agent-reviewer", userId: null },
      ],
      removedParticipants: [],
    };

    expect(formatActivityVerb("issue.reviewers_updated", details, { agentMap })).toBe(
      "添加了 审查者 Reviewer Bot 于",
    );
    expect(formatIssueActivityAction("issue.reviewers_updated", details, { agentMap })).toBe(
      "添加了 审查者 Reviewer Bot",
    );
  });

  it("formats approver removals using user-aware labels", () => {
    const details = {
      addedParticipants: [],
      removedParticipants: [
        { type: "user", agentId: null, userId: "local-board" },
      ],
    };

    expect(formatActivityVerb("issue.approvers_updated", details)).toBe("移除了 审批者 董事会 于");
    expect(formatIssueActivityAction("issue.approvers_updated", details)).toBe("移除了 审批者 董事会");
  });

  it("falls back to updated wording when reviewers are both added and removed", () => {
    const details = {
      addedParticipants: [
        { type: "agent", agentId: "agent-reviewer", userId: null },
      ],
      removedParticipants: [
        { type: "agent", agentId: "agent-approver", userId: null },
      ],
    };

    expect(formatActivityVerb("issue.reviewers_updated", details, { agentMap })).toBe("更新了 审查者 于");
    expect(formatIssueActivityAction("issue.reviewers_updated", details, { agentMap })).toBe("更新了 审查者");
  });

  it("formats monitor activity with direct verbs", () => {
    expect(formatActivityVerb("issue.monitor_scheduled")).toBe("为…安排了监控");
    expect(formatActivityVerb("issue.monitor_exhausted")).toBe("耗尽了…的监控");
    expect(formatIssueActivityAction("issue.monitor_triggered")).toBe("触发了一个监控");
    expect(formatIssueActivityAction("issue.monitor_cleared")).toBe("清除了一监控");
    expect(formatIssueActivityAction("issue.monitor_recovery_issue_created")).toBe("创建了一个监控恢复事务");
  });

  it("uses plain next-step copy for successful-run handoff activity", () => {
    expect(formatActivityVerb("issue.successful_run_handoff_required")).toBe("标记缺少下一步于");
    expect(formatIssueActivityAction("issue.successful_run_handoff_required")).toBe("运行完成但未明确下一步");
    expect(formatIssueActivityAction("issue.successful_run_handoff_resolved")).toBe("已选择下一步");
    expect(formatIssueActivityAction("issue.successful_run_handoff_escalated")).toBe(
      "运行完成但未明确下一步 — 已恢复负责人处理",
    );
  });

  it("localizes issue status values in update activity", () => {
    expect(
      formatIssueActivityAction("issue.updated", {
        status: "done",
        _previous: { status: "in_progress" },
      }),
    ).toBe("状态从 进行中 变更为 已完成");
    expect(formatIssueActivityAction("issue.updated", { status: "todo" })).toBe("状态变更为 待办");
  });

  it("formats read-state and inbox activity actions", () => {
    expect(formatIssueActivityAction("issue.read_marked")).toBe("标记事务为已读");
    expect(formatIssueActivityAction("issue.read_unmarked")).toBe("取消事务已读标记");
    expect(formatActivityVerb("issue.inbox_archived")).toBe("归档了收件箱中的");
  });
});
