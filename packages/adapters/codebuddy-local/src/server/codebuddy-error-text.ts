const CODEBUDDY_QUOTA_RE =
  /(?:\b429\b|5-?\s*hour\s+usage\s+quota|usage\s+quota|rate\s+limit|quota\s+exceeded|resource_exhausted|insufficient\s+(?:quota|balance|funds))/i;

export function collectCodeBuddyResultErrorTexts(obj: Record<string, unknown>): string[] {
  const texts: string[] = [];
  if (typeof obj.result === "string" && obj.result.trim().length > 0) {
    texts.push(obj.result.trim());
  }
  if (!Array.isArray(obj.errors)) return texts;

  for (const item of obj.errors) {
    if (typeof item === "string" && item.trim().length > 0) {
      texts.push(item.trim());
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "text"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        texts.push(value.trim());
      }
    }
  }

  return texts;
}

export function isCodeBuddyQuotaExhaustionText(haystack: string): boolean {
  return CODEBUDDY_QUOTA_RE.test(haystack);
}

export function resolveCodeBuddyTerminalError(input: {
  resultTexts: string[];
  fallbackMessage: string;
}): { errorMessage: string; errorCode: string } {
  const haystack = input.resultTexts.join("\n");
  const detail =
    input.resultTexts.find((text) => isCodeBuddyQuotaExhaustionText(text)) ??
    input.resultTexts.find((text) => text !== input.fallbackMessage) ??
    input.resultTexts[0] ??
    input.fallbackMessage;
  if (isCodeBuddyQuotaExhaustionText(haystack)) {
    return { errorMessage: detail, errorCode: "codebuddy_quota_exceeded" };
  }
  return { errorMessage: detail, errorCode: "codebuddy_execution_error" };
}
