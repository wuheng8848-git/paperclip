import { asRecord, asString } from "./json-utils";

export function formatResultJsonSummary(resultJson: unknown): string | null {
  if (resultJson == null) return null;
  if (typeof resultJson === "string" && resultJson.trim().length > 0) {
    const t = resultJson.trim();
    return t.length > 160 ? `${t.slice(0, 157)}…` : t;
  }
  const rec = asRecord(resultJson);
  if (!rec) return null;

  const summary = asString(rec.summary) ?? asString(rec.result);
  if (summary) return summary.length > 160 ? `${summary.slice(0, 157)}…` : summary;

  const filesChanged = rec.filesChanged;
  if (Array.isArray(filesChanged) && filesChanged.length > 0) {
    const names = filesChanged.filter((f): f is string => typeof f === "string").slice(0, 3);
    if (names.length > 0) {
      const suffix = filesChanged.length > names.length ? ` 等 ${filesChanged.length} 个` : "";
      return `变更文件 ${filesChanged.length} 个 · ${names.join(" · ")}${suffix}`;
    }
  }

  const stopReason = asString(rec.stopReason);
  if (stopReason) return `停止原因：${stopReason}`;

  const keys = Object.keys(rec);
  if (keys.length === 0) return null;
  return `结构化回传含 ${keys.slice(0, 5).join("、")}${keys.length > 5 ? " 等字段" : ""}`;
}
