/**
 * Past-oriented relative timestamps for zh-CN UI (「6小时前」「3天前」等).
 */

function clampNonNegativeSeconds(deltaMs: number): number {
  return Math.floor(Math.max(0, deltaMs) / 1000);
}

function zhDateFallback(date: Date): string {
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" });
}

function zhDateTimeFallback(date: Date): string {
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Rounded buckets — ≥30 days becomes short calendar date（与沿用逻辑一致） */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const then = d.getTime();
  if (Number.isNaN(then)) return "—";

  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return zhDateTimeFallback(d);

  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "刚刚";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return zhDateFallback(d);
}

const MINUTE_SEC = 60;
const HOUR_SEC = MINUTE_SEC * 60;
const DAY_SEC = HOUR_SEC * 24;
const WEEK_SEC = DAY_SEC * 7;
/** 与同文件历史 timeAgo 一致：按月约 30 天聚合 */
const MONTH_SEC = DAY_SEC * 30;

/** Floor buckets — includes 周 / 月（与同文件沿用逻辑一致） */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const then = d.getTime();
  if (Number.isNaN(then)) return "—";

  const now = Date.now();
  const deltaMs = now - then;
  if (deltaMs < 0) return zhDateTimeFallback(d);

  const seconds = clampNonNegativeSeconds(deltaMs);

  if (seconds < MINUTE_SEC) return "刚刚";
  if (seconds < HOUR_SEC) {
    return `${Math.floor(seconds / MINUTE_SEC)}分钟前`;
  }
  if (seconds < DAY_SEC) {
    return `${Math.floor(seconds / HOUR_SEC)}小时前`;
  }
  if (seconds < WEEK_SEC) {
    return `${Math.floor(seconds / DAY_SEC)}天前`;
  }
  if (seconds < MONTH_SEC) {
    return `${Math.floor(seconds / WEEK_SEC)}周前`;
  }
  return `${Math.floor(seconds / MONTH_SEC)}个月前`;
}
