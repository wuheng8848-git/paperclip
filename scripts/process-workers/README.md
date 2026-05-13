# Process Worker Wrappers

This folder contains the first-version local execution wrappers for Paperclip `process` agents.

The wrappers are intentionally thin:

- the `.ps1` files are the entrypoints Paperclip can call
- `_common.ps1` handles argument parsing, prompt loading, issue-context fallback, child process execution, and optional issue comments
- the wrappers do not change Paperclip core adapters or the DB schema

## Files

- `qwen-backend-worker.ps1`
- `kimi-frontend-worker.ps1`
- `glm-hard-problem-worker.ps1`
- `qa-command-worker.ps1`

## Manual usage

```powershell
pwsh -File .\scripts\process-workers\qwen-backend-worker.ps1 --prompt "Inspect the API route for the new agent template." --cwd "C:\Users\wuhen\code\paperclip-latest-20260512" --dry-run
pwsh -File .\scripts\process-workers\kimi-frontend-worker.ps1 --prompt-file .\prompts\frontend-task.md --cwd "C:\Users\wuhen\code\paperclip-latest-20260512" --dry-run
pwsh -File .\scripts\process-workers\glm-hard-problem-worker.ps1 --prompt "Find the root cause of the run resume regression." --cwd "C:\Users\wuhen\code\paperclip-latest-20260512" --dry-run
pwsh -File .\scripts\process-workers\qa-command-worker.ps1 --command pnpm --command-arg test --cwd "C:\Users\wuhen\code\paperclip-latest-20260512" --dry-run
```

## Paperclip process adapter examples

Paperclip can run these wrappers through the generic `process` adapter.
The wrapper defaults to the local Paperclip API at `http://localhost:3100` when no explicit `PAPERCLIP_API_URL` is set.
If `PAPERCLIP_API_KEY` is available, it can fetch issue heartbeat context and optionally write a short issue comment after the run.

### QWEN backend engineer

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "pwsh",
    "args": [
      "-NoLogo",
      "-NoProfile",
      "-File",
      "scripts/process-workers/qwen-backend-worker.ps1"
    ],
    "cwd": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512",
    "timeoutSec": 1800
  }
}
```

### KIMI frontend engineer

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "pwsh",
    "args": [
      "-NoLogo",
      "-NoProfile",
      "-File",
      "scripts/process-workers/kimi-frontend-worker.ps1"
    ],
    "cwd": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512",
    "timeoutSec": 1800
  }
}
```

### GLM hard-problem engineer

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "pwsh",
    "args": [
      "-NoLogo",
      "-NoProfile",
      "-File",
      "scripts/process-workers/glm-hard-problem-worker.ps1"
    ],
    "cwd": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512",
    "timeoutSec": 1800
  }
}
```

### QA reviewer

Default validation:

- `pnpm typecheck`

Override to run a specific safe validation command:

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "pwsh",
    "args": [
      "-NoLogo",
      "-NoProfile",
      "-File",
      "scripts/process-workers/qa-command-worker.ps1",
      "--command",
      "pnpm",
      "--command-arg",
      "test"
    ],
    "cwd": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512",
    "timeoutSec": 1800
  }
}
```

## Optional issue comments

If the following environment variable exists, the wrappers will attempt to write a short issue comment after the child process exits:

- `PAPERCLIP_API_KEY`

If it is missing, the wrappers still succeed and simply skip the comment.

## Notes

- The wrappers do not write API keys to disk.
- The wrappers do not change any global CLI configuration.
- The wrappers are safe to call with `--dry-run` before turning them into Paperclip process agents.
