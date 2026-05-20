export function formatRunDurationZh(
  startedAt: Date | string | null | undefined,
  finishedAt: Date | string | null | undefined,
): string | null {
  if (!startedAt) return null;
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return null;
  const endMs = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  if (!Number.isFinite(endMs) || endMs < startMs) return null;
  const totalSec = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (totalSec < 60) return `${totalSec} 秒`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
}

export function formatRunTimeShort(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
