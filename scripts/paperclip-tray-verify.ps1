#requires -Version 5.1
<#
  Paperclip 托盘生命周期自检（与菜单里的 pnpm / 看板无关）。

  -CleanupOnly：按仓库哈希结束所有运行 paperclip-tray.ps1 的 pwsh/powershell，并删除 %TEMP% 下对应 pid 文件。
  -Smoke：经 paperclip-tray-launch.vbs 拉起托盘，确认进程与 pid 文件一致后强制结束并清理残留 pid。
#>
param(
  [switch]$CleanupOnly,
  [switch]$Smoke
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$trayPs1 = Join-Path $PSScriptRoot "paperclip-tray.ps1"
$trayFull = [System.IO.Path]::GetFullPath($trayPs1)

if (-not (Test-Path -LiteralPath $trayPs1)) {
  throw "Missing tray script: $trayPs1"
}

$hash = [BitConverter]::ToString(
  [System.Security.Cryptography.SHA1]::Create().ComputeHash(
    [Text.Encoding]::UTF8.GetBytes($repoRoot.ToLowerInvariant())
  )
) -replace '-', ''
$pidPath = Join-Path $env:TEMP "PaperclipDevTray_$hash.pid"

function Get-TrayHostProcesses {
  param([Parameter(Mandatory)][string]$ScriptFullPath)
  $needle = [regex]::Escape($ScriptFullPath)
  $candidates = @()
  $candidates += Get-CimInstance -ClassName Win32_Process -Filter "Name='pwsh.exe'" -ErrorAction SilentlyContinue
  $candidates += Get-CimInstance -ClassName Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue
  $candidates |
    Where-Object {
      $_.CommandLine -and
      ($_.CommandLine -match $needle)
    }
}

if ($CleanupOnly) {
  foreach ($cimProc in Get-TrayHostProcesses -ScriptFullPath $trayFull) {
    Stop-Process -Id ([int]$cimProc.ProcessId) -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
  Write-Host "Tray cleanup done (repo root: $repoRoot)"
  exit 0
}

if ($Smoke) {
  $vbs = Join-Path $PSScriptRoot "paperclip-tray-launch.vbs"
  if (-not (Test-Path -LiteralPath $vbs)) {
    throw "Missing launcher: $vbs"
  }

  $wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
  Start-Process -FilePath $wscript -ArgumentList @("//nologo", $vbs) -WindowStyle Hidden | Out-Null

  Start-Sleep -Seconds 5

  $hosts = @(Get-TrayHostProcesses -ScriptFullPath $trayFull)
  if ($hosts.Count -lt 1) {
    throw "Smoke failed: no pwsh host found for paperclip-tray.ps1 (check STA / shortcut)."
  }

  if (-not (Test-Path -LiteralPath $pidPath)) {
    throw "Smoke failed: pid file missing: $pidPath"
  }

  $line = Get-Content -LiteralPath $pidPath -TotalCount 1 -ErrorAction Stop
  $recorded = 0
  if (-not [int]::TryParse($line.Trim(), [ref]$recorded)) {
    throw "Smoke failed: invalid pid file content: $line"
  }

  $match = $hosts | Where-Object { [int]$_.ProcessId -eq $recorded }
  if (-not $match) {
    throw "Smoke failed: pid $recorded not in tray host list (hosts: $($hosts.ProcessId -join ', '))."
  }

  Stop-Process -Id $recorded -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue

  Write-Host "Smoke OK: tray started, pid file matched host $recorded, process stopped and pid file removed."
  exit 0
}

Write-Host "Specify -CleanupOnly or -Smoke."
exit 1
