import type { HeartbeatRunEvent } from "@paperclipai/shared";
import type { PromptCacheCorrelation } from "@paperclipai/adapter-utils";
import { asNumber, asRecord, asString } from "./json-utils";

export function firstAdapterInvokeEvent(events: HeartbeatRunEvent[] | undefined) {
  return (events ?? []).find((event) => event.eventType === "adapter.invoke") ?? null;
}

export function parsePromptCacheCorrelation(raw: unknown): PromptCacheCorrelation | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const mode = rec.mode === "cold" || rec.mode === "resumed" ? rec.mode : null;
  if (!mode) return null;
  const stabilityKey =
    typeof rec.stabilityKey === "string" && rec.stabilityKey.trim().length > 0 ? rec.stabilityKey.trim() : null;
  let suppressedSectionIds: string[] | undefined;
  const idsRaw = rec.suppressedSectionIds;
  if (Array.isArray(idsRaw)) {
    const ids = idsRaw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim());
    suppressedSectionIds = ids.length > 0 ? ids : undefined;
  }
  return {
    mode,
    ...(stabilityKey ? { stabilityKey } : {}),
    ...(suppressedSectionIds ? { suppressedSectionIds } : {}),
  };
}

export function parsePromptSections(raw: unknown): Array<{ id: string; body: string }> | null {
  if (!Array.isArray(raw)) return null;
  const out: Array<{ id: string; body: string }> = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id) continue;
    const body = typeof rec.body === "string" ? rec.body : "";
    out.push({ id, body });
  }
  return out.length > 0 ? out : null;
}

export function buildFullPromptMarkdown(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const promptRaw = payload.prompt;
  if (typeof promptRaw === "string" && promptRaw.trim().length > 0) return promptRaw;
  const sections = parsePromptSections(payload.promptSections);
  if (sections?.length) return sections.map((s) => s.body).join("\n\n");
  return null;
}

export function adapterInvokePayload(adapterEvent: HeartbeatRunEvent | null) {
  return asRecord(adapterEvent?.payload);
}

export function parsePromptMetrics(payload: Record<string, unknown> | null) {
  const promptMetrics = asRecord(payload?.promptMetrics);
  return Object.entries(promptMetrics ?? {})
    .map(([key, value]) => ({ key, value: asNumber(value) }))
    .filter((entry): entry is { key: string; value: number } => entry.value !== null);
}
