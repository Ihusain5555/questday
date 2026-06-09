// ---------------------------------------------------------------------------
// QuestDay — foreground-window detector (§8, approved no-admin approach).
//
// Instead of a native module, we run ONE persistent PowerShell process that
// reports the foreground app + window title every few seconds via Win32
// P/Invoke. No admin, no native build, trivially killable. Powers off-task
// nudges, the soft-friction auto-trigger, and (since tier-4 approval) the
// hard-block minimize/restore of flagged apps — still all no-admin user32.
// ---------------------------------------------------------------------------

import { spawn, type ChildProcess } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let proc: ChildProcess | null = null

// Run from a .ps1 FILE (not -Command) so the embedded C# here-string and quotes
// survive Windows command-line parsing. $pid is reserved, so we use $ppid.
const PS_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class QDFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
}
"@
while ($true) {
  $h = [QDFg]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 512
  [void][QDFg]::GetWindowText($h, $sb, 512)
  $title = $sb.ToString()
  $ppid = 0
  [void][QDFg]::GetWindowThreadProcessId($h, [ref]$ppid)
  $name = ""
  try { $name = (Get-Process -Id $ppid).ProcessName } catch {}
  [pscustomobject]@{ app = $name; title = $title } | ConvertTo-Json -Compress
  Start-Sleep -Seconds 2
}
`

export function startDetector(onForeground: (app: string, title: string) => void): void {
  if (proc) return
  let scriptPath: string
  try {
    scriptPath = join(tmpdir(), 'questday-fg-detector.ps1')
    writeFileSync(scriptPath, PS_SCRIPT, 'utf-8')
  } catch (err) {
    console.error('[questday] could not write detector script:', err)
    return
  }
  try {
    proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true }
    )
  } catch (err) {
    console.error('[questday] foreground detector failed to start:', err)
    proc = null
    return
  }

  let buf = ''
  proc.stdout?.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    let idx: number
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (!line) continue
      try {
        const o = JSON.parse(line) as { app?: string; title?: string }
        onForeground(String(o.app ?? ''), String(o.title ?? ''))
      } catch {
        /* ignore malformed lines */
      }
    }
  })
  proc.on('exit', () => {
    proc = null
  })
}

// --- Hard block (tier 4): minimize/restore a flagged app's windows ----------
// Same no-admin pattern: a one-shot PowerShell run from a .ps1 FILE (the
// embedded C# would not survive -Command parsing). ShowWindow 6 = minimize,
// 9 = restore. Restore is used when the user takes a break pass — the break
// is genuine, so we hand their window back.
const WINDOW_PS_SCRIPT = `
param([string]$name, [int]$cmd = 6)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class QDWin {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
}
"@
Get-Process -Name $name | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
  [void][QDWin]::ShowWindow($_.MainWindowHandle, $cmd)
}
`

let windowScriptPath: string | null = null

function runWindowCommand(appName: string, cmd: 6 | 9): void {
  const name = appName.trim()
  if (!name) return
  try {
    if (!windowScriptPath) {
      windowScriptPath = join(tmpdir(), 'questday-window-cmd.ps1')
      writeFileSync(windowScriptPath, WINDOW_PS_SCRIPT, 'utf-8')
    }
    spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        windowScriptPath,
        '-name',
        name,
        '-cmd',
        String(cmd)
      ],
      { windowsHide: true, detached: false }
    )
  } catch (err) {
    console.error('[questday] window command failed:', err)
  }
}

/** Minimize all main windows of `appName` (hard block). Best-effort, no admin. */
export function minimizeApp(appName: string): void {
  runWindowCommand(appName, 6)
}

/** Restore `appName`'s windows (break pass — hand the app back graciously). */
export function restoreApp(appName: string): void {
  runWindowCommand(appName, 9)
}

export function stopDetector(): void {
  if (proc) {
    try {
      proc.kill()
    } catch {
      /* best effort */
    }
    proc = null
  }
}
