import { afterEach, describe, expect, it } from "vitest";
import {
  buildLocalRuntimePeerScanPorts,
  clearLocalRuntimePeerScanCacheForTests,
  scanLocalRuntimePeers,
} from "../local-runtime-peer-scan.js";

describe("local runtime peer scan", () => {
  afterEach(() => {
    clearLocalRuntimePeerScanCacheForTests();
  });

  it("builds a deduped port list around the requested port", () => {
    const ports = buildLocalRuntimePeerScanPorts(4101, 4100);
    expect(ports).toContain(4100);
    expect(ports).not.toContain(4101);
    expect(ports).toContain(3100);
  });

  it("detects other Paperclip health endpoints on localhost", async () => {
    const result = await scanLocalRuntimePeers({
      bindHost: "127.0.0.1",
      listenPort: 4100,
      requestedPort: 4100,
      probe: async (url) => {
        if (url.endsWith(":4101/api/health")) {
          return { status: "ok", version: "2026.517.0" };
        }
        return null;
      },
    });

    expect(result.portFallbackActive).toBe(false);
    expect(result.peers).toEqual([
      {
        port: 4101,
        version: "2026.517.0",
        apiUrl: "http://127.0.0.1:4101/api",
      },
    ]);
  });

  it("marks port fallback when listening on a non-requested port", async () => {
    const result = await scanLocalRuntimePeers({
      bindHost: "127.0.0.1",
      listenPort: 4101,
      requestedPort: 4100,
      probe: async () => null,
    });

    expect(result.portFallbackActive).toBe(true);
    expect(result.peers).toEqual([]);
  });
});
