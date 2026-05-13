#!/usr/bin/env pwsh
. "$PSScriptRoot/_common.ps1"

$invocation = Get-WorkerInvocation -Args $args -DefaultCwd (Get-Location).Path
$resolvedCwd = Resolve-WorkerCwd -Cwd $invocation.Cwd
$roleInstructions = @"
You are the backend worker.
Focus on backend interfaces, service logic, API routes, database behavior, integration code, and server-side verification.
Avoid frontend changes unless they are strictly necessary to complete the task.
"@

$promptSource = $invocation.PromptFile ? "prompt-file" : ($invocation.Prompt ? "prompt" : ($invocation.IssueId ? "paperclip issue context" : "missing"))
$taskPrompt = if ($invocation.Prompt) {
  Build-WorkerPrompt -WorkerName "qwen-backend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody $invocation.Prompt -PromptSource $promptSource
} elseif ($invocation.PromptFile) {
  Build-WorkerPrompt -WorkerName "qwen-backend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody (Read-WorkerPromptFile -Path $invocation.PromptFile -Cwd $resolvedCwd) -PromptSource $promptSource
} elseif ($invocation.IssueId) {
  $issueContext = Get-WorkerIssueContext -IssueId $invocation.IssueId
  Build-WorkerPromptFromIssueContext -WorkerName "qwen-backend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -IssueContext $issueContext -IssueId $invocation.IssueId
} else {
  throw "Provide --prompt, --prompt-file, or PAPERCLIP_TASK_ID with PAPERCLIP_API_URL/PAPERCLIP_API_KEY."
}

$commandPath = Resolve-WorkerCommandPath -Command "qwen"
$commandArgs = @(
  "-o", "json",
  "--approval-mode", "yolo",
  "--max-session-turns", "1",
  "--"
)

if ($invocation.DryRun) {
  ConvertTo-Json (Build-WorkerDryRunSummary -WorkerName "qwen-backend-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptSource $promptSource -PromptBody $taskPrompt -IssueId $invocation.IssueId) -Depth 8 | Write-Output
  exit 0
}

$result = Invoke-WorkerCommand -WorkerName "qwen-backend-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptBody $taskPrompt
Post-WorkerIssueCommentIfPossible -WorkerName "qwen-backend-worker" -IssueId $invocation.IssueId -Cwd $resolvedCwd -ExitCode $result.exitCode -Stdout $result.stdout -Stderr $result.stderr
exit $result.exitCode

