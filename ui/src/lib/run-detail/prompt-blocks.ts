import type { PromptCacheCorrelation } from "@paperclipai/adapter-utils";

export type PromptBlockStatus = "带入" | "指针" | "省略";

export type PromptBlockRow = {
  id: string;
  status: PromptBlockStatus;
  size: string;
  summary: string;
};

const POINTER_SECTION_IDS = new Set(["skill_note"]);

function formatBlockSize(body: string): string {
  const len = body.length;
  if (len === 0) return "—";
  if (len < 1000) return `${len.toLocaleString()} 字`;
  return `~${(len / 1000).toFixed(1)}k 字`;
}

function summarizeBody(body: string): string {
  const line = body
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (!line) return "—";
  const trimmed = line.replace(/\s+/g, " ");
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
}

function blockStatus(
  sectionId: string,
  body: string,
  suppressedIds: Set<string>,
): PromptBlockStatus {
  if (suppressedIds.has(sectionId)) return "省略";
  if (POINTER_SECTION_IDS.has(sectionId)) return "指针";
  const compact = body.trim();
  if (compact.length > 0 && compact.length <= 120 && /^[\w./\\-]+\.(md|txt|json|yaml|yml)$/i.test(compact)) {
    return "指针";
  }
  return "带入";
}

export function buildPromptBlockRows(
  sections: Array<{ id: string; body: string }> | null,
  promptCacheCorrelation: PromptCacheCorrelation | null,
): PromptBlockRow[] {
  const suppressedIds = new Set(promptCacheCorrelation?.suppressedSectionIds ?? []);
  const seen = new Set<string>();
  const rows: PromptBlockRow[] = [];

  for (const section of sections ?? []) {
    seen.add(section.id);
    const status = blockStatus(section.id, section.body, suppressedIds);
    rows.push({
      id: section.id,
      status,
      size: status === "省略" ? "—" : formatBlockSize(section.body),
      summary: status === "省略" ? "续跑模式下省略注入" : summarizeBody(section.body),
    });
  }

  for (const id of suppressedIds) {
    if (seen.has(id)) continue;
    rows.push({
      id,
      status: "省略",
      size: "—",
      summary: "续跑模式下省略注入",
    });
  }

  return rows;
}
