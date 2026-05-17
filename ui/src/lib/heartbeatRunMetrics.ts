import type { HeartbeatRun } from "@paperclipai/shared";
import { visibleRunCostUsd } from "./utils";

function usageNumber(usage: Record<string, unknown> | null, ...keys: string[]) {
  if (!usage) return 0;
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function runMetrics(run: HeartbeatRun) {
  const usage = (run.usageJson ?? null) as Record<string, unknown> | null;
  const result = (run.resultJson ?? null) as Record<string, unknown> | null;
  const input = usageNumber(usage, "inputTokens", "input_tokens");
  const output = usageNumber(usage, "outputTokens", "output_tokens");
  const cached = usageNumber(
    usage,
    "cachedInputTokens",
    "cached_input_tokens",
    "cache_read_input_tokens",
  );
  const cost = visibleRunCostUsd(usage, result);
  const provider = asNonEmptyString(usage?.provider) ?? null;
  const model = asNonEmptyString(usage?.model) ?? null;
  return {
    input,
    output,
    cached,
    cost,
    totalTokens: input + output,
    provider,
    model,
  };
}
