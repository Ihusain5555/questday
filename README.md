# QuestDay

A desktop (Windows-first) app that guides your day by framing tasks as game-style
**quests**, always surfacing the single highest-priority "current quest" via an
always-on-top widget. Motivating, never punishing.

## Run it

```powershell
npm install
npm run dev      # live dev with hot-reload (opens the widget + main window)
```

> If Electron's binary fails to extract on `npm install` (can happen under OneDrive),
> manually extract the cached zip from `%LOCALAPPDATA%\electron\Cache\<hash>\` into
> `node_modules\electron\dist` and write `node_modules\electron\path.txt` containing
> `electron.exe`.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Compile to `out/` |
| `npm run start` | Run the built app |
| `npm run typecheck` | Type-check main + renderer |
| `npm run pw` | Drive the app with Playwright (screenshots to `pw-shots/`) |

## Architecture

- **Electron + React + TypeScript + Vite** (electron-vite). Three windows: the main
  management window, the always-on-top **widget**, and a dedicated always-on-top
  **friction** window for Active mode.
- **Local-only JSON persistence** with atomic writes + quiet auto-backups
  (`%APPDATA%\questday\`). No account, no cloud.
- Pure, testable engines in `src/shared/engine/`:
  - `selectCurrentQuest.ts` — the §4 "current quest" scoring (time frame gates;
    skippability gates urgency).
  - `rewards.ts` — §7 XP/currency/level/streak.
  - `rollover.ts` — daily carry-over + past-due detection.
  - `activeMode.ts` — frame-ending timing.

## Tuning

**All** XP/level/streak weights and the current-quest scoring weights live in one
file: [`src/shared/config/balance.ts`](src/shared/config/balance.ts). Edit there.

## Active mode (opt-in)

Off by default. Tiers, each individually configurable, never punitive:

1. **Awareness** — quiet periodic reminder of the current quest.
2. **Gentle nudge** — heads-up when a time frame is ending, or when you land on a
   flagged app/site (foreground detection via a no-admin PowerShell watcher).
3. **Soft friction** — a short "are you sure?" pause (own always-on-top window) when
   you open a flagged app/site.
4. **Hard block** — deferred to a later version (would need admin/hosts-file).

## Backup

- **Auto-backups**: written quietly to `%APPDATA%\questday\backups\` (rotated).
- **Export/Import** (Data tab): one opaque `.questday` file (gzip + AES-256-GCM),
  portable to another PC. Not human-readable — for backup/transfer, not editing.

## Not in v1

No calendar/integrations, no cloud/accounts, no playable reward world (placeholder
only), no punitive mechanics, no badges/leaderboards.
