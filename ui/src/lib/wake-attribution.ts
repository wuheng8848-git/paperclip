/**
 * 042 / 050：从运行 contextSnapshot 解析 effectiveTrigger（v1），供运行清单页等人读展示。
 */

export type ParsedWakeupInvocation = {
  source: string;
  reason: string;
  triggerDetail: string | null;
};

export type ParsedEffectiveTrigger = {
  v: number;
  winning: ParsedWakeupInvocation;
  absorbed: Array<ParsedWakeupInvocation & { absorbedAt: string }>;
  lastMergeAt?: string;
};

function parseInvocation(rec: unknown): ParsedWakeupInvocation | null {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return null;
  const o = rec as Record<string, unknown>;
  const source = typeof o.source === "string" ? o.source.trim() : "";
  const reason = typeof o.reason === "string" ? o.reason.trim() : "";
  if (!source || !reason) return null;
  const td = o.triggerDetail;
  const triggerDetail =
    typeof td === "string" && td.trim().length > 0 ? td.trim() : null;
  return { source, reason, triggerDetail };
}

/**
 * 若快照中无有效 `effectiveTrigger.v1`，返回 null（界面回退到 wakeReason / invocationSource）。
 */
export function parseEffectiveTrigger(contextSnapshot: unknown): ParsedEffectiveTrigger | null {
  if (
    typeof contextSnapshot !== "object" ||
    contextSnapshot === null ||
    Array.isArray(contextSnapshot)
  ) {
    return null;
  }
  const ctx = contextSnapshot as Record<string, unknown>;
  const et = ctx.effectiveTrigger;
  if (!et || typeof et !== "object" || Array.isArray(et)) return null;
  const o = et as Record<string, unknown>;
  const winning = parseInvocation(o.winningInvocation);
  if (!winning) return null;

  const absorbed: ParsedEffectiveTrigger["absorbed"] = [];
  if (Array.isArray(o.absorbed)) {
    for (const item of o.absorbed) {
      const inv = parseInvocation(item);
      if (!inv) continue;
      const rec = item as Record<string, unknown>;
      const absorbedAt =
        typeof rec.absorbedAt === "string" ? rec.absorbedAt.trim() : "";
      if (absorbedAt.length === 0) continue;
      absorbed.push({ ...inv, absorbedAt });
    }
  }

  const lastMergeAt =
    typeof o.lastMergeAt === "string" && o.lastMergeAt.trim().length > 0
      ? o.lastMergeAt.trim()
      : undefined;

  const v = typeof o.v === "number" && Number.isFinite(o.v) ? o.v : 1;

  return {
    v,
    winning,
    absorbed,
    ...(lastMergeAt ? { lastMergeAt } : {}),
  };
}
