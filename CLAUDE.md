# CLAUDE.md

QuestDay is a Windows-first **Electron + React + TypeScript** desktop app (electron-vite):
a quest-based daily productivity guide with an always-on-top widget that surfaces the single
highest-priority "current quest". Local JSON only — no accounts, no cloud.

**Tone rule (always applies):** motivating, never punishing — never add health/lives loss,
point deduction, streak-shaming, or any punitive mechanic. (One sanctioned exception:
↩ Restore reverses an accidental completion's payout exactly — correction, not punishment.)
The reward world only ever GAINS — no wilt/decay. (As of v1.8 the **Realm** replaced the garden in
the UI; the garden engine is kept INERT — it still runs silently so ↩ Restore's coin claw-back math
stays intact — so do NOT delete it.)

## Commands

```powershell
npm run dev        # live dev (widget + main window, hot-reload)
npm run build      # compile to out/
npm run typecheck  # tsc for main (node) + renderer (web) — run before considering done
npm run pw         # drive the app with Playwright, screenshots -> pw-shots/
npm run dist       # build the Windows NSIS installer -> C:\Users\ihusa\questday-release\
npm run dist:mac   # (macOS ONLY) build the free unsigned universal .dmg -> release/
```

No unit tests — **verification is driving the real app with Playwright** (per-feature drivers).
As of v1.9.0 **all** drivers use an isolated `--user-data-dir` (never touch the real `db.json`);
they launch the built `out/`, so `npm run build` after a source change first. Key ones:
`pw:rewards` (reward + ↩Restore exactness + save-path safety), `pw:rollover` (rollover/recurrence),
plus `pw:arcade`/`pw:run`/`pw:eisenhower`/`pw:realm`/`pw:timeboxing`.
→ See the **playwright-verification** skill for how to write/run drivers safely.

## macOS build (v1.10 — free, unsigned, universal)

A macOS target ships alongside the Windows NSIS build, **free and UNSIGNED** (no Apple
Developer account). Build on a Mac with `npm run dist:mac`, or in the cloud via GitHub
Actions (`.github/workflows/build-macos.yml`) → universal `.dmg` in `release/`. The repo
is now **public** at `github.com/Ihusain5555/questday` (default branch =
`feature/civilization-world-map`). Hard-won build quirks (learned 2026-06-15):
- **`build.mac.identity` MUST be `"-"` (ad-hoc), NEVER `null`** — `null` logs "skipped
  code signing" and the universal binary won't launch on Apple Silicon. Ad-hoc needs no
  cert/account and still shows the normal one-time "Open Anyway".
- **`electron-builder --mac` MUST pass `--publish never`** — else a tag-triggered build
  fails demanding `GH_TOKEN` (electron-builder's implicit publish). We ship the file via
  the workflow's `upload-artifact` step, not electron-builder publishing.
- All Mac code is **platform-gated** (`isMac` in `src/main/index.ts`; `IS_MAC` from
  `src/renderer/platform.ts` via `navigator.userAgent` — deliberately NOT a preload field,
  to leave the security surface untouched). Title bar = `hiddenInset` + CSS left-padding so
  the brand text clears the traffic lights; tray icon = template image; widget visible
  across Spaces. **Active Mode is Windows-only — hidden + never started on macOS** (tone
  rule: data kept, tab hidden).
- Unsigned ⇒ end users do a one-time "Open Anyway" (see `docs/MAC-INSTALL.md`). GitHub
  Actions **artifacts need a login to download** — to give the `.dmg` to a non-GitHub
  user, attach it to a **public Release** (direct link) or transfer the file. `workflow_dispatch`
  takes ~10 min to register on a fresh repo; a `push: tags: v*` trigger fires immediately.
- `directories.output` is relative `release/`; the Windows `dist` script overrides it back
  to `C:/Users/ihusa/questday-release` via `-c.directories.output=`. App icon is 1024px,
  regenerated crisp from the brand font via `scripts/_gen-icon.cjs` (headless Electron).
- Code-signing/notarization remains **deferred** (needs a paid Apple account).

## Architecture (map)

Three renderer windows, one main process:
- **main window** (`src/renderer/app/`) — management UI, **7 tabs** (v1.8.1): Dashboard (Stats
  folded in), Quests, Time frames, **Forge** (Focus / Matrix / Active mode sub-nav), **Realm**,
  Arcade, Data. Tabs use **Phosphor icons**. (Old tab *ids* kept for compat: `world` → Realm.)
- **widget** (`src/renderer/widget/`) — always-on-top current quest + sub-task.
- **friction window** (`src/renderer/friction/`) — soft-friction prompt popup.
- **main process** (`src/main/`) — windows + tray, JSON store, backups, active-mode scheduler,
  typed IPC. State flow: renderer → `store.saveState(patch)` IPC → atomic JSON write →
  broadcast `store:changed` → every window's zustand store updates.

Pure engines live in `src/shared/engine/` (current-quest scoring, rewards, **realm**, garden
(inert), stats, rollover, recurrence, active mode, eisenhower).
→ See the **codebase-overview** skill for the full directory + engine breakdown.

## Conventions (where things live)

- **ALL tunable numbers** → `src/shared/config/balance.ts` (XP/level/streak, scoring weights,
  garden economy under `garden.*` (inert), arcade tickets + per-game difficulty/`icon`/`color`).
  Never hardcode weights in logic. (Coins were removed in v1.8.2 — `player.currency` is a dead
  field kept only for migration; don't surface it.)
- **ALL visual design tokens** → `src/renderer/theme.css` (`@import`ed at top of `styles.css`).
  Reference `var(--brand)` etc., never raw hex. Title-bar emerald `#10362a` is duplicated in
  3 spots that must stay in sync: `--titlebar` (theme.css), `titleBarOverlay.color`
  (`src/main/index.ts`), and the `.titlebar` background.
- **App version** is injected at build time from `package.json` via Vite `define`
  (`__APP_VERSION__`). The title bar reads it — no manual version strings in the UI.
- **Shared types** → `src/shared/types.ts`. **Defaults + migration seed** → `src/shared/defaults.ts`
  (`createDefaultDatabase`); the migration in `src/main/db/store.ts` stays tolerant of
  older/missing fields (`...fresh ... ...db`).
- **Preload bridge** → `src/preload/index.ts` exposes `window.questday.*`. New IPC = add there +
  handler in `src/main/ipc/` + register in `src/main/index.ts` `whenReady`. The preload is ESM
  (`index.mjs`), so every BrowserWindow's `sandbox` MUST stay `false` — sandbox needs a CommonJS
  preload, else `window.questday` is `undefined` (blank app). (Electron is on the supported 42.x line.)
- **Persistence** is local JSON only (`%APPDATA%\questday\db.json`, atomic temp+rename + fsync) with
  rotated auto-backups. No accounts, no cloud — keep it that way. **Save semantics (v1.9.0):**
  `saveDatabase` DEEP-MERGES `settings`/`player` and VALIDATES before persisting, so a renderer write
  must send ONLY the fields it changed for those two keys (never a stale whole-object spread — it
  re-clobbers siblings). It persists to disk BEFORE advancing the in-memory cache. All OTHER top-level
  keys still replace wholesale.
- **No-network is HARD — including for Islamic features.** The local-only / no-cloud rule means any
  prayer-time / Hijri / Qibla feature MUST compute on-device with pure math (the well-known **PrayTimes**
  algorithm — no new dependency, just date/lat-lon math), NEVER an online API (IslamicFinder, Aladhan,
  etc.). An API would leak the user's location off-device every day and break the trust promise. Inputs
  (location + calculation method) are user-entered settings, not fetched. (Decision made 2026-06-17 when
  the user asked for real prayer times.)
- **Icons vs emoji (post-v1.7):** UI chrome uses Phosphor icons; emoji reserved for content/
  decoration and render via the bundled Twemoji color webfont.
- **Toggleable features:** new optional feature = one `features.ts` entry + one App.tsx tab +
  one `enabledFeatures` key (data is never deleted, only the tab hidden — tone rule).
- **Design mockups → `mockups/`** (self-contained OFFLINE HTML, inline SVG/CSS, no deps/network,
  double-click to view). The user is highly visual and can't read code — for any visual feature,
  build a mockup and get it APPROVED before coding the real thing (e.g. `mockups/worldmap-mockup.html`).
- Style: 2-space indent, named exports, Prettier-ish, comments explain *why* (cite spec §).

## Working in parallel & shipping

Multiple sessions may build different features at once — **isolate** with one worktree+branch
per feature, and claim the shared app-lock before opening the app (single-instance + one save file).
→ See the **parallel-worktrees** skill for the worktree flow.
→ See the **shipping-and-gotchas** skill for `npm run dist`, the install-it-for-the-user steps,
  and the known build gotchas (electron extract, winCodeSign, single-instance, db.json stashing).

## Civilization reward layer ("Your Realm", v1.10 — IN PROGRESS)

Replacing the Realm's *prominence* with an explorable medieval-fantasy **civilization** that grows from quest
completions (Camp→Empire) across multiple towns, navigated by 3 zoom levels (world map ↔ town ↔
feature-building). Full design: `docs/superpowers/specs/2026-06-11-civilization-reward-layer-design.md`.
Built **one feature at a time** (plan → user OK → build → test steps → user confirms → next). The user directs
by outcome and **cannot read code**, so the gates below are load-bearing, not optional.

- **Integrity line:** gains-only, never punishing (extends the tone rule) — the civilization only GAINS; a
  missed day = a cozy "resting" state, never decay/reset/loss; the Bonfire never goes out. The reward must
  **never overshadow doing tasks**: the full reward (building + celebration + XP/streak) fires on completion
  from the DEFAULT view; pan/zoom/travel/decorate are optional; the whole feature sits behind the
  `enabledFeatures` toggle (data hidden, never deleted). **↩ Restore stays EXACT** — civilization unlocks are a
  pure function of all-time completions (DERIVED, not stored); each completion stores its exact award. Do NOT
  delete the inert garden engine, `realm.ts`, or `chronicle.ts` — they are **reused** (Terra Questa becomes the
  world map; the Chronicle lives inside the Cartographer's Tower). Bundled art is **commercial-safe CC0 only**,
  recorded in a license/credits manifest; no art-export feature; no NC/SA/CraftPix/Inkarnate assets.
  **Installer-licensing rule (hard, learned 2026-06-13):** the NSIS installer ships art as EXTRACTABLE files, so any
  license forbidding end-user *extraction* (Adobe Stock, Shutterstock, Envato/GraphicRiver, GameDev Market, the standard
  itch.io paid license) is DISQUALIFIED even though it permits "commercial use" — the only bundle-safe channels are
  **CC0**, **AI output you hold a license to** (Midjourney/Scenario), or a **work-for-hire commission**.
  **Art direction DECIDED (2026-06-13):** style = *Warm Storybook Parchment*, **FREE CC0 art for v1**, with an
  AI-style-lock or hero-map commission upgrade explicitly DEFERRED (standing reminder). Menu + budget tiers:
  `docs/art-system-research.md`; build sequence: `docs/art-system-build-plan.md`. The v1.10 world map is already
  productionized as a storybook re-skin of `RealmMap` (see the **codebase-overview** skill's gotchas).
  **Look RESTYLED & APPROVED (2026-06-14):** the user explored an antique pen-and-ink cartography restyle (3 options)
  and approved the **"Inked Watercolor"** look in `mockups/world-map-final.html` — soft watercolor washes under light
  ink, a rust **mountain-ring border**, ornate compass, swallowtail banners, **every settlement is now a full TOWN**
  (8 clusters), per-region terrain, and **seamless animations** (diving sea-creatures w/ underwater shadow, drifting
  wind, lapping waves, sailing boats — none teleport). This SUPERSEDES the storybook-parchment map look but is still a
  **MOCKUP** — the next feature is integrating it into the in-app `RealmMap`. Durable lessons: (1) **an AI image model
  (Gemini flash) is NOT a reliable art-quality gate** for hand-authored vector SVG — it's judge-variable, confabulates
  fixed elements, and can't see sub-pixel roughening after downsampling; the **visually-driven user is the judge**, not
  a model score. (2) **Seamless loops = no teleport** (alternate/ping-pong, fade-before-reset, or 0%==100% keyframes).
  (3) Playwright MCP blocks `file://` — serve mockups via `scripts/_mockserver.mjs` to screenshot them.
- **Stop-and-confirm (irreversible) actions — explicit yes for the SPECIFIC action, every time, even mid-flow:**
  changing the `db.json` schema or the save deep-merge/validate logic; deleting/renaming existing engines or
  views; adding/removing npm dependencies (target is ZERO new deps); touching preload/IPC/sandbox/window
  security; `npm run dist` / building or publishing an installer; `git push` / force-push / branch deletion;
  any write to the REAL `db.json` (pw drivers use an isolated `--user-data-dir`).
- **Definition of done:** `npm run typecheck` clean (main + renderer) AND the relevant `pw:` driver passes
  against the built `out/` AND the spec's acceptance check for that task is met; visual/art tasks ALSO require
  the user to have seen it in the real app and accepted the look. Partial work is flagged explicitly — never
  reported as done.
- **Headline DECIDED (2026-06-16): hands-on TOWN EDITING is the civilization layer's centerpiece** — the user
  chose it (over "auto-grow" / "lightweight") after the **Goodgame Empire** inspiration research. GGE is the
  *skeleton* (map of settlements → enter → build) only; its PvP / troop-&-resource loss / build-timers /
  monetization are ALL DROPPED (they violate gains-only). **v1 = "Arrange your town"**: drag-move buildings +
  swap their type, dedicated Edit mode, grid-snap, all unlocked towns, reset-to-auto safety. **decorate-with-
  props = v2; shape-the-land / terraform = v3.** Spec: `docs/superpowers/specs/2026-06-16-town-editing-design.md`.
  **Durable architecture rule:** editing persists as a SEALED override layer — a NEW top-level `townLayouts` db
  key (`Record<townId,{overrides:Record<buildingIndex,{cell?,kind?}>}>`), **wholesale-replace** on save (reset =
  omit the town), and **NEVER read by `civilization.ts`/rewards** — so ↩ Restore stays exact and buildings still
  appear automatically on completion (editing is optional, never overshadows the task). The town renders as
  **derived base + sparse overrides**; untouched buildings keep their own default cell (don't reflow). Adding
  `townLayouts` is a STOP-AND-CONFIRM schema change.

## Standing guidance (efficiency)

- **Prefer CLI tools over MCP servers** when both exist (`gh`, `aws`, `gcloud`, …) — tighter
  output, and no extra tool schemas loaded into context.
- **Delegate verbose operations to subagents** — running test suites, fetching docs, scanning
  logs/backups — so only the summary returns to the main thread. Use the `log-reader` and
  `test-runner` (haiku) agents in `.claude/agents/`.
- **Build and test incrementally, one file at a time** — after each file run `npm run typecheck`
  (and the relevant `npm run pw*` driver) before moving on; don't batch many edits then compile.
- **Reading test/build output:** a PreToolUse hook collapses Bash/PowerShell test output to
  "no failures detected — N lines hidden". `exit 0` means clean, but to SEE the actual PASS/FAIL
  lines, redirect to a temp file and `Read` it (the hook filters the tool *result*, not the file;
  `cygpath -w /tmp/x.txt` gives the Windows path) — or delegate to the `test-runner` agent.

## When summarizing / compacting this conversation, KEEP:

- Exact code changes made (file paths + what changed) and any diffs not yet committed.
- Test / typecheck / Playwright output — especially failures, error messages, PASS/FAIL lines.
- The current task, the plan, and which step we're on.
- User decisions and constraints (chosen options, the tone rule, the "install it for me" request).
- Open questions awaiting the user.
DROP: resolved exploration, full file dumps already acted on, superseded approaches.

## Token-saving reminders (proactively suggest, ONE short line, at the optimal moment)

- Switching to an unrelated task → suggest `/clear` to drop stale context.
- Session getting long → suggest `/compact` to shrink it.
- After large operations → suggest checking `/context` and `/usage`.
- Unused MCP servers loaded → remind they can `/mcp` to toggle them off.
- Task difficulty ≠ active model → suggest `/model` (Sonnet default, Opus only for hard architecture).
- Simple task, no deep reasoning needed → suggest lowering `/effort`.
- Vague request → ask for specifics (e.g. "add validation to login in auth.ts") before scanning.
- Before a complex task → suggest plan mode (Shift+Tab).
- Heading the wrong way → remind they can press Esc to stop, `/rewind` to roll back.
- A task would benefit from it → ask for verification targets (test cases, expected output, screenshots).
- After recommending plugins that need confirmation → remind them to install.

## Deferred (do NOT build without explicit go-ahead)

Code-signing the installer (needs a purchased cert). No calendar/integrations, no cloud/accounts,
no badges/leaderboards (v1 non-goals).
