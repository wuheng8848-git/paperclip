#!/usr/bin/env pwsh
. "$PSScriptRoot/_common.ps1"

$invocation = Get-WorkerInvocation -Args $args -DefaultCwd (Get-Location).Path -DefaultCommand "pnpm" -DefaultCommandArgs @("typecheck")
$resolvedCwd = Resolve-WorkerCwd -Cwd $invocation.Cwd
$roleInstructions = @"
You are the QA worker.
Run the validation command exactly as configured, report the result, and do not perform destructive actions.
If the command fails, report the failing command and the relevant output.
"@

$taskPrompt = if ($invocation.Prompt) {
  Build-WorkerPrompt -WorkerName "qa-command-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody $invocation.Prompt -PromptSource "prompt"
} elseif ($invocation.PromptFile) {
  Build-WorkerPrompt -WorkerName "qa-command-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody (Read-WorkerPromptFile -Path $invocation.PromptFile -Cwd $resolvedCwd) -PromptSource "prompt-file"
} elseif ($invocation.IssueId) {
  $issueContext = Get-WorkerIssueContext -IssueId $invocation.IssueId
  Build-WorkerPromptFromIssueContext -WorkerName "qa-command-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -IssueContext $issueContext -IssueId $invocation.IssueId
} else {
  Build-WorkerPrompt -WorkerName "qa-command-worker" -RoleInstructions $roleInstructions -Cwd $resolvedCwd -PromptBody "Run the configured validation command and return the exact result." -PromptSource "default"
}

$commandPath = Resolve-WorkerCommandPath -Command $invocation.Command
$commandArgs = [string[]]@($invocation.CommandArgs)

if ($invocation.DryRun) {
  ConvertTo-Json (Build-WorkerDryRunSummary -WorkerName "qa-command-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptSource ($(if ($invocation.Prompt) { "prompt" } elseif ($invocation.PromptFile) { "prompt-file" } elseif ($invocation.IssueId) { "paperclip issue context" } else { "default" })) -PromptBody $taskPrompt -IssueId $invocation.IssueId) -Depth 8 | Write-Output
  exit 0
}

$result = Invoke-WorkerCommand -WorkerName "qa-command-worker" -CommandPath $commandPath -CommandArgs $commandArgs -Cwd $resolvedCwd -PromptBody $taskPrompt
Post-WorkerIssueCommentIfPossible -WorkerName "qa-command-worker" -IssueId $invocation.IssueId -Cwd $resolvedCwd -ExitCode $result.exitCode -Stdout $result.stdout -Stderr $result.stderr
exit $result.exitCode
