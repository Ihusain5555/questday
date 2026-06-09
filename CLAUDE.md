# CLAUDE.md

Guidance for working in this repo. QuestDay is a Windows-first **Electron + React +
TypeScript** desktop app (electron-vite): a quest-based daily productivity guide with an
always-on-top widget that always surfaces the single highest-priority "current quest".
v1.5: the full roadmap is built, plus themed reward worlds, the harvest economy, the
ticket-gated Arcade, and recurring quests (see `HANDOFF.md` for the per-version log).
Tone of the product: **motivating, never punishing** — never add health/lives loss, point
deduction, streak-shaming, or any punitive mechanic. (One sanctioned exception: ↩ Restore
reverses an accidental completion's payout exactly — correction, not punishment.)

## Commands

```powershell
npm run dev        # live dev (opens widget + main window, hot-reload)
npm run build      # compile to out/
npm run typecheck  # tsc for main (node) + renderer (web) — run before considering done
npm run pw         # drive the app with Playwright, screenshots -> pw-shots/
npm run dist       # build the NSIS installer -> C:\Users\ihusa\questday-release\
```

There are no unit tests; **verification is done by driving the real app with Playwright**
(`scripts/pw-run.mjs`, uses `playwright-core`'s `_electron`). When you add a feature,
rewrite that script to exercise it, run `npm run build` then `npm run pw`, and read the
PASS/FAIL lines + screenshots. Electron is GUI — launching opens real windows.

## Architecture

Three renderer windows, one main process:
- **main window** (`src/renderer/app/`) — management UI (tabs: Dashboard, Quests, Time
  frames, World, Arcade, Stats, Active mode, Data — labels carry emoji icons, e.g.
  "⚔️ Quests"). The 🕹️ Arcade (v1.4, `app/arcade/`) is ticket-gated: completions earn
  tickets (cap/day in `balance.arcade`), 11 local minigames pay a small capped coin
  bonus; adding a game = one balance entry + one component in the ArcadeView registry.
- **widget** (`src/renderer/widget/`) — always-on-top, frameless, movable, resizable;
  shows the current quest + immediate sub-task; expands to the full list.
- **friction window** (`src/renderer/friction/`) — dedicated always-on-top popup for the
  soft-friction prompt (so it's visible even when the main window is closed to tray).

Main process (`src/main/`): windows + tray (`index.ts`), JSON store (`db/store.ts`),
auto-backup (`backup/backup.ts`), opaque export/import (`backup/portable.ts`), active-mode
scheduler + foreground detector (`activeMode/`), typed IPC (`ipc/`).

State flows: renderer mutations -> `store.saveState(patch)` IPC -> atomic JSON write ->
**broadcast `store:changed` to all windows** -> every window's zustand store updates. This
is why edits in one window appear live in the others. Always go through the store; it's the
only writer of the data file.

### Pure, testable engines (`src/shared/engine/`)
- `selectCurrentQuest.ts` — §4 current-quest scoring. Time frame is the hard gate;
  **skippability gates urgency** (a soon-due "Nice to have" yields to a higher-priority
  quest due later).
- `rewards.ts` — §7 XP/currency/level/streak.
- `garden.ts` — reward world: plant/grow-per-completion/streak companions, plus (v1.2)
  5 selectable themes (garden/medieval/farm/city/space — each theme is its own plot,
  items carry a `theme` key, switching loses nothing), move/rearrange, level-based plot
  growth, cosmetic seasons; plus (v1.3, Grow-a-Garden-inspired) the harvest economy:
  multi-harvest crops (harvest pays coins, plant drops a stage and regrows — NEVER
  removed), positive-only weather mutations that multiply payouts, seed rarities with a
  date-seeded daily shop rotation (`dailyStock`), morning-dew free growth on day change,
  and companion perks at streak milestones. Engine stays pure: randomness is passed in
  as params. ALL content/numbers in `balance.ts` under `garden.*`.
- `stats.ts` — celebration-only progress aggregations (completions/day, total XP
  earned, by-frame). Counts recurring history via `completionDates` (`completionDays`
  helper) so daily resets never erase wins. Never add shame metrics here (no "days
  missed" etc.).
- `rollover.ts` — daily carry-over (encouraging) + past-due detection (keep/reschedule/drop).
- `recurrence.ts` — recurring quests (v1.5): `recurDays` weekday schedule; completed ones
  reset next day (full payout each completion, history kept in `completionDates` for
  stats); off-day quests "rest" (dimmed, never the current quest, never carried/nagged).
- `activeMode.ts` — frame-ending timing.

## Conventions / where things live

- **ALL tunable numbers** (XP/level/streak, current-quest scoring weights, the entire
  garden/world economy under `garden.*`, and arcade tickets/payout rates under `arcade`)
  live in ONE file: `src/shared/config/balance.ts`. Re-tune there; don't hardcode
  weights in logic.
- Shared types: `src/shared/types.ts`. Defaults + migration seed: `src/shared/defaults.ts`
  (`createDefaultDatabase`); the migration in `src/main/db/store.ts` must stay tolerant of
  older/missing fields (`...fresh ... ...db`).
- Preload bridge: `src/preload/index.ts` exposes `window.questday.*`. Add new IPC there +
  a handler in `src/main/ipc/` + register it in `src/main/index.ts` `whenReady`.
- Persistence is **local JSON only** (`%APPDATA%\questday\db.json`, atomic temp+rename) with
  rotated auto-backups in `backups/`. No accounts, no cloud — keep it that way.
- Match the existing code style: 2-space indent, no semicolons omitted oddly (Prettier-ish),
  named exports, comments that explain *why* (often citing the spec section, e.g. §4).

## Gotchas (important)

- **Electron binary won't extract on `npm install`** under this OneDrive path (the bundled
  `extract-zip` silently no-ops). Fix: manually extract the cached zip from
  `%LOCALAPPDATA%\electron\Cache\<hash>\` into `node_modules\electron\dist` and write
  `node_modules\electron\path.txt` containing `electron.exe`.
- **electron-vite emits the preload as `index.mjs`** (project is `"type":"module"`). Main
  references `../preload/index.mjs` — keep that.
- **Foreground detector** (`src/main/activeMode/detector.ts`) runs a persistent PowerShell
  process via `-File <tempfile>.ps1` (NOT `-Command`, which mangles the embedded C#
  here-string). No native module, no admin. It's killed on `before-quit`.
- **Installer build**: electron-builder's `winCodeSign` package contains mac symlinks that
  Windows can't extract without admin/Developer Mode. If `npm run dist` fails on that,
  pre-extract the cached `winCodeSign-*.7z` (excluding `darwin`) into
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`, then re-run.
- **Single-instance lock**: if ANY QuestDay is running (installed app in the tray, a dev
  session, stale electron.exe from a crashed test), new launches — including `npm run pw` —
  quit instantly with "Target page... has been closed". Quit/kill it first
  (`Get-Process QuestDay,electron | Stop-Process`), and relaunch the user's installed app
  (`%LOCALAPPDATA%\Programs\QuestDay\QuestDay.exe`) when done.
- Tests run against the real user-data dir (`%APPDATA%\questday\db.json`) and the user has
  REAL data there. `scripts/pw-run.mjs` MUST stash db.json before seeding and restore it in
  a `finally` (current script does — keep that pattern when rewriting it).
  The machine clock affects which time frame is "active" (and thus the current quest) —
  seed quests into the frame covering "now" (the script computes `activeFrame`).
- The user runs the **installed** app day-to-day: after shipping a feature, `npm run dist`
  then INSTALL IT FOR THEM (user's standing request, 2026-06-06): quit QuestDay, run the
  new setup exe silently (`Start-Process "...Setup X.Y.Z.exe" -ArgumentList '/S' -Wait`),
  verify the installed version, and relaunch
  `%LOCALAPPDATA%\Programs\QuestDay\QuestDay.exe`.

## Deferred (do NOT build without explicit go-ahead)

- Code-signing the installer (user declined for now — needs a purchased cert).
- No calendar/integrations, no cloud/accounts, no badges/leaderboards (v1 non-goals).

(Both former deferrals were approved + built 2026-06-06: hard-block tier 4 = no-admin
overlay + minimize with a timed break pass (`activeMode/scheduler.ts` + `detector.ts`);
the playable reward world = the garden (`engine/garden.ts`, `GardenView.tsx`, catalog
in `balance.ts`). Garden tone rule is structural: it only ever GAINS — no wilt/decay.)
