import {
  DEFAULT_COMPANY_COMMENT_WAKE_TIER,
  ISSUE_COMMENT_WAKE_TIER_MENTION_CAP,
  ISSUE_COMMENT_WAKE_TIERS,
  type IssueCommentWakeTier,
} from "@paperclipai/shared";

export { DEFAULT_COMPANY_COMMENT_WAKE_TIER };

function tierRank(tier: IssueCommentWakeTier): number {
  return ISSUE_COMMENT_WAKE_TIERS.indexOf(tier);
}

function normalizeStoredTier(raw: string | null | undefined): IssueCommentWakeTier | null {
  if (raw == null || raw === "") return null;
  return (ISSUE_COMMENT_WAKE_TIERS as readonly string[]).includes(raw)
    ? (raw as IssueCommentWakeTier)
    : null;
}

export type CommentWakeKind = "assignee_comment" | "mention";

/**
 * Resolve the effective wake tier for comment-driven wakes (`26` / `041`).
 * @mention wakes are capped to at most `ISSUE_COMMENT_WAKE_TIER_MENTION_CAP` (lighter).
 */
export function resolveEffectiveCommentWakeTier(input: {
  storedTier: string | null | undefined;
  wakeKind: CommentWakeKind;
}): IssueCommentWakeTier {
  const base = normalizeStoredTier(input.storedTier) ?? DEFAULT_COMPANY_COMMENT_WAKE_TIER;
  if (input.wakeKind === "mention") {
    const cap = ISSUE_COMMENT_WAKE_TIER_MENTION_CAP;
    const lighterRank = Math.min(tierRank(base), tierRank(cap));
    return ISSUE_COMMENT_WAKE_TIERS[lighterRank]!;
  }
  return base;
}

/**
 * Drop empty strings (after trim) and consecutive duplicate bodies (after trim).
 * Used before injecting multiple comment bodies into wake payloads (`26`).
 */
export function compressWakeCommentBodiesForInjection(bodies: string[]): string[] {
  const out: string[] = [];
  let lastTrimmed: string | null = null;
  for (const raw of bodies) {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (trimmed.length === 0) continue;
    if (trimmed === lastTrimmed) continue;
    out.push(raw);
    lastTrimmed = trimmed;
  }
  return out;
}
