export function formatMonitorOffset(nextCheckAt: Date | string): string {
  const deltaMs = new Date(nextCheckAt).getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(deltaMs) / 60_000);
  if (absMinutes <= 0) return "现在";
  if (absMinutes < 60) return deltaMs >= 0 ? `${absMinutes}分钟后` : `${absMinutes}分钟前`;

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return deltaMs >= 0 ? `${absHours}小时后` : `${absHours}小时前`;

  const absDays = Math.round(absHours / 24);
  return deltaMs >= 0 ? `${absDays}天后` : `${absDays}天前`;
}
