import { describe, it, expect } from "vitest";
import { buildQwenParseSkippedSummary } from "./execute.js";

describe("buildQwenParseSkippedSummary", () => {
  it("returns empty-output notice when stdout is blank", () => {
    expect(buildQwenParseSkippedSummary("   \n")).toContain("no parseable JSON");
  });

  it("truncates very long stdout for summary field", () => {
    const huge = "x".repeat(200_000);
    const out = buildQwenParseSkippedSummary(huge);
    expect(out.length).toBeLessThan(huge.length);
    expect(out).toContain("truncated");
  });
});
