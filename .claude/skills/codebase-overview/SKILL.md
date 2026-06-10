---
name: codebase-overview
description: QuestDay architecture, key directories, engines, feature details, and naming conventions. Read this before exploring the codebase structure for the first time in a session.
---

# QuestDay codebase overview

Electron + React + TypeScript (electron-vite), Windows-first. `"type":"module"`.

## Processes & windows
- **main process** `src/main/`: windows + tray (`index.ts`), JSON store (`db/store.ts`),
  auto-backup (`backup/backup.ts`), opaque export/import (`backup/portable.ts`),
  active-mode scheduler + foreground detector (`activeMode/`), typed IPC (`ipc/`).
- **main window** `src/renderer/app/`: **7 tabs** (v1.8.1) — Dashboard (Stats folded in),
  Quests, Time frames, **Forge** (Focus / Matrix / Active mode under a sub-nav), **Realm**,
  Arcade, Data. Custom title bar shows brand + app version. Tab *ids* are kept for compat
  (the old `world` id now routes to the Realm).
- **widget** `src/renderer/widget/`: always-on-top, frameless, movable/resizable current quest.
- **friction window** `src/renderer/friction/`: always-on-top soft-friction prompt popup.

## State flow
renderer mutation → `store.saveState(patch)` IPC → atomic JSON write → broadcast
`store:changed` to all windows → every window's zustand store updates. The store is the
ONLY writer of the data file. This is why edits in one window appear live in others.

## Pure engines (`src/shared/engine/`)
- `selectCurrentQuest.ts` — §4 scoring. Time frame is the hard gate; skippability gates
  urgency (a soon-due "Nice to have" yields to a higher-priority quest due later).
- `rewards.ts` — §7 XP/currency/level/streak.
- `garden.ts` — **INERT since v1.8** (the Realm replaced it in the UI; kept running silently so
  ↩ Restore's coin claw-back math + full reversibility stay intact — see Gotchas, do NOT delete).
  Reward world: 5 themes (garden/medieval/farm/city/space), move/rearrange,
  level-based plot growth, cosmetic seasons. v1.3 harvest economy: multi-harvest crops
  (harvest pays coins, plant drops a stage and regrows — NEVER removed), positive-only
  weather mutations, seed rarities with date-seeded daily shop rotation (`dailyStock`),
  morning-dew free growth on day change, companion perks at streak milestones. Engine is
  pure: randomness passed in as params. All numbers under `garden.*` in balance.ts.
- `stats.ts` — celebration-only aggregations, now rendered **folded into the Dashboard**
  (`.dash-stats`) rather than a separate Stats tab (v1.8.1). Counts
  recurring history via `completionDates` (`completionDays`). NEVER add shame metrics.
- `rollover.ts` — daily carry-over (encouraging) + past-due detection.
- `recurrence.ts` — v1.5 recurring quests (`recurDays` weekday schedule; completed reset
  next day, full payout each completion; off-day quests "rest", dimmed).
- `activeMode.ts` — frame-ending timing.
- `eisenhower.ts` — v1.6 read-only urgent×important classifier over existing fields
  (dueAt=urgent within `balance.eisenhower.urgentWithinHours`; skippability/priority=
  important). Triage only (Do/Schedule/Minimize/Later) — never mutates quests.

## Feature details
- **Arcade** (`app/arcade/`): a **10-game brain-training set** (v1.8.3), high-score only — NO
  coins. Tickets are abundant (v1.8.4): `ticketsFreePerDay` (3) topped up each morning + 1/quest,
  soft cap `ticketsPerDay` (20). Every game has an **Easy/Medium/Hard** picker (ready phase,
  default Medium); 3 games adapt *within* a round (Flash Recall exposure / Span Recall span /
  Mental Spin angle). Game identity = `balance.arcade.games[key].icon`+`.color`, rendered via
  `app/arcade/gameIcons.tsx` (`GameIcon`/`GameBadge`/`MemoryFace`) — no emoji. Add a game = balance
  entry (with icon+color) + component in the ArcadeView registry (+ a new icon → the `ICONS` map
  in `gameIcons.tsx`).
- **Forge** (v1.8.1, `app/ProductivityView.tsx`): one tab, a sub-nav over the productivity tools
  (Focus / Matrix / Active mode + future ones); sub-tabs respect the feature toggles.
- **Focus** (`app/FocusView.tsx`, `balance.focus`): one timer engine, Pomodoro family as presets
  (Pomodoro / 52·17 / deep-work-90 / Flowtime) bound to the current quest; plus Timebox (hard-stop
  countdown from estimate × `balance.focus.timebox`). Finishing just counts now — the coin bonus
  was removed with coins (v1.8.2).
- **Realm** (v1.8, `app/RealmView.tsx`, `engine/realm.ts`, `config/chronicle.ts`): the reward
  world (replaces the garden). Each completion earns an "expedition" you spend to chart a CHOSEN
  region of Terra Questa; scouts return with a knowledge entry YOU pick (tease-then-reveal →
  re-readable Chronicle codex). Pure function of completions + `settings.realmChronicle`;
  gains-only, ↩ Restore trims only the newest (`normalizeChronicle`).
- **Matrix** (v1.6, `app/EisenhowerView.tsx`): renders `engine/eisenhower.ts`. Each quadrant
  shows a Phosphor icon in a colour-tinted badge (`.eh-badge`; icon NAME in
  `balance.eisenhower.quadrants[].icon`, mapped to component in EisenhowerView).
- **Toggleable features**: `Settings.enabledFeatures` (Record<string,boolean>, missing=on) +
  registry `app/features.ts`, switched in Data → "Productivity features"; App.tsx hides
  toggled-off tabs. Data is never deleted, only the tab hidden (tone rule).

## Conventions
- Tunable numbers → `src/shared/config/balance.ts`. Design tokens → `src/renderer/theme.css`.
- Shared types → `src/shared/types.ts`. Defaults/migration seed → `src/shared/defaults.ts`.
- Preload bridge `src/preload/index.ts` exposes `window.questday.*` (emitted as `index.mjs`).
- 2-space indent, named exports, comments explain *why* and cite spec sections (e.g. §4).
- Post-v1.7: UI chrome = Phosphor icons; emoji = content/decoration only (Twemoji webfont).

## Gotchas & landmines (non-obvious — saves re-exploration)
- **The garden "looks unused" but ISN'T.** `garden.ts` / `GardenView` / `balance.garden` are kept
  and `growOnCompletion` still runs on every completion. Deleting it would break ↩ Restore's
  coin claw-back math and the reversibility guarantee. The Realm swapped only the *views* +
  celebration line, not the engine. Leave it inert until the Realm is proven.
- **`player.currency` is a DEAD field** (coins removed v1.8.2) — earned nowhere, shown nowhere,
  but retained in saved data + types for migration safety. Don't surface it in new UI.
- **Arcade default difficulty must stay playable.** Pickers live in the READY phase, default
  **Medium**, locked once a round starts; Playwright drives the DEFAULT (never clicks the picker),
  so Medium must be immediately playable after the countdown or `pw:arcade` breaks.
- **Keep the within-round staircases.** Flash Recall (exposure), Span Recall (span), Mental Spin
  (angle) adapt mid-round; the Easy/Med/Hard mode only sets their start/ceiling — don't flatten them.
- **`balance.arcade.games[k]` is a union type.** Only fields on EVERY entry
  (`name`/`icon`/`color`/`blurb`) are accessible via a dynamic key; `seconds`/`trials` are partial.
- **The `react-hooks/exhaustive-deps` disables in the games are intentional**, not debt — the
  timer/phase effects must fire once per phase; adding the deps re-arms the timer mid-round.
- **Output-filter hook hides PASS lines.** Bash/PowerShell test output collapses to "no failures
  detected — N lines hidden". To SEE real PASS/FAIL, redirect to a temp file and `Read` it (the
  hook filters the tool *result*, not the file); `cygpath -w /tmp/x.txt` gives the path for Read.
- **Single-instance lock:** a running QuestDay (tray) makes `npm run dev`/`pw`/`dist` launches
  quit instantly. `Get-Process QuestDay,electron | Stop-Process` first; relaunch the installed app
  after. The isolated `--user-data-dir` drivers (pw-eisenhower/realm/timeboxing) still need the
  app quit because they share the OS single-instance lock.
- **Bash cwd persists between tool calls** — a prior `cd src/...` silently doubles a later relative
  path. Use absolute paths, or `git -C "$ROOT"` for git.
- **Workflow scripts:** the validator rejects the literal string `Math.random`; and
  `Date.now()`/`Math.random()`/`new Date()` are unavailable inside a workflow script (vary by
  index instead).
