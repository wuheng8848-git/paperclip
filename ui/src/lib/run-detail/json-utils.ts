import { orchestrationInjectionPage } from "../i18n";

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return orchestrationInjectionPage.noData;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
