import { parseObject } from "../adapters/utils.js";

const PROVIDER_QUOTA_EXHAUSTION_RE =
  /(?:\b429\b|5-?\s*hour\s+usage\s+quota|usage\s+quota|rate\s+limit|quota\s+exceeded|resource_exhausted|insufficient\s+(?:quota|balance|funds))/i;

const PROVIDER_QUOTA_ERROR_CODES = new Set([
  "codebuddy_quota_exceeded",
]);

function collectDiagnosticText(input: {
  error?: string | null;
  errorCode?: string | null;
  resultJson?: Record<string, unknown> | null;
}): string {
  const parts: string[] = [];
  if (typeof input.error === "string" && input.error.trim()) parts.push(input.error.trim());

  const resultJson = parseObject(input.resultJson);
  for (const key of ["stdout", "stderr", "result"] as const) {
    const value = resultJson[key];
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  }

  if (Array.isArray(resultJson.errors)) {
    for (const item of resultJson.errors) {
      if (typeof item === "string" && item.trim()) parts.push(item.trim());
    }
  }

  return parts.join("\n");
}

export function isProviderQuotaExhaustionFailure(input: {
  error?: string | null;
  errorCode?: string | null;
  resultJson?: Record<string, unknown> | null;
}): boolean {
  if (input.errorCode && PROVIDER_QUOTA_ERROR_CODES.has(input.errorCode)) {
    if (input.errorCode === "codebuddy_quota_exceeded") return true;
  }

  const haystack = collectDiagnosticText(input);
  if (!haystack) return false;
  return PROVIDER_QUOTA_EXHAUSTION_RE.test(haystack);
}

export function isProviderQuotaExhaustionRun(input: {
  error?: string | null;
  errorCode?: string | null;
  resultJson?: unknown;
}): boolean {
  return isProviderQuotaExhaustionFailure({
    error: input.error,
    errorCode: input.errorCode,
    resultJson: parseObject(input.resultJson),
  });
}

export const PROVIDER_QUOTA_FUSE_CANCEL_MESSAGE =
  "Cancelled due to provider quota exhaustion (429 / usage quota)";

export const PROVIDER_QUOTA_FUSE_AGENT_PAUSE_MESSAGE =
  "Paused automatically after provider quota exhaustion (429 / usage quota). Resume manually after quota resets.";
