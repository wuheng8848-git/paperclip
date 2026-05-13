#!/usr/bin/env pwsh
. "$PSScriptRoot/_common.ps1"

$invocation = Get-WorkerInvocation -Args $args -DefaultCwd (Get-Location).Path
$resolvedCwd = Resolve-WorkerCwd -Cwd $invocation.Cwd
$roleInstructions = @"
You are the frontend worker.
Focus on UI pages, interactions, styles, copy, small-to-medium front-end refactors, and user-facing polish.
Avoid backend changes unless they are required to finish the requested UI work.
"@

$promptSource = $invocation.PromptFile ? "prompt-file" : ($invocation.Prompt ? "prompt" : ($invocation.IssueId ? "paperclip issue context" : "missing"))
$taskPrompt = if ($invocation.Prompt) {
  Build-WorkerPrompt -WorkerName "kimi-frontend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody $invocation.Prompt -PromptSource $promptSource
} elseif ($invocation.PromptFile) {
  Build-WorkerPrompt -WorkerName "kimi-frontend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody (Read-WorkerPromptFile -Path $invocation.PromptFile -Cwd $resolvedCwd) -PromptSource $promptSource
} elseif ($invocation.IssueId) {
  $issueContext = Get-WorkerIssueContext -IssueId $invocation.IssueId
  Build-WorkerPromptFromIssueContext -WorkerName "kimi-frontend-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -IssueContext $issueContext -IssueId $invocation.IssueId
} else {
  throw "Provide --prompt, --prompt-file, or PAPERCLIP_TASK_ID with PAPERCLIP_API_URL/PAPERCLIP_API_KEY."
}

$commandPath = Resolve-WorkerCommandPath -Command "codebuddy"
$commandArgs = @(
  "--print",
  "--model", "kimi-k2.6",
  "--output-format", "json",
  "-y"
)

if ($invocation.DryRun) {
  ConvertTo-Json (Build-WorkerDryRunSummary -WorkerName "kimi-frontend-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptSource $promptSource -PromptBody $taskPrompt -IssueId $invocation.IssueId) -Depth 8 | Write-Output
  exit 0
}

$result = Invoke-WorkerCommand -WorkerName "kimi-frontend-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptBody $taskPrompt
Post-WorkerIssueCommentIfPossible -WorkerName "kimi-frontend-worker" -IssueId $invocation.IssueId -Cwd $resolvedCwd -ExitCode $result.exitCode -Stdout $result.stdout -Stderr $result.stderr
exit $result.exitCode

