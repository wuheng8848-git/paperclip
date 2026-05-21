import { describe, expect, it } from "vitest";
import { isProviderQuotaExhaustionFailure } from "../services/provider-quota-exhaustion.js";

describe("isProviderQuotaExhaustionFailure", () => {
  it("detects codebuddy_quota_exceeded error code", () => {
    expect(
      isProviderQuotaExhaustionFailure({
        errorCode: "codebuddy_quota_exceeded",
        error: "429 quota",
      }),
    ).toBe(true);
  });

  it("detects 429 text in error message", () => {
    expect(
      isProviderQuotaExhaustionFailure({
        errorCode: "codebuddy_execution_error",
        error: "429 You exceeded your 5-hour usage quota.",
      }),
    ).toBe(true);
  });

  it("detects quota hints in resultJson stdout", () => {
    expect(
      isProviderQuotaExhaustionFailure({
        errorCode: "codebuddy_execution_error",
        resultJson: {
          stdout: '{"errors":["429 quota exceeded"]}',
        },
      }),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(
      isProviderQuotaExhaustionFailure({
        errorCode: "timeout",
        error: "Timed out after 600s",
      }),
    ).toBe(false);
  });
});
