# QuestDay — Handoff

**Status: v1.8.0 — the garden reward-world is REPLACED by the REALM MAP + EXPEDITION CHRONICLE.
Each completed quest earns an "expedition" you spend to chart a region of YOUR choice; your scouts
then return with a piece of knowledge YOU pick (Cosmos / Nature / History / Wisdom / Surprise) —
a tease-then-reveal of one surprising, fact-checked truth, collected in a re-readable Chronicle
codex. Gains-only (a charted region/discovery is kept forever; ↩ Restore trims only the newest).
The UI-chrome emoji→Phosphor sweep is also finished. Built on v1.7.x (Premium Fantasy "Clay
Fantasy" redesign + app-wide Phosphor icons). v1.8.1 also slimmed the top nav (10 → 7 tabs:
Stats folded into the Dashboard; Focus + Matrix + Active mode combined into a **Forge** tab with
a sub-nav) and made the layout fill the window (tabs collapse to one row when wide). v1.8.2
REMOVED coins entirely (the garden shop was their only sink): XP + the Realm are the rewards now,
the PlayerBar shows arcade TICKETS in coins' old slot, the arcade is high-score-only, and focus
sessions just count. The `currency` field is kept in saved data (never earned/shown). v1.8.3
turned the **Arcade into a brain-training set**: cut the 8 pure-reflex games, kept the 6 with a
cognitive angle, and added 4 evidence-based games (🌀 Mental Spin = mental rotation/spatial, 🔀
Track Switch = task-switching, ✋ Stop Tap = go/no-go inhibition, 🪜 Span Recall = Corsi/digit
span) → 10 games, each blurb honestly naming the skill it trains (research-backed; no "gets you
smarter" overclaiming). Built + installed as `QuestDay Setup 1.8.3.exe`.**
v1.5 shipped the full roadmap, themed worlds, harvest economy, the ticket-gated arcade, and
recurring quests (all 2026-06-06); the arcade grew to 14 minigames; v1.6 (2026-06-08 →
2026-06-09) added the productivity tools (⏱️ Focus, 🧭 Matrix, 📦 Timeboxing) + feature
toggles + app-wide Twemoji emoji; v1.7 (2026-06-09) merged + shipped the redesign and
polished the Matrix. Every feature verified by driving the real app with Playwright.
Installer `QuestDay Setup 1.7.2.exe` is built and installed on the user's machine.

Last worked: 2026-06-09 (two sessions that day; the latest was a Claude Code
token-efficiency setup — NOT a product change — see the section directly below).

**State of the user's machine when this session ended (user is closing the terminal):**
- The installed app is up to date (**1.7.2**, silently installed + relaunched; it is
  RUNNING — quit it before launching the app, or use the `scripts/with-app.mjs` wrapper /
  an isolated `--user-data-dir` test which needs no quit). The title bar now shows
  "QuestDay v1.7.2".
- `main` is clean at commit `6fead22`. Worktrees: only `C:\Users\ihusa\questday-wt\redesign`
  (`feature/premium-fantasy`) remains, and it is now FULLY MERGED into `main` (kept in case
  the redesign continues; safe to remove with the junction-safe steps below). The four v1.6
  leftover worktrees (eisenhower/timeboxing/arcade/focus) were removed this session.
- **Real user data exists** in `%APPDATA%\questday\db.json` and the user is actively
  playing. Earlier data counts below are the 2026-06-06 snapshot; the v1.6/v1.7 sessions
  used isolated test data dirs and never touched the real `db.json`. The Playwright scripts
  stash/restore (or fully isolate) db.json automatically; don't wipe it.
- **Uncommitted Claude Code tooling changes are present** (HEAD = `49f1c23`, NOT committed):
  `CLAUDE.md` modified + new untracked `.claude/skills/`, `.claude/agents/`,
  `.claude/settings.json`, `scripts/cc-hooks/`. These are dev-tooling/docs only — no app code
  or product behaviour changed. Decide whether to commit them (see "Next steps" below).

## Session 2026-06-10 — Realm Map + Expedition Chronicle reward world + emoji finish (shipped v1.8.0)

Big product change + icon polish, all Playwright-verified. Commits: `468f38d` (Realm v1 + emoji
sweep), `73a693d` (Realm v2: agency + Chronicle), then remember-last-topic + v1.8.0 bump. **Built
+ installed as v1.8.0.**

- **Decision (research-backed):** the garden/harvest/mutations/themed-worlds reward system was
  the "fiddly second game to tend." Replaced with ONE gains-only "fills-in" artifact. Multi-agent
  research (6 angles + adversarial verify) recommended a *representational fantasy map* for the
  broadest, no-tutorial appeal over abstract glass/stars. User chose it after seeing four visual
  mockups (stained-glass / realm-map / mosaic / constellation — generated + screenshotted first).
- **The Realm Map + Expedition Chronicle** (`engine/realm.ts` pure; `app/RealmView.tsx`;
  `balance.realm` geometry; `config/chronicle.ts` knowledge). A fantasy realm (Terra Questa, 15
  regions). The design evolved across the session (v1 auto-reveal → v2 agency → +Chronicle):
  - **Agency:** each completed quest earns one "expedition"; the player TAPS any unexplored region
    to chart it (no fixed order). World tab → **"Realm"** (MapTrifold icon); Dashboard `RealmPeek`.
  - **Discovery:** charting opens an "expedition returns — what did you have them study?" modal
    (Cosmos / Nature / History / Wisdom / **Surprise me**; the last topic is remembered + highlighted
    for fast repeat). Tease-then-reveal of ONE surprising fact → saved to the **Chronicle** codex,
    re-readable by tapping a charted region. Research-backed (curiosity-gap, earned>given, collection).
  - **Content:** 66 fact-checked entries in `config/chronicle.ts` (built via a writing+fact-check
    workflow; `scripts/gen-chronicle.mjs` assembled the file). Original-worded = licensing-safe
    (facts aren't copyrightable; no CC-BY-SA text; PD-only quotes). The fact-check caught + fixed a myth.
  - **State:** `settings.realmChronicle` (region+topic+entry records) + `realmLastTopic`. Gains-only;
    `normalizeChronicle` trims only to mirror an exact ↩ Restore. Verified by `scripts/pw-realm.mjs`.
- **Garden kept INERT** (tone rule — no data deleted; fully reversible): GardenView/engine/
  `balance.garden` remain; `growOnCompletion` still runs silently so Restore's coin claw-back is
  unchanged. Only the *views* were swapped (App route + Dashboard peek + celebration line).
- **FLAGGED follow-up (deferred to the paused balance-tuning pass):** the garden shop was the ONLY
  coin sink. Coins still earn + show in the PlayerBar, but now have NO sink. Decide later: repurpose
  as cosmetic map unlocks (an optional, non-fiddly sink) or leave as a treasury stat.
- **Emoji→Phosphor finish** (icon convention): Focus presets in tinted badges (gold when selected)
  + Timer heading + BoundingBox Timebox; `52/17`→HourglassMedium (avoids the Time-frames tab
  clash); Data feature toggles → Timer/Compass; Arcade mute → speaker icons; Time-frames reorder
  `▲▼` → carets; arcade HUD `⏱` → Phosphor clock across 7 games. Content/decoration emoji (game
  sprites, garden, celebrations) kept (Twemoji). Icon picks research-backed + adversarially verified.
- **Verification:** new isolated `scripts/pw-realm.mjs` (`npm run pw:realm`, own --user-data-dir) —
  reveal counts (7/15 → 8/15 after a completion), the celebration region line, Dashboard peek;
  screenshots in `pw-shots/`. Bundled emoji visual check (Focus/Time-frames/Arcade/Data). `npm run
  typecheck` green throughout.
- **Balance tuning: still PAUSED** at the user's request (arcade "feels right"; coin flow, garden
  economy, mutation cadence, recurring-XP all to revisit). When resuming, also settle the coin-sink
  question above.

**Next step the user is deciding:** whether to `npm run dist` (build the NSIS installer, bump the
version, silently install + relaunch per the standing request) so the Realm Map lands in the
installed app — OR keep iterating first.

## Session 2026-06-09 (later) — Claude Code token-efficiency setup (no product change)

Goal: make this repo cheaper/faster to work on with Claude Code. No app code touched; only
CLAUDE.md, new skills/agents, and Claude Code config. All changes verified.

- **Trimmed `CLAUDE.md`** from 192 → 107 lines: kept the commands, architecture map,
  conventions, and tone rule; the detailed workflows moved out to skills (below); added three
  new sections — **compaction guidance** (what to keep when summarizing), **standing
  efficiency guidance** (prefer CLI over MCP, delegate verbose ops to subagents, build/test
  one file at a time), and **token-saving reminders** (one-line nudges: `/clear`, `/compact`,
  `/context`, `/mcp`, `/model`, `/effort`, plan mode, etc.).
- **New skills** (`.claude/skills/<name>/SKILL.md` — load only when invoked):
  `codebase-overview` (full architecture/engines/feature detail, so the structure isn't
  re-explored each session), `playwright-verification`, `parallel-worktrees`,
  `shipping-and-gotchas` (the release/install steps + Windows/Electron build gotchas that used
  to live inline in CLAUDE.md).
- **New haiku subagents** (`.claude/agents/`): `log-reader` and `test-runner` (`model: haiku`)
  for cheap verbose scanning so only summaries return to the main thread.
- **Claude Code config** (`.claude/settings.json` — `settings.local.json` permissions left
  untouched): `MAX_THINKING_TOKENS: 8000` default thinking budget; a **PreToolUse hook**
  (`scripts/cc-hooks/rewrite-test-cmd.mjs` + `filter-output.mjs`) that pipes
  test/build/typecheck/playwright output through a filter so only failure lines reach the
  model. Verified: matching commands get rewritten, non-matching are untouched, a clean run
  collapses to one line, failures are surfaced.
- **MCP recommendation (not yet actioned by the user)**: toggle off the **Google Drive** and
  **Playwright** MCP servers via `/mcp` for typical work (Electron tests use `playwright-core`
  directly, not the browser MCP); keep the **IDE** server (its `getDiagnostics` is the
  TypeScript code-intelligence path — no extra plugin needed).

**Blockers / caveats:**
- The new `.claude/settings.json` hook only loads on a **fresh Claude Code session** (hooks
  are read at startup) — it is NOT active in the session that created it.
- The PreToolUse hook spawns `node` on *every* PowerShell/Bash call (~50–100 ms no-op when the
  command doesn't match). If it ever feels laggy, narrow it with an `if` rule.
- PowerShell `2>&1` on native exes can wrap stderr oddly; tsc/npm failures print mostly to
  stdout so it's usually fine, but the more reliable token-saver is the `test-runner` agent.

## v1.7 (2026-06-09) — Premium Fantasy redesign SHIPPED + Matrix icons + version in title bar

Session resumed after a terminal was closed mid-work. Goal: reconcile outstanding branches
and ship the visual layer. All three sub-versions built + silently installed + relaunched.

- **Branch reconciliation**: five feature branches existed in worktrees. FOUR
  (`arcade-brain-games`, `eisenhower`, `focus-timer`, `timeboxing`) were ALREADY fully
  merged into `main` (0 unique commits — nothing lost when the terminal closed); their
  worktrees + branches were removed (junction-safe: `cmd /c rmdir "<wt>\node_modules"` FIRST
  to drop the link, then `git worktree remove` + `git branch -D`). The fifth,
  `feature/premium-fantasy` (the redesign), had 1 unmerged commit that conflicted.
- **Premium Fantasy redesign merged + shipped (v1.7.0)**: the "Clay Fantasy" look (dark,
  emerald + gold, claymorphism — look-spec in `design-system/MASTER.md`).
  Its commit moved ALL design tokens (colours/fonts/shape/depth/motion) out of
  `styles.css :root` into a dedicated **`theme.css`** — the single source of truth for the
  look, `@import`ed at the top of `styles.css` — with RGB-channel token variants
  (`--brand-rgb` etc., for `rgb(var(--x-rgb) / alpha)` tints), a deep-emerald **custom title
  bar** (`.titlebar`/`.titlebar-brand` in `App.tsx`; colour `#10362a` MUST stay in sync
  across three places: `--titlebar` in theme.css, `titleBarOverlay.color` in
  `src/main/index.ts`, and that token), the default app menu removed, slim on-brand
  scrollbars, and isolated pw test data dirs. **Conflict note**: styles.css conflicted
  because the branch predated the v1.6 Twemoji emoji feature — resolution kept BOTH (the
  `@font-face` stays in styles.css; `'Twemoji'` was added to the theme.css `--font-*` stacks
  so emoji still fall through). App.tsx auto-merged (kept the new title bar AND the Matrix tab).
- **Matrix icon rework (v1.7.1)**: the 🧭 Eisenhower view was the ONE screen the redesign's
  emoji→Phosphor sweep had missed. Swapped its emoji (🧭🔥📅⚡🌙✨) for crisp **Phosphor
  icons** — Compass title; Fire / Calendar / Lightning / Moon quadrants — each set in a small
  badge tinted with the quadrant colour (`.eh-badge`, `color-mix(in srgb, var(--quad) 18%,
  transparent)`; `--quad` passed inline per quadrant). Icon NAMES live in
  `balance.eisenhower.quadrants` (`icon:` field, replacing the old `emoji:`); `EisenhowerView`
  maps name→component via `QUAD_ICON`. 11/11 `pw:eisenhower` checks still PASS; screenshot
  confirms the look.
- **App version in the title bar (v1.7.2)**: `package.json` version is baked into the renderer
  at build time via a Vite `define` (`__APP_VERSION__`, added to the renderer config in
  `electron.vite.config.ts` — single source of truth, no IPC; the global is declared in
  `src/renderer/env.d.ts` inside `declare global`). Rendered as a small muted "vX.Y.Z" beside
  the brand (`.titlebar-version`). Tracks every future release automatically — no manual edits.
- **Process note (tone/working-style)**: the redesign was flagged to the user as possibly
  unfinished before merging; the user chose to ship it. Big visual/architectural calls were
  presented as plain-English options with pros/cons and the user chose; small calls (icon
  picks, version-bump numbers) were made directly. Each ship asked first or followed an
  explicit "ship it".

## v1.6 (2026-06-08 → 2026-06-09) — ⏱️ Focus, 🧭 Matrix, 📦 Timeboxing, toggles, emoji

User asked for productivity features (time blocking, Pomodoro, Eisenhower). Researched the
method families first, then built three research-backed tools, each in its OWN git worktree
(parallel-safe alongside the arcade/redesign terminals), merged to `main`, and installed.

- **⏱️ Focus timer** (`app/FocusView.tsx`, `balance.focus`): ONE timer engine, the whole
  Pomodoro family as selectable presets (Pomodoro 25/5, 52·17, Deep-work 90, Flowtime).
  Binds to the current quest. Runs in transient renderer state (no store write per tick);
  only the chosen preset + a daily earn-cap persist. A finished session pays a small
  daily-capped coin bonus (`store.finishFocusSession`, mirrors the arcade cap). Non-punitive:
  abandoning costs nothing, breaks are first-class, Flowtime never interrupts.
- **📦 Timeboxing** (slice C, inside FocusView): "📦 Timebox · Nm" button sizes a hard-stop
  countdown from the current quest's `timeEstimateMinutes` × `balance.focus.timebox`
  buffer (1.5, a planning-fallacy correction). Chosen over rigid "Do At" clock-pinning,
  which the research flags as the #1 source of over-scheduling guilt and which clashes with
  QuestDay's single-current-quest model + never-punishing tone.
- **🧭 Eisenhower matrix** (`app/EisenhowerView.tsx`, `engine/eisenhower.ts`,
  `balance.eisenhower`): read-only urgent×important 2×2 over EXISTING fields (dueAt=urgent,
  skippability/priority=important). Quadrants Do / Schedule / Minimize / Later (low/low is
  "Later", never "Delete"). Current quest is starred. No new data model.
- **Feature toggles**: `Settings.enabledFeatures` (Record<string,boolean>, missing=on;
  mirrors `activeModeTiers`), registry `app/features.ts`, switched in Data → "Productivity
  features"; `App.tsx` hides toggled-off tabs. New optional feature = one registry entry +
  one App.tsx tab + one key. Off only HIDES the tab — data is kept (tone rule).
- **High-quality emoji (Twemoji)**: bundled `src/renderer/assets/fonts/Twemoji.woff2` (COLR
  color webfont, ~466KB, offline) + added `'Twemoji'` after the text fonts in
  `--font-body`/`--font-display` (`styles.css`) so every emoji (garden, worlds, arcade,
  weather, labels, widget) renders crisp + consistent instead of Windows' default; letters/
  numbers stay Satoshi/Clash. Couldn't use MS Fluent (no single color font + can't npm
  install); Twemoji is the clean web-standard alternative. Per-quadrant / per-preset emoji
  were briefly removed then restored as high-quality; the Pomodoro tomato 🍅 → ⏲️ timer for
  theme fit.
- **Verification**: per-feature isolated Playwright drivers `pw:eisenhower` (11/11) +
  `pw:timeboxing` (6/6), each launching with its OWN `--user-data-dir` temp folder (never
  touches the real db.json, own single-instance lock — safe to run anytime). Emoji confirmed
  by screenshotting arcade/garden/focus/matrix and visually checking the glyphs.
- **Shipped**: v1.6.0 (3 tools + toggles) → 1.6.1 (matrix emoji cleanup) → 1.6.2 (focus
  emoji cleanup) → 1.6.3 (Twemoji font) → 1.6.4 (icons restored, high-quality + theme-fit).
  Each built + silently installed.
- **Leftover worktrees** — RESOLVED in v1.7: these (eisenhower, timeboxing, + arcade, focus)
  were fully merged and have been REMOVED. The junction-safe removal recipe still applies to
  the one remaining redesign worktree (their `node_modules` is a JUNCTION to the shared one —
  never recursively delete it): `cmd /c rmdir "<worktree>\node_modules"` first (drops the
  link, not the target), THEN `git worktree remove <worktree>` and `git branch -d <branch>`.

## v1.4 (2026-06-06) — 🕹️ The Arcade

User asked for minigames (aim training + "simple classics" + a top-10 mobile list).
Built ticket-gated so it stays an EARNED reward, not a distraction engine:
- **Tickets**: each quest completion earns 1 🎟️ (cap 3/day, `balance.arcade`); tickets
  never expire; celebration shows "+1 arcade ticket". Spend 1 to play a round.
- **Coin bonus, capped**: coins = min(max 15, floor(score × per-game rate)) — a chest on
  top of completions, never a farm (tickets only come from real quests).
- **11 games** (`src/renderer/app/arcade/`, registry in `ArcadeView.tsx` — adding one =
  a balance entry + a component): 🎯 Aim Trainer, ⚡ Reaction Time, 🧠 Memory Match,
  🐍 Snake, 🧱 Block Drop (tetris-like), 🫧 Bubble Pop (bubble shooter), plus mobile-
  classic-inspired originals: 🏃 Lane Dash (Subway-Surfers-like), 🔺 Spike Rush
  (Geometry-Dash-like), 🍉 Fruit Slice (Fruit-Ninja-like), 🐔 Road Hopper (Crossy-Road/
  Frogger-like), 👾 Maze Muncher (Pac-Man-like). All local/offline, original names/art.
  SKIPPED from the user's list: Brawl Stars + Snake Clash (multiplayer/leaderboards
  conflict with no-cloud rule), Badland (physics scope).
- **Non-punitive throughout**: "End round" always cashes out; a crash/bomb/ghost just
  ends the round with the score kept; bests only ever celebrate; empty-ticket state
  encourages the next quest. rewards.ts `newPlayer` now spreads `...player` so new
  player fields survive completions.
- 18 Playwright checks PASS (incl. real Aim Trainer round: 5 clicked targets → +2 🪙).

## v1.5 (2026-06-06) — ↻ Recurring quests

User asked for daily/recurring quests. Self-resetting design (no template spawning):
- **`Quest.recurDays?: number[]`** (0=Sun..6=Sat). Form has "Repeats ↻": Never / Daily /
  Weekdays / Weekends / Custom day toggles (`QuestForm.tsx`).
- **Completing pays in full every time** (XP/coins/growth/ticket) and logs the day into
  **`completionDates`** — Stats counts that history (`stats.ts completionDays/
  totalCompletions`), so the reset never erases wins.
- **Daily reset**: rollover (`computeDayChange.recurringReady` + `runDayChange`) flips a
  previously-completed recurring quest back to active with sub-tasks unchecked.
- **Rest days**: on weekdays not in `recurDays` the quest "rests" — dimmed row with
  badge, excluded from `rankCandidates` (engine/recurrence.ts `isResting`), so it's
  never the widget's current quest. Recurring quests are excluded from carry-over
  counts and past-due review (they renew; they never nag).
- **Done-today visibility**: a recurring quest completed today stays listed ("✓ ·
  back next day") even with Show-completed off — a daily never just vanishes.
- ↩ Restore on a recurring completion reverses payout AND removes today's history entry.
- 22 Playwright checks PASS (reset, resting gate beats a Critical resting quest,
  stats history).

**Plan of record (user's decision, 2026-06-06): live with v1.5 for a few days, then tune.**
All the new economies are FIRST-DRAFT — when the user returns, start by asking how it all
felt and tune `balance.ts` accordingly. Specific things to probe:
- Coin flow: harvests (5/6/9/12/20/24/70/170 per pick) + quest coins — too rich/too poor?
  At close the user already held 1,230 coins at level 9 — inflation watch: are mythics
  (300🪙, lv 12) still aspirational, or should harvest values/costs be rebalanced?
- Mutation cadence: base 18% + 1%/streak-day (cap +10%) + 5% companion perk — does a
  jackpot land often enough to delight but stay special? Is 🌈 ×25 too common/rare (w 2)?
- Morning dew + daily rare stock: do they create a pleasant morning check-in?
- One completion grows ONE item — with many seedlings planted, does progress feel
  spread too thin? (Possible lever: gear/sprinkler idea below, or grow-2 at high level.)
- Arcade: are payout rates fair (max 15 🪙/round)? Is 3 tickets/day the right cap? Which
  games get played; any worth dropping/adding from the future-ideas list?
- Recurring quests: does daily XP-farming via easy dailies inflate levels too fast?
  (Lever: dailies are user-authored — if it's a problem, consider diminishing XP for the
  same recurring quest within a week. Discuss first; could read as punitive.)

## v1.3 (2026-06-06) — the harvest economy ("Grow a Garden"-inspired)

User asked to make the world like Roblox's *Grow a Garden* (researched: harvest/sell loop,
stacking weather mutations, seed rarities, rotating shop, pets, idle growth). Adapted to
QuestDay's effort-driven, never-punitive frame; all 14 Playwright checks PASS:
- **Harvest economy**: ripe crops are picked for coins via the **inspect panel** (click a
  placed item → Harvest / Move / ✕). ALL crops are multi-harvest: picking pays out,
  consumes mutations, drops the plant back ONE stage to regrow. Nothing is ever removed.
- **Mutations (positive-only)**: each growth event can roll one (💧×2 🍃×3 ❄️×3 🌞×4 ✨×8
  ⚡×12 🌈×25), gated by **daily weather** (date-seeded per season: ☀️🍃🌧️⛈️❄️). Chance
  rises with streak. Badges + golden glow on tiles; jackpot line in the celebration.
- **Seed rarities** Common→Mythic (colors in shop) + 2 new high-tier species per theme
  (Hibiscus/Lotus, Citadel/Dragon roost, Watermelon/Golden pineapple, Sky tower/Skyline
  block, Nebula garden/Ring station; 120/300 coins, unlock lv 8/12).
- **Daily shop rotation**: common/uncommon always stocked; 3 of the rare+ rotate in per
  day (date-seeded `dailyStock`); out-of-stock cards grey with "check tomorrow". Nothing
  is permanently missable.
- **Morning dew**: each new day, 1 plant grows free in the active world (piggybacks on
  the rollover day-change; skipped on first run; banner in World tab). It can mutate too.
- **Companion perks**: streak companions now help — 3d: +5% mutation chance; 7d: +10%
  harvest; 14d: dew grows 2; 30d: 10% double harvest. Perks card lists them.
- **Celebration upgrade**: completion popup now says what grew (closes the old "what
  grew" idea) and announces mutations.
- All numbers in `balance.ts` (`garden.mutations/weather/rarities/harvest/shop/dew`).
  Engine additions in `engine/garden.ts` are pure — randomness is passed in.
- **1.3.1 wording fix**: user deleted all completed quests and thought things were still
  "growing" — they weren't (verified: every item stage 0). The "(N growing now)" tagline
  read as active growth; now says "waiting on your next completions — nothing grows on
  its own except the daily morning dew". Note: deleting completed quests is allowed and
  never touches garden/XP/coins (only ↩ Restore reverses; deleting also removes the
  quest from Stats and forfeits its Restore option).

## v1.2 (2026-06-06, later session) — themed worlds + garden depth

All Playwright-verified (`scripts/pw-run.mjs`, 14 PASS):
- **5 selectable world themes** (World tab pills): 🌱 Garden, 🏰 Medieval kingdom,
  🌾 Farmstead, 🏙️ Modern city, 🚀 Space outpost — pick the game style you like. All
  content (catalogs, visitor milestones, plot upgrades, seasons) in `balance.ts` under
  `garden.themes`. Each theme has its own ground tint (`ground-*` CSS).
- **Each theme is its own plot** — `GardenItem.theme` tags every placed item; switching is
  free and loses nothing (other worlds just pause). Coins are shared. Completions grow the
  ACTIVE world only.
- **Companions (visitors) derive from `bestStreak`** — same thresholds (3/7/14/30) in every
  theme, so a milestone earned once shows its themed companion in all worlds. The stored
  `visitors` array is now a legacy/celebration log only.
- **Move/rearrange**: click a placed item to lift it, click a free tile to set it down
  (`moveItem` engine fn + `moveGardenItem` store action). Free, purely positional.
- **Plot grows with level** (`plotUpgrades`: 7×4@5, 7×5@8, 8×5@12, 9×6@16, 10×6@20) and
  `plotSize()` never shrinks below what fits placed items (↩ Restore level rollback safe).
- **Seasons** — cosmetic only: date-based badge + tile tint (`seasonFor`, `season-*` CSS).
- **Migration**: pre-theme dbs get `garden.theme='garden'` and items tagged
  `theme:'garden'` (in `migrate()`, also covers Import). Restore's refund-first claw-back
  scans newest-first across ALL themes.
- **1.2.1 clarity pass** (user thought growables-vs-decorations was "backwards" — a
  cottage shows 🪵 while a crown is instant 👑): under-construction tiles wear a stage
  pip ("1/3"), shop cards show each growable's full path (🪵→🛖→🏠) vs "✨ ready now"
  for decorations, and the shop helper text explains the distinction. Mechanic unchanged.
- **Standing user request**: after every `npm run dist`, silently install the new build
  (`Setup.exe /S`) and relaunch the installed app — don't just remind (see CLAUDE.md).

---

## What it is

A Windows desktop app that frames your tasks as game-style **quests** and always surfaces
the single highest-priority "current quest" via a small always-on-top widget. Motivating,
never punishing. Single local user, no account, no cloud.

## How to run / install

- **Use it (installed):** run the installer at
  `C:\Users\ihusa\questday-release\QuestDay Setup 1.1.0.exe`. It's **unsigned**, so Windows
  SmartScreen warns → **More info → Run anyway**. Creates Desktop + Start-menu shortcuts.
  Launch "QuestDay" from the Start menu. (An older 1.0.0 setup file sits alongside it.)
- **Develop:** `npm install` then `npm run dev`. (If Electron's binary fails to extract,
  see the gotcha in `CLAUDE.md`.)
- **Rebuild installer:** `npm run dist` → output in `C:\Users\ihusa\questday-release\`.
- Data lives in `%APPDATA%\questday\` (db.json + rotated auto-backups). Contains real data.
- **Before `npm run pw` or `npm run dev`:** quit any running QuestDay (tray → Quit, or
  `Get-Process QuestDay | Stop-Process`) — the single-instance lock makes new launches
  quit instantly otherwise. Relaunch the installed app for the user afterwards.

## Build phases (all complete)

0. Scaffold — Electron/React/TS, 3 windows, tray, JSON persistence + auto-backup, engines.
1. Quest CRUD + time-frame editing + management UI.
2. §4 current-quest engine wired into a live widget (cross-window sync, expand/collapse).
3. Completion animation + §7 XP/currency/levels/streak + reward-world placeholder.
4. Daily rollover (encouraging carry-over) + past-due relevance prompt (keep/reschedule/drop).
5. Active mode tiers 1–3 (awareness / nudge / soft friction) + no-admin foreground detection.
6. Opaque Export/Import backup + final acceptance pass.

Plus, after the phases: friction-prompt visibility fix + reliable re-trigger; **drag quests
between time frames**; the installer. Then (2026-06-06, all Playwright-verified):
- **Start with Windows** toggle (Data tab) — login item registers `--hidden`, which opens
  just the widget + tray (main window stays out of the way). Synced on import too.
- **Enter in a sub-task row** inserts a new row below and focuses it (fast brain-dump).
- **Defer ("↷") the current sub-task in the widget** — session-only, no penalty; deferred
  steps resurface once the steps ahead are done (cycles, never a dead end).
- **Hours + minutes estimate** in the quest form (stored as `timeEstimateMinutes`), plus an
  optional per-sub-task minutes estimate (shown next to the step in the widget).
- **Within-frame drag reordering** — dropping a quest onto another quest inserts it before
  that quest (frames still take loose drops = append at end).
- **Hard block (tier 4) — now BUILT** (approved: no-admin overlay + minimize). Flagged
  apps are minimized behind an always-on-top block screen with a guilt-free timed
  **break pass** (default 5 min, configurable; the pass restores the user's app — a real
  break, not a trick). Re-triggers on every landing; never requires admin.
- **"Show completed quests 🏆" toggle** in the Quests tab (next to "Show dropped") —
  a trophy log: completed quests appear under their frames with a dated ✓ badge,
  newest win first, after active quests. Each completed row has **↩ Restore**
  (mis-click insurance): back to active with sub-tasks unchecked, and the
  completion's payout is reversed EXACTLY (the award is stored on the quest at
  completion): XP comes back out with level rollback; coins come back out with
  refund-first — if already spent in the World, newest garden purchases are
  refunded (item removed, cost returned) until the balance covers the claw-back,
  so deserved coins are never touched and balance never goes negative. Old
  completions without a stored award take back nothing.
- Time estimates render as hours+minutes everywhere (`formatMinutes`: 3630 →
  "60h 30m"), incl. quest rows, widget list, and per-step hints.
- **"Start fresh" data reset** (Data tab danger-zone card): type-RESET-to-confirm
  modal → an IMMEDIATE backup of the old data is written to `backups/` first
  (`writeImmediateBackup`, not debounced) → db replaced with defaults. Even a
  reset is recoverable via Import/backups.
- **📊 Stats tab** (`engine/stats.ts` + `StatsView.tsx`): totals (completed, total
  XP earned, last-7-days, streak/best), a 14-day completions bar chart, and
  all-time completions by time frame. Celebration-only — no shame metrics.
- **Gaming-look theme pass** (`components/PlayerBar.tsx`): gold level star (level
  number inside) with the XP bar growing out of it, shown as current/needed
  (e.g. 40/200 XP) — full-size on the Dashboard, slim strip in the widget. 🪙 on all
  currency, ⚡🪙 bounty tags on quest rows + current-quest card, icon tabs (⚔️🌱💾…).
- **The reward world — now BUILT: the Garden** (World tab + live Dashboard peek).
  Coins buy seeds/decorations (species unlock by level, catalog in `balance.ts`);
  each completion grows one plant a stage (least-grown, oldest first); NEW best-streak
  milestones bring permanent visitors (🦋 3d, 🐦 7d, 🐿️ 14d, 🦔 30d). Structurally
  non-punitive: the garden only ever gains. Engine: `src/shared/engine/garden.ts`.
- Version bumped to **1.1.0**, then **1.2.0** with the themed-worlds pass (installer is
  now `QuestDay Setup 1.2.0.exe`).

## Acceptance criteria — all PASS

1. Create quests w/ sub-tasks, priority, skippability, difficulty, estimate, due, time-frame ✅
2. Define/edit time frames; app knows the active frame ✅
3. Widget shows the correct single current quest + immediate sub-task (§4); expands to full list ✅
4. Completion plays animation + awards §7 XP/currency; levels & streaks update ✅
5. Unfinished quests roll over with encouragement; past-due ones prompt relevance ✅
6. Passive by default; Active mode tiers toggle/configure ✅
7. Auto-backup; manual Export → Import restores (portable across PCs) ✅
8. Widget always-on-top, movable, resizable; working tray icon ✅
9. XP/level/streak weights in one editable config (`src/shared/config/balance.ts`) ✅

## Active mode (opt-in, off by default)

- **Awareness** — periodic quiet reminder of the current quest (OS notification + widget toast).
- **Gentle nudge** — heads-up when a time frame is ending, or when you land on a flagged app/site.
- **Soft friction** — short "are you sure?" pause (its own always-on-top window) on opening a
  flagged app/site. Configurable, snoozeable, never blocks.
- **Hard block** — flagged apps get minimized behind a block screen; escapable via a
  timed break pass. Firm, never punitive.
- **Foreground detection** = a no-admin persistent PowerShell watcher (no native module);
  minimize/restore for hard block uses one-shot PowerShell `ShowWindow` calls (also no admin).

## Backup format

- Auto-backups: rotated JSON snapshots in `%APPDATA%\questday\backups\`.
- Export/Import (Data tab): one opaque `.questday` file = gzip + AES-256-GCM (not
  human-readable; for backup/transfer, not editing). Verified round-trip restore.

## Known limitations / open items

- Installer is **unsigned** (SmartScreen warning). Signing needs a purchased cert.
- Domain/site matching for Active mode is **best-effort via window title** (true per-tab URLs
  would need a browser extension). App-name matching is reliable. For hard block this means
  flagging a site minimizes the whole browser window when its title matches.

## Suggested next steps (none required)

**For the Claude Code tooling session (2026-06-09 later):**
1. **Decide whether to commit the tooling changes.** They're docs/dev-tooling only (no app
   code): `git add CLAUDE.md .claude scripts/cc-hooks; git commit`. Skip if you'd rather keep
   them local-only.
2. **Start a fresh Claude Code session** so the new `.claude/settings.json` hook loads (hooks
   are read at startup), and toggle off the **Google Drive** + **Playwright** MCP servers via
   `/mcp` for typical work.
3. **(Optional)** On the next real `npm run typecheck`/`build`, confirm the output filter
   behaves as intended; if the per-command hook adds noticeable latency, narrow it with an
   `if` rule.

**For the product (unchanged from before):**

Everything on the original roadmap is built. **First: the balance-tuning pass above.**
Then, ideas if appetite returns (rough priority from the 2026-06-06 session):
- ~~Garden depth: move/rearrange, bigger plot, seasons~~ — built in v1.2, plus themes.
- ~~Celebration copy that mentions what grew~~ — built in v1.3 (with mutation jackpots).
- Gear & helpers (more Grow-a-Garden depth): placeable ⛲ sprinkler = completions grow an
  extra plant in radius; a placeable pet that occasionally auto-rolls a mutation.
- Widget world peek: a tiny "🧺 2 ripe" counter on the always-on-top widget.
- Harvest history in Stats: total coins harvested, best single harvest, rarest mutation
  found (celebration-only — no shame metrics).
- Event weather: rare special days (🌠 meteor shower = mutation chance ×2), date-seeded.
- Code-signing the installer (declined for now — needs a purchased cert).

## Map of the code

See `CLAUDE.md` for the architecture map, conventions, and the tunable-config location.
As of the 2026-06-09 token-efficiency pass, the deep detail now lives in **skills** that load
on demand: the full architecture/engines/feature breakdown in the **codebase-overview** skill,
and the environment gotchas (Electron install under OneDrive, preload `.mjs`, the PowerShell
`-File` detector, the electron-builder `winCodeSign` symlink workaround) in the
**shipping-and-gotchas** skill (`.claude/skills/`).
