import type { TranscriptEntry } from "../../adapters";

const MAX_PREVIEW_LINES = 8;
const MAX_LINE_CHARS = 140;

function entryPreviewLine(entry: TranscriptEntry): string | null {
  switch (entry.kind) {
    case "stdout":
      return `[stdout] ${entry.text.trim()}`;
    case "stderr":
      return `[stderr] ${entry.text.trim()}`;
    case "system":
      return `[lifecycle] ${entry.text.trim()}`;
    case "assistant":
      return `[assistant] ${entry.text.trim()}`;
    case "user":
      return `[user] ${entry.text.trim()}`;
    case "thinking":
      return `[thinking] ${entry.text.trim()}`;
    case "tool_call":
      return `[tool] ${entry.name}`;
    case "tool_result":
      return `[tool-result] ${entry.isError ? "error" : "ok"}`;
    case "init":
      return `[init] ${entry.model}`;
    case "result":
      return `[result] ${entry.text?.trim() ?? ""}`;
    case "diff":
      return `[diff] ${entry.changeType}`;
    default:
      return null;
  }
}

export function formatTranscriptPreview(entries: TranscriptEntry[]): string | null {
  if (entries.length === 0) return null;
  const lines: string[] = [];
  for (const entry of entries) {
    const line = entryPreviewLine(entry);
    if (!line) continue;
    const trimmed =
      line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS - 1)}…` : line;
    lines.push(trimmed);
    if (lines.length >= MAX_PREVIEW_LINES) break;
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

export function formatRawLogPreview(content: string, maxChars = 1200): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars - 1)}…` : trimmed;
}
