import { describe, expect, it } from "vitest";
import {
  initialEffectiveTrigger,
  mergeCoalescedContextSnapshot,
  mergeEffectiveTriggerPayload,
  wakeupInvocationPriority,
} from "../services/heartbeat.js";

describe("wakeup-merge-attribution", () => {
  it("ranks timer below automation and assignment", () => {
    expect(wakeupInvocationPriority("timer")).toBeLessThan(wakeupInvocationPriority("automation"));
    expect(wakeupInvocationPriority("timer")).toBeLessThan(wakeupInvocationPriority("assignment"));
  });

  it("prefers automation over timer when merging", () => {
    const existing = {
      issueId: "i1",
      wakeReason: "heartbeat_timer",
      effectiveTrigger: initialEffectiveTrigger({
        source: "timer",
        reason: "heartbeat_timer",
        triggerDetail: null,
      }),
    };
    const next = mergeEffectiveTriggerPayload(
      existing,
      { source: "automation", reason: "issue_commented", triggerDetail: "system" },
      { source: "timer", reason: "heartbeat_timer", triggerDetail: null },
    );
    expect(next.winningInvocation.source).toBe("automation");
    expect(next.winningInvocation.reason).toBe("issue_commented");
    expect(next.absorbed.length).toBeGreaterThanOrEqual(1);
    expect(next.absorbed.some((a) => a.source === "timer")).toBe(true);
  });

  it("on equal priority, incoming wins and prior winning is absorbed", () => {
    const existing = {
      effectiveTrigger: initialEffectiveTrigger({
        source: "automation",
        reason: "issue_commented",
        triggerDetail: null,
      }),
    };
    const next = mergeEffectiveTriggerPayload(
      existing,
      { source: "automation", reason: "issue_reopened_via_comment", triggerDetail: "system" },
      { source: "automation", reason: "issue_commented", triggerDetail: null },
    );
    expect(next.winningInvocation.reason).toBe("issue_reopened_via_comment");
    expect(next.absorbed.some((a) => a.reason === "issue_commented")).toBe(true);
  });

  it("mergeCoalescedContextSnapshot records effectiveTrigger when attribution provided", () => {
    const merged = mergeCoalescedContextSnapshot(
      {
        issueId: "i1",
        wakeReason: "heartbeat_timer",
        effectiveTrigger: initialEffectiveTrigger({
          source: "timer",
          reason: "heartbeat_timer",
          triggerDetail: null,
        }),
      },
      {
        issueId: "i1",
        commentId: "c2",
        wakeCommentId: "c2",
        wakeReason: "issue_commented",
        effectiveTrigger: initialEffectiveTrigger({
          source: "automation",
          reason: "issue_commented",
          triggerDetail: "system",
        }),
      },
      {
        existingMeta: { source: "timer", reason: "heartbeat_timer", triggerDetail: null },
        incomingMeta: { source: "automation", reason: "issue_commented", triggerDetail: "system" },
      },
    );
    expect(merged.effectiveTrigger).toMatchObject({
      v: 1,
      winningInvocation: { source: "automation", reason: "issue_commented" },
    });
    expect(merged.wakeCommentId).toBe("c2");
  });
});
