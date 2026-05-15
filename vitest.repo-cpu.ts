import os from "node:os";

/**
 * Cap Vitest worker count on dev machines so tests do not pin all logical CPUs.
 *
 * Override (either): `PAPERCLIP_VITEST_MAX_WORKERS` or `VITEST_MAX_WORKERS` — positive integer.
 * When `CI=true`, defaults to full `availableParallelism` unless env override is set.
 */
export function resolveRepoVitestMaxWorkers(): number {
  for (const key of ["PAPERCLIP_VITEST_MAX_WORKERS", "VITEST_MAX_WORKERS"] as const) {
    const raw = process.env[key];
    if (raw != null && raw !== "") {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  if (process.env.CI === "true") {
    return Math.max(1, os.availableParallelism?.() ?? os.cpus().length ?? 4);
  }
  const logical = os.availableParallelism?.() ?? os.cpus().length ?? 4;
  return Math.min(4, Math.max(1, logical));
}
