import { describe, expect, it } from "vitest";
import {
  collectCodeBuddyResultErrorTexts,
  isCodeBuddyQuotaExhaustionText,
  resolveCodeBuddyTerminalError,
} from "./codebuddy-error-text.js";

describe("collectCodeBuddyResultErrorTexts", () => {
  it("reads errors[] before generic result text", () => {
    const texts = collectCodeBuddyResultErrorTexts({
      result: "CodeBuddy 返回错误结果，无头模式无法在同一次运行内恢复。",
      errors: [
        "429 You exceeded your 5-hour usage quota. Reset at 2026-05-21 04:47:47 +0800.",
      ],
    });
    expect(texts.some((text) => text.includes("429"))).toBe(true);
  });
});

describe("resolveCodeBuddyTerminalError", () => {
  it("maps 429 in errors[] to codebuddy_quota_exceeded", () => {
    const resolved = resolveCodeBuddyTerminalError({
      resultTexts: [
        "429 You exceeded your 5-hour usage quota. Reset at 2026-05-21 04:47:47 +0800.",
      ],
      fallbackMessage: "fallback",
    });
    expect(resolved.errorCode).toBe("codebuddy_quota_exceeded");
    expect(resolved.errorMessage).toContain("429");
  });
});

describe("isCodeBuddyQuotaExhaustionText", () => {
  it("matches 5-hour usage quota phrasing", () => {
    expect(
      isCodeBuddyQuotaExhaustionText("429 You exceeded your 5-hour usage quota."),
    ).toBe(true);
  });
});
