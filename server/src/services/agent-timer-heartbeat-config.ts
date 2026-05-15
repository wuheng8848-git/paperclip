import type { InstanceExperimentalSettings } from "@paperclipai/shared";
import { AGENT_DEFAULT_MAX_CONCURRENT_RUNS } from "@paperclipai/shared";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFiniteNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  return null;
}

export function agentMayUseTimerHeartbeat(role: string, experimental: InstanceExperimentalSettings): boolean {
  return experimental.timerHeartbeatEligibleAgentRoles.includes(role);
}

/** Turn off timer heartbeat in persisted config when role is not eligible. */
export function stripTimerHeartbeatIfRoleIneligible(
  runtimeConfig: Record<string, unknown>,
  role: string,
  experimental: InstanceExperimentalSettings,
): Record<string, unknown> {
  if (agentMayUseTimerHeartbeat(role, experimental)) {
    return runtimeConfig;
  }
  const rc = { ...runtimeConfig };
  const heartbeat = isPlainRecord(rc.heartbeat) ? { ...rc.heartbeat } : {};
  heartbeat.enabled = false;
  rc.heartbeat = heartbeat;
  return rc;
}

/**
 * Apply instance policy when creating/importing agents: non-eligible roles never get timer;
 * eligible roles get defaults from experimental when fields are unset.
 */
export function applyInstanceTimerHeartbeatDefaultsToRuntimeConfig(
  runtimeConfig: Record<string, unknown>,
  role: string,
  experimental: InstanceExperimentalSettings,
  phase: "create" | "import",
): Record<string, unknown> {
  const rc = { ...runtimeConfig };
  const heartbeat = isPlainRecord(rc.heartbeat) ? { ...rc.heartbeat } : {};

  if (parseFiniteNumberLike(heartbeat.maxConcurrentRuns) == null) {
    heartbeat.maxConcurrentRuns = AGENT_DEFAULT_MAX_CONCURRENT_RUNS;
  }

  if (!agentMayUseTimerHeartbeat(role, experimental)) {
    heartbeat.enabled = false;
    rc.heartbeat = heartbeat;
    return rc;
  }

  if (!experimental.enableTimerHeartbeatByDefaultForEligibleRoles) {
    if (parseBooleanLike(heartbeat.enabled) == null) {
      heartbeat.enabled = false;
    }
    rc.heartbeat = heartbeat;
    return rc;
  }

  if (phase === "create") {
    if (parseBooleanLike(heartbeat.enabled) == null) {
      heartbeat.enabled = true;
    }
  } else {
    if (parseBooleanLike(heartbeat.enabled) == null) {
      heartbeat.enabled = true;
    }
  }

  const interval = parseFiniteNumberLike(heartbeat.intervalSec);
  if (interval == null || interval <= 0) {
    heartbeat.intervalSec = experimental.defaultTimerHeartbeatIntervalSec;
  }

  rc.heartbeat = heartbeat;
  return rc;
}
