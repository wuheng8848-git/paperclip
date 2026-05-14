import { describe, expect, it } from "vitest";
import { deriveInitials } from "./derive-initials";

describe("deriveInitials", () => {
  it("uses first char of first and last word for ASCII", () => {
    expect(deriveInitials("Jane Doe")).toBe("JD");
  });

  it("uses first two code points for single CJK token", () => {
    expect(deriveInitials("贾维斯")).toBe("贾维");
  });

  it("uses first char of first and last segment when space-separated CJK", () => {
    expect(deriveInitials("张 三")).toBe("张三");
  });

  it("handles development-cursor style hyphenated label as single token", () => {
    expect(deriveInitials("开发-Cursor")).toBe("开发");
  });

  it("returns ? for empty", () => {
    expect(deriveInitials("   ")).toBe("?");
  });
});
