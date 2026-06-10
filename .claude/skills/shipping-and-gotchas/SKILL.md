---
name: shipping-and-gotchas
description: How to build the QuestDay installer, install it for the user, and the known Windows/Electron build gotchas. Use when running npm run dist, shipping a release, or hitting a build/launch failure.
---

# Shipping a release

The user runs the INSTALLED app day-to-day. After shipping a feature (standing request,
2026-06-06): `npm run dist`, then install it for them:
1. Quit QuestDay (`Get-Process QuestDay,electron | Stop-Process`).
2. Run the new setup exe silently:
   `Start-Process "...questday-release\QuestDay Setup X.Y.Z.exe" -ArgumentList '/S' -Wait`
3. Verify the installed version, then relaunch
   `%LOCALAPPDATA%\Programs\QuestDay\QuestDay.exe`.

`npm run dist` builds the NSIS installer → `C:\Users\ihusa\questday-release\`.

# Gotchas

- **Electron binary won't extract on `npm install`** under the OneDrive path (bundled
  `extract-zip` silently no-ops). Fix: manually extract the cached zip from
  `%LOCALAPPDATA%\electron\Cache\<hash>\` into `node_modules\electron\dist` and write
  `node_modules\electron\path.txt` containing `electron.exe`.
- **electron-vite emits the preload as `index.mjs`** (project is `"type":"module"`). Main
  references `../preload/index.mjs` — keep that.
- **Foreground detector** (`src/main/activeMode/detector.ts`) runs a persistent PowerShell
  process via `-File <tempfile>.ps1` (NOT `-Command`, which mangles the embedded C# here-string).
  No native module, no admin. Killed on `before-quit`.
- **Installer build (winCodeSign)**: electron-builder's `winCodeSign` package has mac symlinks
  Windows can't extract without admin/Developer Mode. If `npm run dist` fails on it, pre-extract
  the cached `winCodeSign-*.7z` (excluding `darwin`) into
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`, then re-run.
- **Single-instance lock**: any running QuestDay (tray app, dev session, stale electron.exe)
  blocks new launches incl. `npm run pw`. Quit/kill first, relaunch the installed app when done.
