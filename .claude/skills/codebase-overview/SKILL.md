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
- **main window** `src/renderer/app/`: tabs Dashboard, Quests, Time frames, Focus, Matrix,
  World, Arcade, Stats, Active mode, Data. Custom title bar shows brand + app version.
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
- `garden.ts` — reward world. 5 themes (garden/medieval/farm/city/space), move/rearrange,
  level-based plot growth, cosmetic seasons. v1.3 harvest economy: multi-harvest crops
  (harvest pays coins, plant drops a stage and regrows — NEVER removed), positive-only
  weather mutations, seed rarities with date-seeded daily shop rotation (`dailyStock`),
  morning-dew free growth on day change, companion perks at streak milestones. Engine is
  pure: randomness passed in as params. All numbers under `garden.*` in balance.ts.
- `stats.ts` — celebration-only aggregations (completions/day, total XP, by-frame). Counts
  recurring history via `completionDates` (`completionDays`). NEVER add shame metrics.
- `rollover.ts` — daily carry-over (encouraging) + past-due detection.
- `recurrence.ts` — v1.5 recurring quests (`recurDays` weekday schedule; completed reset
  next day, full payout each completion; off-day quests "rest", dimmed).
- `activeMode.ts` — frame-ending timing.
- `eisenhower.ts` — v1.6 read-only urgent×important classifier over existing fields
  (dueAt=urgent within `balance.eisenhower.urgentWithinHours`; skippability/priority=
  important). Triage only (Do/Schedule/Minimize/Later) — never mutates quests.

## Feature details
- **Arcade** (v1.4, `app/arcade/`): ticket-gated. Completions earn tickets (cap/day in
  `balance.arcade`). 14 local minigames pay a small capped coin bonus (incl. brain-training
  trio: Color Clash/Stroop, Flash Recall/UFOV, N-Back). Add a game = one balance entry +
  one component in the ArcadeView registry.
- **Focus** (v1.6, `app/FocusView.tsx`, `balance.focus`): one timer engine with the Pomodoro
  family as presets (Pomodoro / 52·17 / deep-work-90 / Flowtime) bound to the current quest;
  plus Timebox (hard-stop countdown sized from the quest estimate × `balance.focus.timebox`
  buffer). Finished session pays a small daily-capped coin bonus (`store.finishFocusSession`).
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
