import { describe, expect, it } from "vitest";
import { parseEffectiveTrigger } from "./wake-attribution.js";

describe("parseEffectiveTrigger", () => {
  it("returns null when snapshot missing or empty", () => {
    expect(parseEffectiveTrigger(null)).toBeNull();
    expect(parseEffectiveTrigger(undefined)).toBeNull();
    expect(parseEffectiveTrigger({})).toBeNull();
    expect(parseEffectiveTrigger({ effectiveTrigger: null })).toBeNull();
  });

  it("parses v1 winningInvocation", () => {
    const out = parseEffectiveTrigger({
      issueId: "i1",
      effectiveTrigger: {
        v: 1,
        winningInvocation: {
          source: "automation",
          reason: "issue_commented",
          triggerDetail: "system",
        },
        absorbed: [],
      },
    });
    expect(out).not.toBeNull();
    expect(out!.winning.source).toBe("automation");
    expect(out!.winning.reason).toBe("issue_commented");
    expect(out!.winning.triggerDetail).toBe("system");
    expect(out!.absorbed).toEqual([]);
  });

  it("parses absorbed entries with absorbedAt", () => {
    const out = parseEffectiveTrigger({
      effectiveTrigger: {
        v: 1,
        winningInvocation: { source: "automation", reason: "issue_commented", triggerDetail: null },
        absorbed: [
          {
            source: "timer",
            reason: "heartbeat_timer",
            triggerDetail: null,
            absorbedAt: "2026-05-17T12:00:00.000Z",
          },
        ],
        lastMergeAt: "2026-05-17T12:00:01.000Z",
      },
    });
    expect(out!.absorbed).toHaveLength(1);
    expect(out!.absorbed[0]!.source).toBe("timer");
    expect(out!.absorbed[0]!.absorbedAt).toBe("2026-05-17T12:00:00.000Z");
    expect(out!.lastMergeAt).toBe("2026-05-17T12:00:01.000Z");
  });

  it("returns null when winningInvocation incomplete", () => {
    expect(
      parseEffectiveTrigger({
        effectiveTrigger: { v: 1, absorbed: [], winningInvocation: { source: "timer" } },
      }),
    ).toBeNull();
  });
});
