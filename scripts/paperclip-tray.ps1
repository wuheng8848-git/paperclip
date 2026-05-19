#requires -Version 5.1
<#
  Paperclip 本机开发：系统托盘 — 停服 / nuke / dev:once / 一条龙外置终端 / 打开看板；退出仅关托盘。

  **分层：** 托盘进程的启动/退出、单实例互斥体与宿主窗体 **不** 依赖回形针是否在跑、也不依赖 PATH 里是否有 pnpm。
  只有 **左键/右键触发的菜单动作**（打开看板、pnpm 命令、一条龙脚本）才触及仓库与开发工具链。

  STA：若当前线程不是 STA，会自拉起 pwsh（建议子进程带 -WindowStyle Hidden）。

  ## 快捷方式 / 无控制台启动（推荐）

  **方案 A（优先）：** 快捷方式目标不要用 ps1 直接挂文件类型关联；改为指向：
    `wscript.exe //nologo "...\scripts\paperclip-tray-launch.vbs"`
  由 VBScript `Run(..., 0)` 启动隐藏窗口的 pwsh（见同目录 `paperclip-tray-launch.vbs`）。

  **方案 B：** 快捷方式目标 =
    `"C:\Program Files\PowerShell\7\pwsh.exe" -NoProfile -WindowStyle Hidden -STA -ExecutionPolicy Bypass -File "...\scripts\paperclip-tray.ps1"`

  **勿用：** 在本脚本内 FreeConsole() — 易导致宿主提前退出、托盘起不来。

  **进程记录：** `%TEMP%\PaperclipDevTray_<仓库SHA1>.pid` 写入当前宿主 `pwsh` 的 PID（仅用于排障/脚本回收）。
  启动前会清理：**陈旧 pid 文件**、以及 **互斥体仍被占用时** 同一 `-File` 路径下的其它托盘宿主进程（排除当前启动这一条），避免「图标没了却提示已在运行」的卡死态。

  仓库根目录由脚本路径推导（scripts 的上级）；也可显式指定 -RepoRoot。
#>
param(
  [string]$RepoRoot = "",
  [string]$BoardUrl = "http://127.0.0.1:3100/",
  [switch]$NoCompose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-PaperclipRepoRoot {
  if ($RepoRoot -and (Test-Path -LiteralPath $RepoRoot)) {
    return (Resolve-Path -LiteralPath $RepoRoot).Path
  }
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-PnpmProcessStart {
  param([Parameter(Mandatory)][string]$PnpmArguments)
  $app = Get-Command pnpm -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $app -or -not $app.Source) {
    return $null
  }
  $path = $app.Source
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  $cmd = Join-Path $env:SystemRoot "System32\cmd.exe"

  switch ($ext) {
    { $_ -in ".cmd", ".bat" } {
      return @{
        FileName = $cmd
        Arguments = '/d /s /c "' + $path + '" ' + $PnpmArguments
      }
    }
    ".ps1" {
      $pwshApp = Get-Command pwsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
      if (-not $pwshApp -or -not $pwshApp.Source) {
        return $null
      }
      return @{
        FileName = $pwshApp.Source
        Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $path + '" ' + $PnpmArguments
      }
    }
    default {
      return @{
        FileName = $path
        Arguments = $PnpmArguments
      }
    }
  }
}

function Invoke-PnpmInRepo {
  param(
    [Parameter(Mandatory)][string]$Root,
    [Parameter(Mandatory)][string]$Arguments
  )
  $resolved = Resolve-PnpmProcessStart -PnpmArguments $Arguments
  if (-not $resolved) {
    throw "无法在 PATH 中解析可执行的 pnpm（Windows 上常为 pnpm.cmd；托盘进程不能用裸文件名 pnpm 拉起子进程）。"
  }
  Push-Location $Root
  try {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $resolved.FileName
    $pinfo.Arguments = $resolved.Arguments
    $pinfo.WorkingDirectory = $Root
    $pinfo.UseShellExecute = $false
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.CreateNoWindow = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    [void]$p.Start()
    $null = $p.StandardOutput.ReadToEnd()
    $null = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    return [int]$p.ExitCode
  }
  finally {
    Pop-Location
  }
}

function Invoke-PnpmDevStop {
  param([string]$Root)
  try {
    $code = Invoke-PnpmInRepo -Root $Root -Arguments "dev:stop"
    if ($code -ne 0) {
      Write-Warning "pnpm dev:stop 退出码: $code"
    }
  }
  catch {
    Write-Warning "pnpm dev:stop: $($_.Exception.Message)"
  }
}

function Start-PaperclipExternalWindow {
  param([string]$Root)
  $startScript = Join-Path $PSScriptRoot "start-paperclip-dev-external.ps1"
  if (-not (Test-Path -LiteralPath $startScript)) {
    throw "Missing: $startScript"
  }
  Push-Location $Root
  try {
    if ($NoCompose) {
      & $startScript -NoCompose
    }
    else {
      & $startScript
    }
  }
  finally {
    Pop-Location
  }
}

function Show-PnpmResultIfNeeded {
  param([string]$Title, [int]$ExitCode)
  if ($ExitCode -eq 0) {
    return
  }
  [System.Windows.Forms.MessageBox]::Show(
    "pnpm 已结束。退出码: $ExitCode",
    $Title,
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
}

function Test-PnpmOnPath {
  return [bool](
    (Get-Command pnpm -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
  )
}

function Show-PnpmMissingBox {
  [System.Windows.Forms.MessageBox]::Show(
    "未在 PATH 中找到 pnpm。请先安装 pnpm 或将其加入 PATH。",
    "需要 pnpm",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
}

function Get-PaperclipTrayHostProcesses {
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

function Stop-OtherPaperclipTrayHosts {
  param(
    [Parameter(Mandatory)][string]$ScriptFullPath,
    [Parameter(Mandatory)][int]$ExcludeProcessId
  )
  foreach ($cimProc in Get-PaperclipTrayHostProcesses -ScriptFullPath $ScriptFullPath) {
    $procId = [int]$cimProc.ProcessId
    if ($procId -eq $ExcludeProcessId) {
      continue
    }
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

function Clear-StaleTrayPidFile {
  param(
    [Parameter(Mandatory)][string]$PidPath,
    [Parameter(Mandatory)][string]$ScriptFullPath
  )
  if (-not (Test-Path -LiteralPath $PidPath)) {
    return
  }
  $firstLine = Get-Content -LiteralPath $PidPath -TotalCount 1 -ErrorAction SilentlyContinue
  if (-not $firstLine) {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    return
  }
  $parsedPid = 0
  if (-not [int]::TryParse($firstLine.Trim(), [ref]$parsedPid)) {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    return
  }
  $alive = Get-Process -Id $parsedPid -ErrorAction SilentlyContinue
  if (-not $alive) {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    return
  }
  $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$parsedPid" -ErrorAction SilentlyContinue
  $needle = [regex]::Escape($ScriptFullPath)
  if (-not $cim -or -not $cim.CommandLine -or -not ($cim.CommandLine -match $needle)) {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
  }
}

function Write-TrayPidFile {
  param(
    [Parameter(Mandatory)][string]$PidPath,
    [Parameter(Mandatory)][int]$ProcessId
  )
  $dir = Split-Path -Parent $PidPath
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Set-Content -LiteralPath $PidPath -Value ([string]$ProcessId) -Encoding ascii -Force
}

function Remove-TrayPidFile {
  param([Parameter(Mandatory)][string]$PidPath)
  Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
}

function Wait-TraySingletonMutex {
  param([Parameter(Mandatory)][System.Threading.Mutex]$Mtx)
  try {
    return [bool]$Mtx.WaitOne(0, $false)
  }
  catch [System.Threading.AbandonedMutexException] {
    return $true
  }
  catch {
    return $false
  }
}

# STA：NotifyIcon 需要单线程套间
if ([System.Threading.Thread]::CurrentThread.GetApartmentState() -ne [System.Threading.ApartmentState]::STA) {
  $shell = Get-Command pwsh -ErrorAction SilentlyContinue
  if (-not $shell) {
    $shell = Get-Command powershell -ErrorAction SilentlyContinue
  }
  if (-not $shell) {
    throw "需要 pwsh 或 Windows PowerShell。"
  }
  $exe = $shell.Source
  $self = $MyInvocation.MyCommand.Path
  $argsList = @(
    "-NoProfile", "-WindowStyle", "Hidden", "-STA", "-ExecutionPolicy", "Bypass",
    "-File", $self
  )
  if ($RepoRoot) {
    $argsList += "-RepoRoot", $RepoRoot
  }
  if ($BoardUrl -ne "http://127.0.0.1:3100/") {
    $argsList += "-BoardUrl", $BoardUrl
  }
  if ($NoCompose) {
    $argsList += "-NoCompose"
  }
  Start-Process -FilePath $exe `
    -ArgumentList $argsList `
    -WorkingDirectory (Get-PaperclipRepoRoot) `
    -WindowStyle Hidden | Out-Null
  exit 0
}

$root = Get-PaperclipRepoRoot
$scriptFullPath = [System.IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)

# 单实例（按仓库路径哈希，避免路径过长） + PID 记录（%TEMP%\PaperclipDevTray_<hash>.pid）
$hash = [BitConverter]::ToString(
  [System.Security.Cryptography.SHA1]::Create().ComputeHash(
    [Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant())
  )
) -replace '-', ''
$mutexName = "Local\PaperclipDevTray_$hash"
$trayPidPath = Join-Path $env:TEMP "PaperclipDevTray_$hash.pid"

Clear-StaleTrayPidFile -PidPath $trayPidPath -ScriptFullPath $scriptFullPath

$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$launcherPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$hasHandle = Wait-TraySingletonMutex -Mtx $mutex

if (-not $hasHandle) {
  Stop-OtherPaperclipTrayHosts -ScriptFullPath $scriptFullPath -ExcludeProcessId $launcherPid
  Start-Sleep -Milliseconds 500
  $hasHandle = Wait-TraySingletonMutex -Mtx $mutex
}

if (-not $hasHandle) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    @(
      "此仓库路径的开发托盘已在运行（仍占用单实例锁）。"
      ""
      "若任务栏里没有图标：可先结束与本脚本同路径的 pwsh 宿主，或运行 scripts/paperclip-tray-verify.ps1 -CleanupOnly"
    ) -join "`n",
    "托盘",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
  exit 0
}

Stop-OtherPaperclipTrayHosts -ScriptFullPath $scriptFullPath -ExcludeProcessId $launcherPid
Write-TrayPidFile -PidPath $trayPidPath -ProcessId $launcherPid

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

# WinForms 消息循环必须挂在可见窗体链路上；用极小、不出屏的宿主 Form（勿 FreeConsole）
$form = New-Object System.Windows.Forms.Form
$form.ShowInTaskbar = $false
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedToolWindow
$form.MinimizeBox = $false
$form.MaximizeBox = $false
$form.ControlBox = $false
$form.Size = New-Object System.Drawing.Size(1, 1)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point(-30000, -30000)
$form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$form.Visible = $false

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Visible = $true
$notifyIcon.Text = "Paperclip 开发托盘（菜单操作才连仓库）"

$ctx = New-Object System.Windows.Forms.ContextMenuStrip
$null = $ctx.Items.Add("打开看板")
$null = $ctx.Items.Add("-")
$null = $ctx.Items.Add("停服（pnpm dev:stop）")
$null = $ctx.Items.Add("进程清理（pnpm dev:nuke）")
$null = $ctx.Items.Add("启动服务（pnpm dev:once）")
$null = $ctx.Items.Add("-")
$null = $ctx.Items.Add("一条龙启动（外置终端 · Compose 预检）")
$null = $ctx.Items.Add("-")
$null = $ctx.Items.Add("退出托盘")

$miOpen = $ctx.Items[0]
$miStop = $ctx.Items[2]
$miNuke = $ctx.Items[3]
$miOnce = $ctx.Items[4]
$miPipeline = $ctx.Items[6]
$miExitTray = $ctx.Items[8]

$miOpen.add_Click({
  try {
    Start-Process $BoardUrl
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Paperclip") | Out-Null
  }
})

$miStop.add_Click({
  if (-not (Test-PnpmOnPath)) {
    Show-PnpmMissingBox
    return
  }
  try {
    $code = Invoke-PnpmInRepo -Root $root -Arguments "dev:stop"
    Show-PnpmResultIfNeeded -Title "停服 dev:stop" -ExitCode $code
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "停服失败", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})

$miNuke.add_Click({
  if (-not (Test-PnpmOnPath)) {
    Show-PnpmMissingBox
    return
  }
  $confirm = [System.Windows.Forms.MessageBox]::Show(
    "将执行 pnpm dev:nuke，清理孤儿 node / 内嵌 postgres 等进程（可先在日常环境用 dev:nuke -- -DryRun）。`n`n确认继续？",
    "进程清理",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  )
  if ($confirm -ne [System.Windows.Forms.DialogResult]::Yes) {
    return
  }
  try {
    $code = Invoke-PnpmInRepo -Root $root -Arguments "dev:nuke"
    Show-PnpmResultIfNeeded -Title "进程清理 dev:nuke" -ExitCode $code
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "dev:nuke 失败", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})

$miOnce.add_Click({
  if (-not (Test-PnpmOnPath)) {
    Show-PnpmMissingBox
    return
  }
  try {
    $code = Invoke-PnpmInRepo -Root $root -Arguments "dev:once"
    Show-PnpmResultIfNeeded -Title "启动 dev:once" -ExitCode $code
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "dev:once 失败", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})

$miPipeline.add_Click({
  if (-not (Test-PnpmOnPath)) {
    Show-PnpmMissingBox
    return
  }
  try {
    Invoke-PnpmDevStop -Root $root
    Start-PaperclipExternalWindow -Root $root
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "一条龙启动失败", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})

$miExitTray.add_Click({
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  $form.Close()
})

$notifyIcon.ContextMenuStrip = $ctx

function Show-TrayMenu {
  $ctx.Show([System.Windows.Forms.Cursor]::Position, [System.Windows.Forms.ToolStripDropDownDirection]::BelowRight)
}

$notifyIcon.add_MouseClick({
  param($sender, $evt)
  if ($evt.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
    Show-TrayMenu
  }
})

$form.add_FormClosing({
  Remove-TrayPidFile -PidPath $trayPidPath
  if ($notifyIcon) {
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
  }
  if ($mutex) {
    try { $mutex.ReleaseMutex() | Out-Null } catch { }
    try { $mutex.Dispose() } catch { }
  }
})

$null = [System.Windows.Forms.Application]::Run($form)
