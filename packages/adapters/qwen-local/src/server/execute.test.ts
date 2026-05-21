import { describe, it, expect } from "vitest";
import { buildQwenParseSkippedSummary, renderPaperclipApiAccessNote } from "./execute.js";

describe("renderPaperclipApiAccessNote", () => {
  it("returns empty when API env is missing", () => {
    expect(renderPaperclipApiAccessNote({})).toBe("");
  });

  it("documents Windows-safe UTF-8 comment POST for Qwen", () => {
    const note = renderPaperclipApiAccessNote({
      PAPERCLIP_API_URL: "http://localhost:4100",
      PAPERCLIP_API_KEY: "test-key",
    });
    expect(note).toContain("-Encoding utf8");
    expect(note).toContain("UTF8.GetBytes");
    expect(note).toContain("pwsh");
  });
});

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
