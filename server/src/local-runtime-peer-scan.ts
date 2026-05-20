import { serverVersion } from "./version.js";

export type LocalRuntimePeer = {
  port: number;
  version: string | null;
  apiUrl: string;
};

export type LocalRuntimeStatus = {
  listenPort: number;
  requestedPort: number;
  portFallbackActive: boolean;
  peers: LocalRuntimePeer[];
};

type ScanOpts = {
  bindHost: string;
  listenPort: number;
  requestedPort: number;
  now?: number;
  probe?: (url: string) => Promise<{ status: string; version?: string } | null>;
};

const CACHE_TTL_MS = 15_000;
const PROBE_TIMEOUT_MS = 350;

const COMMON_PAPERCLIP_PORTS = [3100, 3101, 3102, 4100, 4101, 4102];

let cachedScan:
  | {
      key: string;
      expiresAt: number;
      value: LocalRuntimeStatus;
    }
  | null = null;

function normalizeBindHost(bindHost: string): string {
  if (bindHost === "0.0.0.0" || bindHost === "::") return "127.0.0.1";
  return bindHost;
}

export function buildLocalRuntimePeerScanPorts(listenPort: number, requestedPort: number): number[] {
  const ports = new Set<number>();
  for (const port of COMMON_PAPERCLIP_PORTS) ports.add(port);
  const anchor = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : listenPort;
  for (let offset = -5; offset <= 20; offset += 1) {
    const port = anchor + offset;
    if (port > 0 && port <= 65535) ports.add(port);
  }
  ports.delete(listenPort);
  return [...ports].sort((a, b) => a - b);
}

async function defaultProbe(url: string): Promise<{ status: string; version?: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json() as { status?: string; version?: string };
    if (body.status !== "ok") return null;
    return body;
  } catch {
    return null;
  }
}

export async function scanLocalRuntimePeers(opts: ScanOpts): Promise<LocalRuntimeStatus> {
  const listenPort = opts.listenPort;
  const requestedPort = opts.requestedPort > 0 ? opts.requestedPort : listenPort;
  const bindHost = normalizeBindHost(opts.bindHost);
  const cacheKey = `${bindHost}:${listenPort}:${requestedPort}`;
  const now = opts.now ?? Date.now();
  if (cachedScan && cachedScan.key === cacheKey && cachedScan.expiresAt > now) {
    return cachedScan.value;
  }

  const probe = opts.probe ?? defaultProbe;
  const candidatePorts = buildLocalRuntimePeerScanPorts(listenPort, requestedPort);
  const peers: LocalRuntimePeer[] = [];

  await Promise.all(
    candidatePorts.map(async (port) => {
      const body = await probe(`http://${bindHost}:${port}/api/health`);
      if (!body) return;
      peers.push({
        port,
        version: typeof body.version === "string" ? body.version : null,
        apiUrl: `http://${bindHost}:${port}/api`,
      });
    }),
  );

  peers.sort((a, b) => a.port - b.port);

  const value: LocalRuntimeStatus = {
    listenPort,
    requestedPort,
    portFallbackActive: listenPort !== requestedPort,
    peers,
  };

  cachedScan = {
    key: cacheKey,
    expiresAt: now + CACHE_TTL_MS,
    value,
  };

  return value;
}

export function clearLocalRuntimePeerScanCacheForTests() {
  cachedScan = null;
}

export function currentServerVersionForPeerScan(): string {
  return serverVersion;
}
