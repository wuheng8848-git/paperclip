import { describe, it, expect } from "vitest";
import { resolveCodeBuddyBillingType, buildParseSkippedSummary } from "./execute.js";

describe("resolveCodeBuddyBillingType", () => {
  it("returns subscription when no API keys are set", () => {
    expect(resolveCodeBuddyBillingType({})).toBe("subscription");
  });

  it("returns api when CODEBUDDY_API_KEY is set", () => {
    expect(resolveCodeBuddyBillingType({ CODEBUDDY_API_KEY: "sk-xxx" })).toBe("api");
  });

  it("returns api when OPENAI_API_KEY is set", () => {
    expect(resolveCodeBuddyBillingType({ OPENAI_API_KEY: "sk-xxx" })).toBe("api");
  });

  it("returns api when ANTHROPIC_API_KEY is set", () => {
    expect(resolveCodeBuddyBillingType({ ANTHROPIC_API_KEY: "sk-xxx" })).toBe("api");
  });

  it("returns subscription when API key is empty string", () => {
    expect(resolveCodeBuddyBillingType({ CODEBUDDY_API_KEY: "" })).toBe("subscription");
  });

  it("returns subscription when API key is whitespace", () => {
    expect(resolveCodeBuddyBillingType({ CODEBUDDY_API_KEY: "   " })).toBe("subscription");
  });
});

describe("buildParseSkippedSummary", () => {
  it("returns empty-output notice when stdout is blank", () => {
    expect(buildParseSkippedSummary("   \n")).toContain("no parseable JSON");
  });

  it("truncates very long stdout for summary field", () => {
    const huge = "x".repeat(200_000);
    const out = buildParseSkippedSummary(huge);
    expect(out.length).toBeLessThan(huge.length);
    expect(out).toContain("truncated");
  });
});
