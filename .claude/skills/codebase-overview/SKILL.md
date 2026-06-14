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
  gains-only, ↩ Restore trims only the newest (`normalizeChronicle`). **The Realm has 15 regions**
  (not 16); `realmProgress`/`pw-realm` show "/15".
- **Civilization ("Your Realm", v1.10 — IN PROGRESS)** (`engine/civilization.ts`, `balance.civilization`,
  scaffold `app/CivilizationPanel.tsx`): replacing the Realm's prominence with an explorable iso
  medieval-fantasy town that grows Camp→Empire across multiple towns (3-level zoom: world map ↔ town ↔
  feature-building). Engine is **pure-derived** — stage + town unlocks computed from `totalCompletions`,
  nothing persisted (mirrors `realm.ts`, so ↩ Restore stays exact). Design spec:
  `docs/superpowers/specs/2026-06-11-civilization-reward-layer-design.md`; guardrails in CLAUDE.md.
  Reward-world art **mockups live in `mockups/`** (self-contained offline HTML; `worldmap-mockup.html`
  is the user-APPROVED parchment map to productionize). `CivilizationPanel.tsx` is a THROWAWAY scaffold.
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
  But per-game fields ARE safe via a **static** key (`balance.arcade.games.spanrecall.litMs`) — v1.9.0
  moved per-game timing tunables there; alias them `: number` at the use site (`balance` is `as const`,
  so the raw value is a narrow literal that breaks arithmetic/`setState`).
- **The `react-hooks/exhaustive-deps` disables in the games are intentional**, not debt — the
  timer/phase effects must fire once per phase; adding the deps re-arms the timer mid-round.
- **Output-filter hook hides PASS lines.** Bash/PowerShell test output collapses to "no failures
  detected — N lines hidden". To SEE real PASS/FAIL, redirect to a temp file and `Read` it (the
  hook filters the tool *result*, not the file); `cygpath -w /tmp/x.txt` gives the path for Read.
- **Single-instance lock:** a running QuestDay (tray) makes `npm run dev`/`pw`/`dist` launches
  quit instantly. `Get-Process QuestDay,electron | Stop-Process` first; relaunch the installed app
  after. **As of v1.9.0 ALL pw drivers use an isolated `--user-data-dir`** (pw-arcade + pw-run were
  converted — they no longer stash/restore the real `db.json`), but they still need the app quit
  because they share the OS single-instance lock. Drivers launch the BUILT `out/`, so run
  `npm run build` after a source change before running them. New drivers: `pw:rewards`
  (reward + ↩Restore exactness + save-path safety), `pw:rollover` (rollover/recurrence/history).
- **Bash cwd persists between tool calls** — a prior `cd src/...` silently doubles a later relative
  path. Use absolute paths, or `git -C "$ROOT"` for git.
- **Workflow scripts:** the validator rejects the literal string `Math.random`; and
  `Date.now()`/`Math.random()`/`new Date()` are unavailable inside a workflow script (vary by
  index instead).
- **The save path DEEP-MERGES `settings`/`player` (v1.9.0 lost-update guard).** A renderer write
  must send ONLY the changed fields for those two keys (e.g. `save({ settings: { launchOnLogin: true } })`),
  NOT a stale whole-object spread — the deep-merge can't un-clobber a sibling that a stale spread
  carries (e.g. `widgetBounds`). All OTHER top-level keys still replace wholesale. `saveDatabase`
  also VALIDATES before persisting (rejects non-array `quests`/`timeFrames`, null `player`/`settings`)
  and writes to disk BEFORE advancing the in-memory cache — so don't reorder those.
- **`sandbox` stays `false` on every BrowserWindow — on purpose.** electron-vite emits the preload as
  `index.mjs` (ESM); Electron's sandbox requires a CommonJS preload, so `sandbox:true` leaves
  `window.questday` undefined (blank app). Don't flip it without converting the preload build first.
  (contextIsolation on + nodeIntegration off + the will-navigate/window-open guards are the hardening.)
- **OneDrive `npm install` no-ops the Electron binary DOWNLOAD too**, not just the extract — the cache
  ends up with ZERO zip (worse than the shipping-and-gotchas skill states). Manually download
  `https://github.com/electron/electron/releases/download/v<ver>/electron-v<ver>-win32-x64.zip`,
  `Expand-Archive` into `node_modules/electron/dist`, write `path.txt` = `electron.exe`. (electron-builder's
  own download for `npm run dist` works — `questday-release/` is outside OneDrive.)
- **Active-mode timers are GATED (v1.9.0).** The 30s scheduler tick + the 2s PowerShell foreground
  detector only run when `settings.activeModeEnabled` is on (started/stopped via `onDatabaseChanged`
  in `index.ts`) — they're no longer always-on. `nudgedFrameKeys` is pruned on day-change.
- **Focus / Matrix / Active mode are SUB-tabs under the "Forge" top-level tab (v1.8.1).** A pw driver
  reaching Focus must click `Forge` then the `.subtab` "Focus" — there is no top-level "Focus" button.
- **The Realm tab is a CORE, non-toggleable tab** (App.tsx) — it is NOT in the `enabledFeatures` toggle
  set, so it can't be hidden in Data. (The v1.10 civilization feature toggle is therefore DEFERRED until
  the tab fully becomes the civilization.) Also: **the Realm has 15 regions, not 16.**
- **Reward-world / feature MOCKUPS live in `mockups/`** — self-contained OFFLINE HTML (inline SVG + CSS,
  no deps, no network), open by double-click. They're throwaway design artifacts, not app code. The user
  is very visually driven and judges look via these before we build — `mockups/worldmap-mockup.html` is the
  APPROVED parchment world-map look (productionize that, NOT Azgaar, per the user's choice).
- **`balance.civilization` + `engine/civilization.ts` (v1.10) are PURE-DERIVED** like `realm.ts` — stage +
  town unlocks are computed from `totalCompletions(quests)`, nothing is persisted, so ↩ Restore stays exact
  with no extra claw-back code. Alias `as const` thresholds `: number` before arithmetic (same `as const`
  footgun as the arcade tunables). `app/CivilizationPanel.tsx` is a TEMPORARY scaffold (inline styles),
  replaced by the canvas town in build Step 2.
- **The Realm/Terra Questa map is now WARM STORYBOOK PARCHMENT (v1.10, 2026-06-13).** The `RealmMap` SVG in
  `app/RealmView.tsx` was re-skinned in place — parchment sea/land gradients, gold-leaf frame, `realmGrain`
  feTurbulence, sepia labels (inline `style` beats the `.realm-label` CSS), parchment-faded fog. The expedition
  CLASS HOOKS + structure are unchanged on purpose (`.realm-region`/`.realm-claimable`/`.realm-charted`/`.realm-fog`/
  `.realm-label*`), so `pw:realm` still passes — don't rename them.
- **`RealmMap` is SHARED by the Realm tab AND the Dashboard `RealmPeek` thumbnail** (both in RealmView.tsx) —
  any restyle changes both. That's intended (consistent look); just be aware.
- **Landmark icons come from `app/storybookMapIcons.tsx`** — 12 cozy CC0-style icons on a 0 0 100 100 viewBox,
  rendered as `<symbol id="sbm-*">` via **`dangerouslySetInnerHTML` on an SVG `<g>`** (works in Electron's
  Chromium for inline SVG; verified in the BUILT app, not just dev) and drawn with `<use href="#sbm-<kind>">`.
  The `Landmark` switch maps region `landmark.kind` (keep/town/tower/mountains/village/forest) → an icon name.
  These icons + the warm palette are **PLACEHOLDER free-route art (storybook look)** to be upgraded later — not final.
- **Workflow-generated SVG sometimes arrives wrapped in `<![CDATA[ … ]]>`** which silently renders as nothing in
  an HTML/JSX `<svg>` — strip `<![CDATA[`/`]]>` before embedding (the icon generator and mockup builders do this).
- **pw drivers screenshot to `pw-shots/`** (e.g. `realm-tab.png`, `realm-reread.png`) — `Read` those to visually
  verify a re-skin in the BUILT app without launching it by hand.
- **Reward-world look dev uses `mockups/` + Workflow-generated art.** Art-system research/decisions are in
  `docs/art-system-research.md` (style = Storybook Parchment, FREE CC0 for v1, art-upgrade deferred); the build
  sequence is `docs/art-system-build-plan.md`. **Licensing landmine:** paid marketplace packs (Adobe/Envato/
  GameDev Market/standard-itch) forbid end-user *extraction* → UNSAFE to bundle in the extractable NSIS installer;
  only CC0, AI-output-you-license, or work-for-hire commission are bundle-safe.
- **The APPROVED v1.10 world-map look is now `mockups/world-map-final.html` (2026-06-14)** — an "Inked Watercolor"
  antique style: light pen-ink over soft watercolor washes, a rust **mountain-ring border**, ornate red/gold compass,
  swallowtail banner labels, **8 full TOWN clusters** (each settlement is a town, not a single icon), per-region
  terrain (hills/lakes/moor+tarn/groves/marsh/rivers), Embergreen=forest + Crownspire=mountains kept, and seamless
  animations. Explored as 3 options (`world-map-antique-1/2/3.html` = full-antique / cozy-hybrid / inked-watercolor);
  the user picked #3 then asked for the towns+terrain+living-map upgrade. **Still a MOCKUP — not yet in the app**; the
  next feature is integrating this look into `RealmView.tsx`'s `RealmMap` (which is currently the warm-storybook re-skin).
- **Previewing offline mockups in Playwright (MCP):** the Playwright MCP browser BLOCKS `file://`. Serve the repo over
  http first — `node scripts/_mockserver.mjs` → `http://localhost:8777/mockups/...` — then navigate/screenshot. Heavy
  SVG filters (displacement/blur) can TIME OUT a fullPage screenshot above ~2000px wide; render at ≤1500px.
- **AI art-judge (Gemini) is NOT a reliable quality gate for hand-authored vector SVG.** `scripts/gemini-critique.mjs`
  (key in gitignored `scripts/.gemini-key.txt` or `$GEMINI_API_KEY`; retries transients + cascades models) is fine for
  an *independent opinion*, BUT: it's judge-VARIABLE (gemini-2.5-flash vs 3.5-flash score differently — PIN the model
  via `GEMINI_MODEL`), it CONFABULATES (faulted "blue auras"/"perfect-ellipse washes"/"90° scale bar" that had already
  been fixed), and it can't perceive sub-pixel ink-roughening after Gemini's image downsampling (kept calling roughened
  linework "clean vector"). Score plateaued 6.5–7.5 regardless of real improvements. **The visually-driven USER is the
  judge — don't chase a model's number.** True painterly fidelity needs the deferred raster/AI art upgrade, not more SVG.
- **Seamless loop-animation rule (no teleport):** waves/boats use `animation-direction: alternate` (ping-pong);
  travelling elements (wind streaks) fade to `opacity:0` *before* the position resets so the jump is invisible; the
  sea-creature dive loop is ONE keyframe set whose 0% == 100% (transform AND opacity), with a separate shadow animation
  on the SAME duration/easing. Always add `@media (prefers-reduced-motion: reduce){…{animation:none}}`.
- **Map assets are assembled via `scripts/assemble-map.mjs`** — it reads a Workflow run's `.output` JSON (array of
  `{name, svg}`), HTML-entity-decodes, and injects each town `<g>` into a `<!--TOWNS-->` marker in the base HTML. The 8
  town clusters were fan-out generated by parallel agents against a strict shared style spec (exact hex tokens + an
  example building) so they stay cohesive — blind multi-agent SVG only works with a tight spec + a final review pass.
