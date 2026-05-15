import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agents,
  companies,
  createDb,
  heartbeatRuns,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.ts";
import { runningProcesses } from "../adapters/index.ts";

vi.mock("../adapters/index.ts", async () => {
  const actual = await vi.importActual<typeof import("../adapters/index.ts")>("../adapters/index.ts");
  return {
    ...actual,
    getServerAdapter: vi.fn(() => ({
      supportsLocalAgentJwt: false,
      execute: vi.fn(async () => ({
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Concurrency cap probe.",
        provider: "test",
        model: "test-model",
      })),
    })),
  };
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping heartbeat concurrency cap tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("heartbeat company concurrent active-agent cap", () => {
  let db!: ReturnType<typeof createDb>;
  let heartbeat!: ReturnType<typeof heartbeatService>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-concurrency-caps-");
    db = createDb(tempDb.connectionString);
    heartbeat = heartbeatService(db);
  }, 20_000);

  afterEach(async () => {
    runningProcesses.clear();
    await db.delete(activityLog);
    await db.delete(heartbeatRuns);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("leaves a fifth agent's queued run unclaimed when four other agents already have a running run", async () => {
    const companyId = randomUUID();
    const agentIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const queuedRunId = randomUUID();
    const now = new Date();

    await db.insert(companies).values({
      id: companyId,
      name: "ConcurrencyCo",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });

    for (const agentId of agentIds) {
      await db.insert(agents).values({
        id: agentId,
        companyId,
        name: `agent-${agentId.slice(0, 8)}`,
        role: "engineer",
        status: "active",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {
          heartbeat: {
            wakeOnDemand: true,
            maxConcurrentRuns: 1,
          },
        },
        permissions: {},
      });
    }

    const [a1, a2, a3, a4, a5] = agentIds;

    await db.insert(heartbeatRuns).values([
      {
        id: randomUUID(),
        companyId,
        agentId: a1,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "running",
        startedAt: now,
      },
      {
        id: randomUUID(),
        companyId,
        agentId: a2,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "running",
        startedAt: now,
      },
      {
        id: randomUUID(),
        companyId,
        agentId: a3,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "running",
        startedAt: now,
      },
      {
        id: randomUUID(),
        companyId,
        agentId: a4,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "running",
        startedAt: now,
      },
      {
        id: queuedRunId,
        companyId,
        agentId: a5,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "queued",
        contextSnapshot: {},
      },
    ]);

    await heartbeat.resumeQueuedRuns();

    const row = await db
      .select({ status: heartbeatRuns.status })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, queuedRunId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    expect(row?.status).toBe("queued");
  });
});
