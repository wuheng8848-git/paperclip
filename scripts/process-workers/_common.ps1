Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-WorkerLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  [Console]::Error.WriteLine("[process-worker] $Message")
}

function Get-WorkerArgValue {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [Parameter(Mandatory = $true)]
    [ref]$Index,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $nextIndex = $Index.Value + 1
  if ($nextIndex -ge $Args.Length) {
    throw "$Name requires a value"
  }

  $value = $Args[$nextIndex]
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$Name requires a non-empty value"
  }

  $Index.Value = $nextIndex
  return $value
}

function Resolve-WorkerCommandPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $resolved = Get-Command $Command -ErrorAction Stop
  if ($resolved.Source) {
    return $resolved.Source
  }
  if ($resolved.Path) {
    return $resolved.Path
  }
  return $resolved.Name
}

function Resolve-WorkerCwd {
  param(
    [string]$Cwd
  )

  $effective = if ([string]::IsNullOrWhiteSpace($Cwd)) { (Get-Location).Path } else { $Cwd.Trim() }
  $resolved = Resolve-Path -LiteralPath $effective -ErrorAction Stop
  return $resolved.Path
}

function Read-WorkerPromptFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Cwd
  )

  $candidate = $Path.Trim()
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction Stop
    return Get-Content -LiteralPath $resolved.Path -Raw -Encoding UTF8
  }

  $resolvedRelative = Resolve-Path -LiteralPath (Join-Path $Cwd $candidate) -ErrorAction Stop
  return Get-Content -LiteralPath $resolvedRelative.Path -Raw -Encoding UTF8
}

function Get-WorkerInvocation {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [Parameter(Mandatory = $true)]
    [string]$DefaultCwd,
    [string]$DefaultCommand = "",
    [string[]]$DefaultCommandArgs = @()
  )

  $commandArgs = [System.Collections.Generic.List[string]]::new()
  foreach ($arg in $DefaultCommandArgs) {
    [void]$commandArgs.Add($arg)
  }

  $result = [ordered]@{
    Prompt = $null
    PromptFile = $null
    Cwd = $DefaultCwd
    DryRun = $false
    IssueId = $env:PAPERCLIP_TASK_ID
    Command = $DefaultCommand
    CommandArgs = $commandArgs
    Remainder = [System.Collections.Generic.List[string]]::new()
  }

  for ($i = 0; $i -lt $Args.Length; $i += 1) {
    $arg = $Args[$i]
    switch ($arg) {
      "--prompt" {
        $result.Prompt = Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--prompt"
        continue
      }
      "--prompt-file" {
        $result.PromptFile = Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--prompt-file"
        continue
      }
      "--cwd" {
        $result.Cwd = Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--cwd"
        continue
      }
      "--dry-run" {
        $result.DryRun = $true
        continue
      }
      "--issue-id" {
        $result.IssueId = Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--issue-id"
        continue
      }
      "--command" {
        $result.Command = Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--command"
        continue
      }
      "--command-arg" {
        [void]$result.CommandArgs.Add((Get-WorkerArgValue -Args $Args -Index ([ref]$i) -Name "--command-arg"))
        continue
      }
      "--" {
        for ($j = $i + 1; $j -lt $Args.Length; $j += 1) {
          [void]$result.Remainder.Add($Args[$j])
        }
        break
      }
      default {
        if ($arg.StartsWith("-")) {
          throw "Unknown argument: $arg"
        }
        [void]$result.Remainder.Add($arg)
      }
    }
  }

  return [pscustomobject]$result
}

function Get-WorkerIssueContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$IssueId
  )

  $apiUrl = if ([string]::IsNullOrWhiteSpace($env:PAPERCLIP_API_URL)) { "http://localhost:3100" } else { $env:PAPERCLIP_API_URL }
  $apiKey = $env:PAPERCLIP_API_KEY
  if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "Missing PAPERCLIP_API_KEY; provide --prompt / --prompt-file when no issue context is available."
  }

  $baseUrl = $apiUrl.Trim().TrimEnd("/")
  $headers = @{
    Authorization = "Bearer $apiKey"
  }

  $issueContextUri = "$baseUrl/api/issues/$([uri]::EscapeDataString($IssueId))/heartbeat-context"
  try {
    return Invoke-RestMethod -Method Get -Uri $issueContextUri -Headers $headers -ErrorAction Stop
  } catch {
    $issueUri = "$baseUrl/api/issues/$([uri]::EscapeDataString($IssueId))"
    try {
      return Invoke-RestMethod -Method Get -Uri $issueUri -Headers $headers -ErrorAction Stop
    } catch {
      throw "Unable to fetch issue context for issue '$IssueId' from Paperclip."
    }
  }
}

function ConvertTo-CompactJson {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  return ($Value | ConvertTo-Json -Depth 12 -Compress)
}

function Build-WorkerPrompt {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerName,
    [Parameter(Mandatory = $true)]
    [string]$RoleInstructions,
    [Parameter(Mandatory = $true)]
    [string]$Cwd,
    [Parameter(Mandatory = $true)]
    [string]$PromptBody,
    [string]$PromptSource = "manual"
  )

  $sections = @(
    "# Paperclip process worker: $WorkerName",
    "Working directory: $Cwd",
    "Prompt source: $PromptSource",
    "Role instructions:",
    $RoleInstructions.Trim(),
    "Task prompt:",
    $PromptBody.Trim()
  )

  return ($sections -join "`n`n").Trim() + "`n"
}

function Build-WorkerPromptFromIssueContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerName,
    [Parameter(Mandatory = $true)]
    [string]$RoleInstructions,
    [Parameter(Mandatory = $true)]
    [string]$Cwd,
    [Parameter(Mandatory = $true)]
    [object]$IssueContext,
    [Parameter(Mandatory = $true)]
    [string]$IssueId
  )

  $contextJson = ConvertTo-CompactJson -Value $IssueContext
  $body = @"
Paperclip issue context for issue $($IssueId):

```json
$contextJson
```

Use this context to complete the task described by the issue. Keep the response concise, actionable, and grounded in the repository state.
"@

  return Build-WorkerPrompt -WorkerName $WorkerName -RoleInstructions $RoleInstructions -Cwd $Cwd -PromptBody $body -PromptSource "paperclip issue context"
}

function Build-WorkerDryRunSummary {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerName,
    [Parameter(Mandatory = $true)]
    [string]$CommandPath,
    [Parameter(Mandatory = $true)]
    [string[]]$CommandArgs,
    [Parameter(Mandatory = $true)]
    [string]$Cwd,
    [Parameter(Mandatory = $true)]
    [string]$PromptSource,
    [Parameter(Mandatory = $true)]
    [string]$PromptBody,
    [string]$IssueId = $null
  )

  return [pscustomobject]@{
    worker = $WorkerName
    cwd = $Cwd
    command = $CommandPath
    args = $CommandArgs
    issueId = $IssueId
    promptSource = $PromptSource
    promptChars = $PromptBody.Length
    promptPreview = if ($PromptBody.Length -gt 240) { $PromptBody.Substring(0, 240) + "..." } else { $PromptBody }
  }
}

function Invoke-WorkerCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerName,
    [Parameter(Mandatory = $true)]
    [string]$CommandPath,
    [Parameter(Mandatory = $true)]
    [string[]]$CommandArgs,
    [Parameter(Mandatory = $true)]
    [string]$Cwd,
    [Parameter(Mandatory = $true)]
    [string]$PromptBody
  )

  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()
  $stdinFile = [System.IO.Path]::GetTempFileName()

  try {
    Set-Content -LiteralPath $stdinFile -Value $PromptBody -Encoding UTF8 -NoNewline

    $startInfo = @{
      FilePath = $CommandPath
      ArgumentList = $CommandArgs
      WorkingDirectory = $Cwd
      RedirectStandardOutput = $stdoutFile
      RedirectStandardError = $stderrFile
      RedirectStandardInput = $stdinFile
      NoNewWindow = $true
      PassThru = $true
      Wait = $true
    }

    Write-WorkerLog "starting ${WorkerName}: $CommandPath $($CommandArgs -join ' ')"
    $proc = Start-Process @startInfo

    $stdoutText = if (Test-Path -LiteralPath $stdoutFile) { Get-Content -LiteralPath $stdoutFile -Raw -Encoding UTF8 } else { "" }
    $stderrText = if (Test-Path -LiteralPath $stderrFile) { Get-Content -LiteralPath $stderrFile -Raw -Encoding UTF8 } else { "" }

    if ($stdoutText) {
      [Console]::Out.Write($stdoutText)
    }
    if ($stderrText) {
      [Console]::Error.Write($stderrText)
    }

    return [pscustomobject]@{
      exitCode = $proc.ExitCode
      stdout = $stdoutText
      stderr = $stderrText
    }
  } finally {
    Remove-Item -LiteralPath $stdoutFile, $stderrFile, $stdinFile -ErrorAction SilentlyContinue
  }
}

function Post-WorkerIssueCommentIfPossible {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerName,
    [string]$IssueId,
    [Parameter(Mandatory = $true)]
    [string]$Cwd,
    [Parameter(Mandatory = $true)]
    [int]$ExitCode,
    [Parameter(Mandatory = $true)]
    [string]$Stdout,
    [Parameter(Mandatory = $true)]
    [string]$Stderr
  )

  if ([string]::IsNullOrWhiteSpace($IssueId)) {
    return
  }
  if ([string]::IsNullOrWhiteSpace($env:PAPERCLIP_API_URL) -or [string]::IsNullOrWhiteSpace($env:PAPERCLIP_API_KEY)) {
    return
  }

  $baseUrl = $env:PAPERCLIP_API_URL.Trim().TrimEnd("/")
  $url = "$baseUrl/api/issues/$([uri]::EscapeDataString($IssueId))/comments"
  $excerptSource = if ($Stdout.Trim()) { $Stdout.Trim() } else { $Stderr.Trim() }
  $excerpt = if ($excerptSource.Length -gt 3000) { $excerptSource.Substring(0, 3000) + "`n... [truncated]" } else { $excerptSource }
  try {
    $body = "worker=" + $WorkerName + "; cwd=" + $Cwd + "; exitCode=" + $ExitCode + "; excerpt=" + $excerpt
    $headers = @{ Authorization = ('Bearer ' + $env:PAPERCLIP_API_KEY); 'Content-Type' = 'application/json' }
    $payload = @{ body = $body; metadata = @{ source = $WorkerName } } | ConvertTo-Json -Depth 8
    Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $payload -ErrorAction Stop | Out-Null
  } catch {
  }
}
