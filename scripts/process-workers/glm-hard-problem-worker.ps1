#!/usr/bin/env pwsh
. "$PSScriptRoot/_common.ps1"

$invocation = Get-WorkerInvocation -Args $args -DefaultCwd (Get-Location).Path
$resolvedCwd = Resolve-WorkerCwd -Cwd $invocation.Cwd
$roleInstructions = @"
You are the hard-problem worker.
Focus on debugging, cross-module failure analysis, architecture tradeoffs, and the smallest change that resolves the real problem.
Prefer evidence, reproduction, and minimal-risk fixes over broad refactors.
"@

$promptSource = $invocation.PromptFile ? "prompt-file" : ($invocation.Prompt ? "prompt" : ($invocation.IssueId ? "paperclip issue context" : "missing"))
$taskPrompt = if ($invocation.Prompt) {
  Build-WorkerPrompt -WorkerName "glm-hard-problem-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody $invocation.Prompt -PromptSource $promptSource
} elseif ($invocation.PromptFile) {
  Build-WorkerPrompt -WorkerName "glm-hard-problem-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody (Read-WorkerPromptFile -Path $invocation.PromptFile -Cwd $resolvedCwd) -PromptSource $promptSource
} elseif ($invocation.IssueId) {
  $issueContext = Get-WorkerIssueContext -IssueId $invocation.IssueId
  Build-WorkerPromptFromIssueContext -WorkerName "glm-hard-problem-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -IssueContext $issueContext -IssueId $invocation.IssueId
} else {
  throw "Provide --prompt, --prompt-file, or PAPERCLIP_TASK_ID with PAPERCLIP_API_URL/PAPERCLIP_API_KEY."
}

$commandPath = Resolve-WorkerCommandPath -Command "codebuddy"
$commandArgs = @(
  "--print",
  "--model", "glm-5.1",
  "--output-format", "json",
  "-y"
)

if ($invocation.DryRun) {
  ConvertTo-Json (Build-WorkerDryRunSummary -WorkerName "glm-hard-problem-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptSource $promptSource -PromptBody $taskPrompt -IssueId $invocation.IssueId) -Depth 8 | Write-Output
  exit 0
}

$result = Invoke-WorkerCommand -WorkerName "glm-hard-problem-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptBody $taskPrompt
Post-WorkerIssueCommentIfPossible -WorkerName "glm-hard-problem-worker" -IssueId $invocation.IssueId -Cwd $resolvedCwd -ExitCode $result.exitCode -Stdout $result.stdout -Stderr $result.stderr
exit $result.exitCode

