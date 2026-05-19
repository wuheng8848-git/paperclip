import { describe, expect, it } from "vitest";
import { misconfiguredIdeCursorLauncherHint, normalizeConfiguredCommand } from "./command-normalize.js";

describe("normalizeConfiguredCommand", () => {
  it("returns agent for empty input", () => {
    expect(normalizeConfiguredCommand("")).toBe("agent");
  });

  it("strips surrounding double quotes", () => {
    expect(normalizeConfiguredCommand('"C:\\Program Files\\cursor\\agent.cmd"')).toBe(
      "C:\\Program Files\\cursor\\agent.cmd",
    );
  });

  it("strips JSON-escaped quotes", () => {
    expect(
      normalizeConfiguredCommand('\\"C:\\Program Files\\cursor\\resources\\app\\bin\\cursor.CMD\\"'),
    ).toBe("C:\\Program Files\\cursor\\resources\\app\\bin\\cursor.CMD");
  });

  it("leaves bare agent unchanged", () => {
    expect(normalizeConfiguredCommand("agent")).toBe("agent");
  });
});

describe("misconfiguredIdeCursorLauncherHint", () => {
  it("flags IDE cursor.CMD under Program Files", () => {
    const hint = misconfiguredIdeCursorLauncherHint(
      "C:\\Program Files\\cursor\\resources\\app\\bin\\cursor.CMD",
    );
    expect(hint).toMatch(/Agent CLI/);
  });

  it("allows cursor-agent install path", () => {
    expect(
      misconfiguredIdeCursorLauncherHint("C:\\Users\\me\\AppData\\Local\\cursor-agent\\agent.cmd"),
    ).toBeNull();
  });
});
