import path from "node:path";

/**
 * Strip JSON/UI copy-paste artifacts from adapter `command` (extra quotes, backslash-escapes).
 */
export function normalizeConfiguredCommand(raw: string, fallback = "agent"): string {
  let s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return fallback;

  for (let i = 0; i < 4; i++) {
    s = s.replace(/^\\+("|')/, "$1").replace(/("|')\\+$/, "$1");
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
      continue;
    }
    break;
  }

  s = s.replace(/\\"/g, '"').replace(/\\'/g, "'");
  s = s.replace(/^\\+/, "").replace(/\\+$/, "").trim();
  for (let i = 0; i < 2; i++) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
  }
  return s.trim() || fallback;
}

/** IDE install ships `cursor.CMD`; Paperclip needs the separate `agent` CLI. */
export function misconfiguredIdeCursorLauncherHint(command: string): string | null {
  const base = path.basename(command).toLowerCase();
  if (base !== "cursor.cmd" && base !== "cursor.bat") return null;
  const normalized = command.replace(/\\/g, "/").toLowerCase();
  if (!normalized.includes("/cursor/resources/") && !normalized.includes("/programs/cursor/")) {
    return null;
  }
  return (
    "adapter command points to the Cursor IDE launcher (cursor.CMD), not the Agent CLI. " +
    'Set command to "agent" (or an absolute path to %LOCALAPPDATA%\\cursor-agent\\agent.cmd).'
  );
}
