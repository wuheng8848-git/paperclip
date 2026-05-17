/**
 * 042 · 多源唤醒合并：`contextSnapshot.effectiveTrigger` 归因（可审计）。
 * `heartbeat_runs.invocationSource` 仍为首次入队来源；合并后“谁压在谁上面”以本结构为准。
 */

export const EFFECTIVE_TRIGGER_SCHEMA_VERSION = 1 as const;

export type WakeupInvocationMeta = {
  source: string;
  reason: string;
  triggerDetail?: string | null;
};

export type EffectiveTriggerV1 = {
  v: typeof EFFECTIVE_TRIGGER_SCHEMA_VERSION;
  winningInvocation: WakeupInvocationMeta;
  absorbed: Array<WakeupInvocationMeta & { absorbedAt: string }>;
  lastMergeAt?: string;
};

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/** `timer` 让位于其它主路径；同级以后到（incoming）为准。 */
export function wakeupInvocationPriority(source: string): number {
  const s = source.trim().toLowerCase();
  if (s === "timer") return 0;
  if (s === "automation" || s === "assignment" || s === "on_demand") return 10;
  return 5;
}

export function initialEffectiveTrigger(meta: WakeupInvocationMeta): EffectiveTriggerV1 {
  return {
    v: EFFECTIVE_TRIGGER_SCHEMA_VERSION,
    winningInvocation: {
      source: meta.source,
      reason: meta.reason,
      triggerDetail: meta.triggerDetail ?? null,
    },
    absorbed: [],
  };
}

function invocationKey(m: WakeupInvocationMeta): string {
  return `${m.source}\0${m.reason}\0${m.triggerDetail ?? ""}`;
}

/**
 * 在合并 context 时更新 `effectiveTrigger`：输家记入 `absorbed`，赢家写入 `winningInvocation`。
 */
export function mergeEffectiveTriggerPayload(
  existingContext: Record<string, unknown>,
  incomingMeta: WakeupInvocationMeta,
  existingMeta: WakeupInvocationMeta,
): EffectiveTriggerV1 {
  let prevWinning = existingMeta;
  let absorbed: EffectiveTriggerV1["absorbed"] = [];

  const prevRaw = existingContext.effectiveTrigger;
  if (prevRaw && typeof prevRaw === "object" && !Array.isArray(prevRaw)) {
    const p = prevRaw as Record<string, unknown>;
    const w = p.winningInvocation;
    if (w && typeof w === "object" && !Array.isArray(w)) {
      const ww = w as Record<string, unknown>;
      const ws = nonEmptyString(ww.source);
      const wr = nonEmptyString(ww.reason);
      if (ws && wr) {
        prevWinning = {
          source: ws,
          reason: wr,
          triggerDetail: nonEmptyString(ww.triggerDetail),
        };
      }
    }
    const ab = p.absorbed;
    if (Array.isArray(ab)) {
      for (const item of ab) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const s = nonEmptyString(o.source);
        const r = nonEmptyString(o.reason);
        const at = nonEmptyString(o.absorbedAt);
        if (s && r && at) {
          absorbed.push({
            source: s,
            reason: r,
            triggerDetail: nonEmptyString(o.triggerDetail),
            absorbedAt: at,
          });
        }
      }
    }
  }

  const incP = wakeupInvocationPriority(incomingMeta.source);
  const exP = wakeupInvocationPriority(prevWinning.source);
  const incomingWins = incP > exP || (incP === exP);

  const absorbedAt = new Date().toISOString();

  const loser = incomingWins ? prevWinning : incomingMeta;
  const winner = incomingWins ? incomingMeta : prevWinning;

  if (invocationKey(loser) !== invocationKey(winner)) {
    absorbed = [...absorbed, { ...loser, absorbedAt }];
  }

  return {
    v: EFFECTIVE_TRIGGER_SCHEMA_VERSION,
    winningInvocation: {
      source: winner.source,
      reason: winner.reason,
      triggerDetail: winner.triggerDetail ?? null,
    },
    absorbed,
    lastMergeAt: absorbedAt,
  };
}

export function omitEffectiveTrigger(snapshot: Record<string, unknown>): Record<string, unknown> {
  const { effectiveTrigger: _drop, ...rest } = snapshot;
  return rest;
}
