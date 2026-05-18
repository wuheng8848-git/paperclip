import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

let prependedGitBashBin = false;

/**
 * Git for Windows installs `bash.exe` under `Git\\usr\\bin` / `Git\\bin`, which is
 * often missing from the minimal PATH seen by test runners. Sandbox/remote-command
 * tests spawn `bash -c "…"`.
 */
export function ensureGitBashOnPathForCursorTests(): void {
  if (prependedGitBashBin || process.platform !== "win32") return;
  prependedGitBashBin = true;
  const dirs = [
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "usr", "bin"),
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin"),
  ];
  for (const dir of dirs) {
    if (existsSync(path.join(dir, "bash.exe"))) {
      process.env.PATH = `${dir};${process.env.PATH ?? ""}`;
      return;
    }
  }
}

export function canSpawnBashForCursorTests(): boolean {
  ensureGitBashOnPathForCursorTests();
  try {
    execFileSync("bash", ["-c", "exit 0"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * `child_process.spawn` with `shell:false` cannot execute shebang scripts on Windows;
 * these fixtures rely on POSIX exec semantics.
 */
export const win32ShebangSpawnUnsupported = process.platform === "win32";
