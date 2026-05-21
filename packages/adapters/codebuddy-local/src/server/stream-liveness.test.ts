import { describe, expect, it, vi, afterEach } from "vitest";
import {
  createCodeBuddyStreamLogHandler,
  inspectCodeBuddyStderrLine,
  inspectCodeBuddyStreamJsonLine,
} from "./stream-liveness.js";

describe("inspectCodeBuddyStreamJsonLine", () => {
  it("detects stream-json result with is_error", () => {
    const line = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: true,
      result: "模型调用失败",
    });
    expect(inspectCodeBuddyStreamJsonLine(line)?.errorCode).toBe("codebuddy_execution_error");
    expect(inspectCodeBuddyStreamJsonLine(line)?.errorMessage).toContain("模型调用失败");
  });

  it("detects 429 quota errors from errors[]", () => {
    const line = JSON.stringify({
      type: "result",
      subtype: "error",
      is_error: true,
      result: "CodeBuddy 返回错误结果，无头模式无法在同一次运行内恢复。",
      errors: [
        "429 You exceeded your 5-hour usage quota. Reset at 2026-05-21 04:47:47 +0800.",
      ],
    });
    expect(inspectCodeBuddyStreamJsonLine(line)?.errorCode).toBe("codebuddy_quota_exceeded");
    expect(inspectCodeBuddyStreamJsonLine(line)?.errorMessage).toContain("429");
  });

  it("ignores successful result lines", () => {
    const line = JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "ok" });
    expect(inspectCodeBuddyStreamJsonLine(line)).toBeNull();
  });
});

describe("inspectCodeBuddyStderrLine", () => {
  it("detects max turns exceeded", () => {
    expect(inspectCodeBuddyStderrLine("Error: Max turns (1) exceeded")?.errorCode).toBe(
      "codebuddy_max_turns_exceeded",
    );
  });
});

describe("createCodeBuddyStreamLogHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards chunks to onLog and records fatal stop from stdout", async () => {
    const chunks: string[] = [];
    const handler = createCodeBuddyStreamLogHandler({
      runId: "run-test",
      graceSec: 1,
      onLog: async (_stream, chunk) => {
        chunks.push(chunk);
      },
    });

    const errLine = `${JSON.stringify({ type: "result", is_error: true, result: "boom" })}\n`;
    await handler.onLog("stdout", errLine);
    await handler.flush();

    expect(chunks.join("")).toContain("boom");
    expect(handler.getFatalStop()?.errorMessage).toContain("boom");
  });
});
