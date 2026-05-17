import { describe, expect, it } from "vitest";
import {
  compressWakeCommentBodiesForInjection,
  DEFAULT_COMPANY_COMMENT_WAKE_TIER,
  resolveEffectiveCommentWakeTier,
} from "../services/comment-wake-tier.js";

describe("comment wake tier — resolveEffectiveCommentWakeTier", () => {
  it("uses company default when issue field is null", () => {
    expect(
      resolveEffectiveCommentWakeTier({
        storedTier: null,
        wakeKind: "assignee_comment",
      }),
    ).toBe(DEFAULT_COMPANY_COMMENT_WAKE_TIER);
  });

  it("uses stored issue tier for assignee comment wake", () => {
    expect(
      resolveEffectiveCommentWakeTier({
        storedTier: "allow_full_skills",
        wakeKind: "assignee_comment",
      }),
    ).toBe("allow_full_skills");
  });

  it("caps @mention wakes to at most read_thread when issue wants full skills", () => {
    expect(
      resolveEffectiveCommentWakeTier({
        storedTier: "allow_full_skills",
        wakeKind: "mention",
      }),
    ).toBe("read_thread");
  });

  it("does not escalate mention above stored tier when already lighter than read_thread", () => {
    expect(
      resolveEffectiveCommentWakeTier({
        storedTier: "receipt_only",
        wakeKind: "mention",
      }),
    ).toBe("receipt_only");
  });
});

describe("comment wake tier — compressWakeCommentBodiesForInjection", () => {
  it("drops empty bodies and consecutive duplicates after trim", () => {
    expect(
      compressWakeCommentBodiesForInjection(["hello", "  ", "hello", "world", "world"]),
    ).toEqual(["hello", "world"]);
  });

  it("keeps non-consecutive repeats", () => {
    expect(compressWakeCommentBodiesForInjection(["a", "b", "a"])).toEqual(["a", "b", "a"]);
  });
});
