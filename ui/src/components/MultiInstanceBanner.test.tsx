import { describe, expect, it } from "vitest";
import { shouldShowMultiInstanceBanner } from "./MultiInstanceBanner";

describe("MultiInstanceBanner", () => {
  it("shows when another local runtime peer is detected", () => {
    expect(
      shouldShowMultiInstanceBanner({
        listenPort: 4100,
        requestedPort: 4100,
        portFallbackActive: false,
        peers: [{ port: 4101, version: "2026.517.0", apiUrl: "http://127.0.0.1:4101/api" }],
      }),
    ).toBe(true);
  });

  it("shows when the current instance fell back to another port", () => {
    expect(
      shouldShowMultiInstanceBanner({
        listenPort: 4101,
        requestedPort: 4100,
        portFallbackActive: true,
        peers: [],
      }),
    ).toBe(true);
  });

  it("hides when only one instance is active on the requested port", () => {
    expect(
      shouldShowMultiInstanceBanner({
        listenPort: 4100,
        requestedPort: 4100,
        portFallbackActive: false,
        peers: [],
      }),
    ).toBe(false);
  });
});
