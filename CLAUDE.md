# CLAUDE.md

QuestDay is a Windows-first **Electron + React + TypeScript** desktop app (electron-vite):
a quest-based daily productivity guide with an always-on-top widget that surfaces the single
highest-priority "current quest". Local JSON only — no accounts, no cloud.

**Tone rule (always applies):** motivating, never punishing — never add health/lives loss,
point deduction, streak-shaming, or any punitive mechanic. (One sanctioned exception:
↩ Restore reverses an accidental completion's payout exactly — correction, not punishment.)
**Arcade carve-out (DECIDED 2026-06-29):** minigames MAY deduct points **within the round's score** on a wrong action,
with **red** (penalty) / **green-or-gold** (gain) flash feedback — `AimTrainer.tsx`'s "misses are never punished" is **no
longer absolute for the arcade**. **HARD boundary:** in-game arcade score ONLY — the **productivity reward world stays
strictly gains-only** (quest XP, levels, streaks, arcade *tickets*, and ↩Restore exactness are NEVER deducted). Spec +
per-game targets: `docs/arcade-and-ui-feedback-2026-06-29.md`.
The reward world only ever GAINS — no wilt/decay. (As of v1.8 the **Realm** replaced the garden in
the UI; the garden engine is kept INERT — it still runs silently so ↩ Restore's coin claw-back math
stays intact — so do NOT delete it.)

## Strategic direction (v2 — DECIDED 2026-06-28; supersedes the civilization headline below)

After a red-team pre-mortem + a full options framework, QuestDay was **repositioned**:
**"the private, calm DESKTOP deep-work companion that structures focused work around the five daily prayers."**
The **Muslim-productivity layer is now the CORE differentiator** — but keep ALL existing generic productivity
features (additive, not narrowing). Decisions that change what gets built:
- **Civilization / Realm reward layer → PARKED behind "Coming Soon"** (the v1.10 "town editing is the centerpiece"
  framing below is SUPERSEDED). Retention rides on the faith layer + arcade + core, NOT realm growth.
- **Arcade → keep + add OPTIONAL depth modes** (every game keeps its simple default + an advanced/polished mode; never remove simple).
- **Faith build order (faith first, one feature at a time):** prayer-aware time-frame TOGGLE → Hijri date + Islamic
  observance calendar w/ notifications (Quran + Sahih Sunnah grounded; **NEVER suggest fasting on forbidden days** —
  two Eids / days of Tashreeq) → Quest Bundles → End-of-day Wind-Down. Plus local export/import + restore.
  - **DONE 2026-06-28 (batch session): all of the above SHIPPED + verified + committed + pushed.** Prayer-aware frames
    (`engine/prayerFrames.ts` + `TimeFrame.prayerAnchor`), Hijri/observance calendar + main-process notifications
    (`engine/observances.ts` + `CalendarView` tab + `observance/notify.ts`; the **forbidden-fast guardrail is enforced
    in code** and grounded in the durable `docs/islamic-observances-reference.md`), Quest Bundles (`questBundles` key +
    panel), end-of-day wind-down (`EndOfDayCard` wins-recap + push-to-tomorrow). Export/import+restore and arcade depth
    modes were found **already built** (stale-docs — see Standing guidance). Per-feature commits `5ea264f`→`a7c3dce`;
    new drivers `pw:prayer-frames`/`pw:observances`/`pw:bundles`/`pw:winddown`. Architecture details + the load-bearing
    gotchas (the `effectiveTimeFrames` pre-step; the never-soften guardrail) are in the **codebase-overview skill**.
- **Constraints:** local-only ABSOLUTE (add export/import + restore; no cloud); gains-only KEPT (stakes via
  prayer-consistency/identity, never punishment); zero-dep default + vetted exceptions; installer UNSIGNED for now
  (revisit Microsoft Store ~$19 before distributing). **Monetization = FREE forever (sadaqah).**
- **Cut:** Qibla (no desktop compass), Realm mystery reveal, arcade unlock tiers, live-friends server.
- **Distribution:** the **Vercel landing page** is BUILT + DEPLOYED — `website/` (Next.js 14 App Router, faithful
  port of `mockups/website-mockup.html`), live at `https://questday-ihusain5556.vercel.app` (Vercel project renamed
  `website`→`questday` 2026-06-29; the old `website-virid-six-…` URL still aliases). Deploy from here via
  `cd website ; npx vercel --prod --yes` (CLI already authed). **Download buttons now resolve** — **v2.0.0 is released
  with BOTH installers** (Win `.exe` + Mac universal `.dmg`, marked Latest); release procedure + the version-drift trap
  → memory `questday-release-procedure`. Deploy/Vercel quirks → shipping-and-gotchas skill.
- Full decision record: memory `questday-pivot-muslim-productivity`; resume kit: `HANDOFF.md`.

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
  - **XP is DERIVED from `timeEstimateMinutes`** (`rewards.ts`: base XP ≈ `round(timeEst/5) × difficultyMult`).
    A quest's time estimate is NOT a free "gentleness" knob — lowering it lowers the XP earned. When seeding
    quests programmatically, pick the time estimate to hit the intended XP (e.g. 10 min Easy → 2 XP). Learned
    v1.12 (seeding prayers at 5 min silently halved the locked 2 XP; the multi-agent audit caught it, not tsc).
- **ALL visual design tokens** → `src/renderer/theme.css` (`@import`ed at top of `styles.css`).
  Reference `var(--brand)` etc., never raw hex. Title-bar emerald `#10362a` is duplicated in
  3 spots that must stay in sync: `--titlebar` (theme.css), `titleBarOverlay.color`
  (`src/main/index.ts`), and the `.titlebar` background.
- **Theming (v1.14): two axes on `<html>` — `data-theme` (dusk/daylight) + `data-accent` (emerald/
  amethyst/sky/gold).** `:root` = Dusk default; `[data-theme="daylight"]` overrides surfaces; `[data-accent]`
  overrides `--brand*`. Ink on brand fills = **`var(--on-brand)`** (never hardcode `#06231a`). Applied by
  `src/renderer/theme.ts` from **localStorage** (no schema change) at the top of every renderer entry before
  `createRoot` (CSP blocks a pre-paint inline script). Widget/friction/prayer get `{allowLightTheme:false}`
  (accent only — dark by design). Title bar stays emerald in all themes; **art (Realm/Town/arcade/icons) is NOT
  themed**. Default = dusk (opt-in light). Picker = `AppearanceSettings` in `DataView.tsx`; driver `pw:theme`.
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
- **Share/export images → the canvas STUDIO in `shareCard.ts`** (renderer-only, ZERO deps, never
  leak quest titles). Themeable + multi-format + frozen-effects via `renderShareCardPng(data, style)`; the
  shared `ShareCardModal` carries the picker for every card kind. **Share artifacts stay static PNG** —
  animated export (WebM/GIF/MP4) is rejected (won't paste into iMessage/WhatsApp, or needs a new dep), so
  revisiting it is a stop-and-confirm dep decision, not a quiet add. See the codebase-overview skill's gotchas.
- **UI-only preferences (e.g. last-used share theme, `questday.theme`/`questday.accent`) → `localStorage`,
  NOT `db.json`** — it deliberately avoids the save-schema deep-merge/validate path (no stop-and-confirm). Only
  real user data goes in `db.json`. **Exception — state whose source of truth is the MAIN process** (it can't
  read a renderer's localStorage) lives in `settings`: e.g. `settings.widgetVisible` (v1.14), which the main
  process syncs on widget show/hide/close so the Dashboard toggle label stays correct (a stop-and-confirm
  schema add). Reset `true` on launch (widget always opens).
- **Quest ordering (v1.14):** per-frame mode flag `TimeFrame.manualOrder` (Auto = sort by importance/urgency
  `scoreQuest`; Custom = sort by the existing `Quest.sortOrder`, set by a drag). `selectCurrentQuest.ts`'s
  `rankCandidates` is frame-mode aware so widget/Dashboard/Quests-tab agree; `resolveCurrentQuest` rescues a
  near-due quest to "current" in a Custom frame (`balance.selection.dueSoonRescueThreshold`). `manualOrder` +
  `sortOrder` are NEVER read by reward/↩Restore math.
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

- **`docs/*-research-*.md` AND the HANDOFF's "to build" list are STALE — verify against CODE.** A 2026-06-28 audit
  found most "to build" features already shipped (Salah checklist, quest duplicate / reorder-subtasks / notes / snooze /
  capacity-bar / Quest Library, Weekly Review, resting widget, Importance×Urgency). **Confirmed AGAIN the same session:**
  local export/import + restore (`backup/portable.ts` + `ipc/backup.ts` + DataView UI) and the arcade depth modes (all
  11 games already ship Easy/Med/Hard) were listed "to build" but were fully done. The code is the source of truth;
  **a quick existence-grep before building beats trusting any planning doc** (incl. this file and HANDOFF).
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
- **`cd` into a subdir persists across Bash calls (cost time 2026-06-29):** after a `cd website` (e.g. for a Vercel
  deploy), later Bash calls stay in that dir, so a bare `git add CLAUDE.md` fails (`pathspec did not match`) and the
  Grep tool's default path silently finds nothing. Fix: run git as `git -C "<repo-root>" …` and pass an explicit
  `path` to Grep — or avoid `cd` inside compound commands.
- **Redirect landmine + dump gitignore (cost cleanup time 2026-06-28):** in git-bash on Windows,
  redirecting to a `C:\temp\...` path writes a literal `C:temp...` file at the **repo root** (the
  drive `:` becomes the U+F03A private-use colon), which ordinary globs (`./*.txt`) silently miss and
  which clutters `git status`. Redirect to `/tmp/...` (POSIX) instead, or to a name already ignored.
  The regenerable dump patterns `/pw-*.txt`, `/pwqa*.txt`, `/sweep-*.txt`, `/*-out.txt`, `/tc.txt` and
  root preview PNGs (`/biome-*`, `/buildings-*`, `/town-*`, `/edit-*`, `/tb-*`, `/tp-*`, `/openart-*`)
  are now in `.gitignore` so test/build output and dev screenshots never re-clutter the tree.
- **Per-feature commits when a file spans features (refined 2026-06-28, used for the whole batch).** `types.ts`,
  `defaults.ts`, `store.ts`, `styles.css`, `features.ts`, `state/store.ts` accrete changes for several features. Reliable
  recipe: `node scripts/_split-diff.cjs <file>` dumps `git diff <file>` into one patch per `@@` hunk; assemble a
  per-feature patch from the right hunks and `git apply --cached --recount` it (then `git add` that feature's whole-only
  files, commit, repeat). **Why it works incrementally:** `git apply` locates hunks by CONTEXT, tolerating the
  line-number drift earlier commits cause — as long as the hunk's context lines aren't themselves modified by a prior
  commit. **`--check` each first.** Caveats learned: (1) **contiguous added blocks can't be split incrementally** (e.g.
  the 5 adjacent `package.json` script lines; the eod+bundles+calendar CSS in one `styles.css` hunk) — assign the whole
  hunk to ONE commit and note the ride-along in the message; (2) the splitter keys output files by BASENAME, so the two
  `store.ts` files collide — copy them to distinct names; (3) only `git add` your OWN paths (never `-A`) — the repo has
  many pre-existing untracked dev files.

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
