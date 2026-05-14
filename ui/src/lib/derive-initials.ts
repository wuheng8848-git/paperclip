/**
 * Avatar initials derived from a display name.
 * Uses string iteration by code point (not UTF-16 code units) so CJK
 * and supplementary-plane characters are not split like `slice(0, 2)` can.
 */
export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const chars = (s: string) => [...s];
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = chars(parts[0])[0] ?? "";
    const lastHead = chars(parts[parts.length - 1] ?? "")[0] ?? "";
    return (first + lastHead).toUpperCase();
  }

  const c = chars(trimmed);
  if (c.length >= 2) return (c[0] + c[1]).toUpperCase();
  return (c[0] ?? "?").toUpperCase();
}
