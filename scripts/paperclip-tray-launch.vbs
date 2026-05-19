Option Explicit
' Hidden-window launcher for paperclip-tray.ps1 (shortcut target → wscript.exe //nologo "<repo>\scripts\paperclip-tray-launch.vbs")
Dim shell, fso, scriptDir, repoRoot, ps1, pwshQuoted, cmd

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
ps1 = scriptDir & "\paperclip-tray.ps1"

If Not fso.FileExists(ps1) Then
  MsgBox "Missing tray script: " & ps1, vbCritical, "Paperclip Tray"
  WScript.Quit 1
End If

shell.CurrentDirectory = repoRoot

If fso.FileExists("C:\Program Files\PowerShell\7\pwsh.exe") Then
  pwshQuoted = """C:\Program Files\PowerShell\7\pwsh.exe"""
ElseIf fso.FileExists("C:\Program Files\PowerShell\7-preview\pwsh.exe") Then
  pwshQuoted = """C:\Program Files\PowerShell\7-preview\pwsh.exe"""
Else
  pwshQuoted = "pwsh"
End If

' WindowStyle 0 = hidden; bWaitOnReturn False = fire-and-forget so VBS exits immediately
cmd = pwshQuoted & " -NoProfile -STA -ExecutionPolicy Bypass -File """ & ps1 & """"
shell.Run cmd, 0, False
