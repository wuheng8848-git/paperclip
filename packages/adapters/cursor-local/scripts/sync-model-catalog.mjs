#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/model-catalog.ts");

const localAppData = process.env.LOCALAPPDATA;
const agentCandidates = [
  "agent",
  localAppData ? path.join(localAppData, "cursor-agent", "agent.cmd") : null,
].filter(Boolean);

let result = null;
for (const cmd of agentCandidates) {
  result = spawnSync(cmd, ["models"], {
    encoding: "utf8",
    timeout: 30_000,
    shell: process.platform === "win32",
  });
  if ((result.stdout ?? "").includes(" - ")) break;
}
if (!result) {
  console.error("Could not run agent models");
  process.exit(1);
}
const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const models = [];
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^([a-z0-9][a-z0-9._-]*)\s+-\s+(.+)$/i);
  if (!m) continue;
  models.push({
    id: m[1],
    label: m[2].trim().replace(/\s+\((default|current)\)\s*$/i, "").trim(),
  });
}
if (models.length === 0) {
  console.error("No models parsed from agent models");
  process.exit(1);
}

const lines = models.map(
  (m) => `  { id: ${JSON.stringify(m.id)}, label: ${JSON.stringify(m.label)} },`,
);
const content = `import type { AdapterModel } from "@paperclipai/adapter-utils";

/**
 * Offline fallback when \`agent models\` is unavailable.
 * Regenerate: node packages/adapters/cursor-local/scripts/sync-model-catalog.mjs
 * Snapshot: ${new Date().toISOString().slice(0, 10)} (${models.length} models from Cursor Agent CLI).
 */
export const CURSOR_CLI_DEFAULT_MODEL_ID = "composer-2.5-fast";

export const CURSOR_FALLBACK_MODELS: readonly AdapterModel[] = [
${lines.join("\n")}
] as const;

export const models: AdapterModel[] = [...CURSOR_FALLBACK_MODELS];
`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${models.length} models to ${outPath}`);
