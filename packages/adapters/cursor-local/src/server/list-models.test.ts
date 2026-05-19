import { describe, expect, it } from "vitest";
import { parseCursorModelsOutput } from "./list-models.js";

describe("parseCursorModelsOutput", () => {
  it("parses Cursor CLI id - label lines", () => {
    const stdout = [
      "Available models",
      "",
      "auto - Auto",
      "composer-2-fast - Composer 2 Fast (default)",
      "gpt-5.1-codex-mini - Codex 5.1 Mini (current)",
    ].join("\n");

    const models = parseCursorModelsOutput(stdout, "");
    expect(models).toEqual([
      { id: "auto", label: "Auto" },
      { id: "composer-2-fast", label: "Composer 2 Fast" },
      { id: "gpt-5.1-codex-mini", label: "Codex 5.1 Mini" },
    ]);
  });
});
