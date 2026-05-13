#!/usr/bin/env node
/**
 * qwen-worker-wrapper.js
 * Paperclip process adapter wrapper for Qwen Code CLI
 *
 * Usage: node wrapper.js "<prompt>"
 *   or:  node wrapper.js  (reads prompt from stdin)
 *
 * Env vars expected (injected by Paperclip):
 *   PAPERCLIP_API_URL     - Paperclip server base URL (e.g. http://localhost:3100)
 *   PAPERCLIP_AGENT_ID    - Agent UUID
 *   PAPERCLIP_COMPANY_ID  - Company UUID
 *   PAPERCLIP_ISSUE_ID    - Issue UUID (if workspace execution context)
 *   PAPERCLIP_API_KEY     - MUST be set in adapterConfig.env for API writes
 *
 * Exit codes:
 *   0 - success, Qwen completed
 *   1 - error
 *   2 - Qwen failed or timed out
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

// ─── Config ───────────────────────────────────────────────────────────────

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL || "";
const PAPERCLIP_AGENT_ID = process.env.PAPERCLIP_AGENT_ID || "";
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || "";
const PAPERCLIP_ISSUE_ID = process.env.PAPERCLIP_ISSUE_ID || "";
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY || "";
const PAPERCLIP_ISSUE_IDENTIFIER = process.env.PAPERCLIP_ISSUE_IDENTIFIER || "";

// Qwen CLI config
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.6-plus";
const QWEN_MAX_TURNS = parseInt(process.env.QWEN_MAX_TURNS || "1", 10);
const QWEN_APPROVAL = process.env.QWEN_APPROVAL || "yolo";
const QWEN_OUTPUT_FORMAT = process.env.QWEN_OUTPUT_FORMAT || "stream-json";

// Post-execution config
const WRITE_COMMENT = process.env.QWEN_WRITE_COMMENT !== "false"; // default true
const MARK_DONE = process.env.QWEN_MARK_DONE !== "false";         // default true

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(...args) {
  const line = `[qwen-worker] ${new Date().toISOString()} ${args.join(" ")}`;
  process.stderr.write(line + "\n"); // stderr for debug, stdout for result
}

async function runQwen(prompt) {
  return new Promise((resolve, reject) => {
    const args = [
      `-o`, QWEN_OUTPUT_FORMAT,
      `--approval-mode`, QWEN_APPROVAL,
      `--max-session-turns`, String(QWEN_MAX_TURNS),
      `-m`, QWEN_MODEL,
      `--cwd`, process.cwd(),
      `--`,
      prompt,
    ];

    log(`Spawning: qwen ${args.join(" ")}`);

    const proc = spawn("qwen", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      timeout: 600000, // 10min hard cap
    });

    let stdout = "";
    let stderr = "";
    let qwenResult = null;

    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      // Relay stream-json events to Paperclip stdout so they're visible in resultJson
      process.stdout.write(chunk);
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    proc.on("close", (code) => {
      log(`Qwen exited with code ${code}`);

      // Parse last result event from stream-json output
      if (QWEN_OUTPUT_FORMAT === "stream-json" || QWEN_OUTPUT_FORMAT === "json") {
        try {
          const lines = stdout.trim().split("\n").filter(Boolean);
          for (let i = lines.length - 1; i >= 0; i--) {
            const evt = JSON.parse(lines[i]);
            if (evt.type === "result" && evt.subtype === "success") {
              qwenResult = evt.result || "";
              break;
            }
          }
        } catch {
          qwenResult = stdout.trim().slice(-2000); // fallback: last 2k chars
        }
      } else {
        qwenResult = stdout.trim().slice(-2000);
      }

      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        result: qwenResult || stdout.trim(),
      });
    });

    proc.on("error", reject);
  });
}

async function postComment(issueId, body) {
  if (!PAPERCLIP_API_URL || !PAPERCLIP_API_KEY || !issueId) {
    log("SKIP comment: missing API_URL/API_KEY/ISSUE_ID");
    return null;
  }

  const url = `${PAPERCLIP_API_URL}/api/issues/${encodeURIComponent(issueId)}/comments`;
  log(`POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PAPERCLIP_API_KEY}`,
    },
    body: JSON.stringify({
      body,
      metadata: { source: "qwen-worker", agentId: PAPERCLIP_AGENT_ID },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Comment failed: ${res.status} ${errText}`);
    return null;
  }

  const data = await res.json();
  log(`Comment posted: id=${data.id}`);
  return data;
}

async function patchIssue(issueId, patch) {
  if (!PAPERCLIP_API_URL || !PAPERCLIP_API_KEY || !issueId) {
    log("SKIP patch: missing API_URL/API_KEY/ISSUE_ID");
    return null;
  }

  const url = `${PAPERCLIP_API_URL}/api/issues/${encodeURIComponent(issueId)}`;
  log(`PATCH ${url}`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PAPERCLIP_API_KEY}`,
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Patch failed: ${res.status} ${errText}`);
    return null;
  }

  const data = await res.json();
  log(`Issue patched: ${JSON.stringify(patch)}`);
  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  // 1. Get prompt from args or stdin
  let prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    log("No prompt in args, reading from stdin...");
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    prompt = Buffer.concat(chunks).toString("utf-8").trim();
  }

  if (!prompt) {
    console.error(JSON.stringify({ error: "No prompt provided" }));
    process.exit(1);
  }

  log(`Issue: ${PAPERCLIP_ISSUE_IDENTIFIER || "(unknown)"}`);
  log(`Prompt length: ${prompt.length} chars`);

  // 2. Build enriched prompt with issue context
  const enrichedPrompt = PAPERCLIP_ISSUE_ID
    ? `## Issue Context
- **Issue**: ${PAPERCLIP_ISSUE_IDENTIFIER || "unknown"}
- **Agent**: ${PAPERCLIP_AGENT_ID}
- **Company**: ${PAPERCLIP_COMPANY_ID}

## Task
${prompt}`
    : prompt;

  // 3. Run Qwen
  let qwenResult;
  try {
    qwenResult = await runQwen(enrichedPrompt);
  } catch (err) {
    console.error(JSON.stringify({
      error: "Qwen execution failed",
      message: err.message,
    }));

    // Still try to comment the error
    if (WRITE_COMMENT && PAPERCLIP_ISSUE_ID) {
      await postComment(PAPERCLIP_ISSUE_ID, `❌ Qwen worker failed: ${err.message}`);
    }

    process.exit(2);
  }

  // 4. Output summary to stdout for Paperclip resultJson capture
  const summary = {
    status: qwenResult.exitCode === 0 ? "success" : "error",
    exitCode: qwenResult.exitCode,
    result: qwenResult.result,
    issue: PAPERCLIP_ISSUE_IDENTIFIER || null,
    agent: PAPERCLIP_AGENT_ID,
  };

  // Print clean summary as last line so Paperclip can parse it
  console.log("\n=== QWEN WORKER RESULT ===");
  console.log(JSON.stringify(summary, null, 2));

  // 5. Post comment to issue (optional)
  if (WRITE_COMMENT && PAPERCLIP_ISSUE_ID && qwenResult.result) {
    await postComment(PAPERCLIP_ISSUE_ID, qwenResult.result);
  }

  // 6. Mark issue done/blocked (optional)
  if (MARK_DONE && PAPERCLIP_ISSUE_ID) {
    const newStatus = qwenResult.exitCode === 0 ? "done" : "blocked";
    await patchIssue(PAPERCLIP_ISSUE_ID, { status: newStatus });
  }

  // 7. Exit
  process.exit(qwenResult.exitCode);
}

main().catch((err) => {
  console.error(JSON.stringify({ error: "Unhandled", message: err.message }));
  process.exit(1);
});
