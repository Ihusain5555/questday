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
- **Quest Library (v1.11) — `questTemplates` is a SEALED db key.** Reusable quest templates live in a
  new top-level `questTemplates: QuestTemplate[]` (types.ts), wholesale-replaced on save, `migrate()`
  tolerant (missing/non-array → `[]`), `validate()` REJECTS the whole save on malformed (mirrors
  `townLayouts`). It is **never read by `civilization.ts`/`realm.ts`/rewards** — templates only ever
  produce ordinary quests via `createQuest`, so ↩ Restore stays exact (proved by `pw:rewards`). Store
  actions: `createTemplate`/`updateTemplate`/`deleteTemplate`/`saveQuestAsTemplate` (+ `duplicateQuest`).
- **Quest Library DRAG coexistence.** Template cards drag with a DISTINCT payload
  `application/x-questday-template` (const in `TemplateCard.tsx`). The frame `onDragOver` must detect it
  via `e.dataTransfer.types.includes(...)` — templates never set the `dragId` React state, so without
  that check `preventDefault()` never runs and the drop SILENTLY fails. `onDrop` checks the template MIME
  BEFORE the existing `getData('text/plain') || dragId` quest-move fallback, so a template drop can never
  be mis-read as a reorder.
- **`QuestForm` now serves quests AND templates.** `hideScheduling` hides due/frame/Repeats (template
  mode); `isEdit` overrides the create-vs-edit wording (tap-add pre-fills from a template but is CREATING,
  so it passes `isEdit={false}` → "New quest"). `QuestFormInitial` (a `Pick` of Quest + optional
  scheduling) lets one form accept a `Quest` OR a `QuestTemplate`.
- **`questLibrary` toggle = a sub-section, not a tab.** It's in `TOGGLEABLE_FEATURES` (so the Data tab
  auto-renders its switch) but NO tab has that id, so `App.tsx`'s tab filter never hides a tab; `QuestsView`
  reads `isFeatureEnabled(...,'questLibrary')` directly to show/hide the rail. NOT seeded in
  `enabledFeatures` (missing key = ON). The Data tab itself is now a right-aligned **gear** (`.tab.gear-tab`).
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
- **`npm run typecheck` does NOT catch a non-existent Phosphor icon import — only `npm run build`
  (rollup) does** (tsc's `@phosphor-icons/react` types are looser than the bundle's actual exports).
  Always BUILD before claiming an icon works. The installed version exports `Archive` (NOT
  `ArchiveBox`), `PencilSimple`, `X`, `Mosque`, `CalendarCheck`. Quest-row action buttons are
  icon-only with `aria-label`s that MUST match the old text ("Edit"/"Duplicate"/"Drop"/"Delete"/
  "Save as template") so `pw` `getByRole({name})` lookups still resolve.
- **Responsive CSS source-order trap.** `.quests-layout`/`.library-rail` base rules live ~line 4066
  of `styles.css`; the 308px rail is the width-thief, so its responsive override (drop full-width
  under the list below 940px — the window min is 720px) MUST sit at the END of the file, else an
  earlier equal-specificity `@media` rule loses the cascade. `scripts/pw-scale.mjs` screenshots the
  Quests tab at 1040 (rail beside) and 720 (rail stacked) to verify.
- **Opt-in faith features must SEED `false` — they override the "missing key = ON" convention.**
  Most features rely on a missing `enabledFeatures` key meaning ON, but a faith feature (`faithChecklist`)
  must be OFF until opted in so non-Muslim users never see it. So `defaults.ts` explicitly seeds
  `faithChecklist: false`, and `migrate()` merges fresh-first (`...fresh, ...db`) so existing saves
  inherit the seed too. Any future identity/belief-scoped feature must do the same — do NOT rely on the
  default-ON rule for it.
- **Share-card (v1.11) — canvas text needs the webfont PRELOADED or it silently falls back.** The offline
  PNG export (`src/renderer/app/shareCard.ts`, drawn on an `<canvas>` 2D context, `toDataURL('image/png')`,
  ZERO deps / ZERO IPC) must `await document.fonts.load('<weight> <size> "Clash Display"')` (and Satoshi)
  BEFORE the first `fillText`, or the canvas draws in a system fallback font even though the same font
  renders fine in the DOM — canvas doesn't lazy-load fonts the way the DOM does. It reads ONLY derived
  weekly numbers + realm art + brand — never quest titles (a locked privacy rule). `scripts/pw-sharecard.mjs`
  (3/3) checks the data-URL is a real non-trivial PNG; the last-mile Save-to-disk / clipboard-paste is the
  one step pw can't fully script.
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
- **macOS build (v1.10, free/unsigned universal `.dmg`) — the landmines.** `npm run dist:mac` (Mac
  only) or GitHub Actions `.github/workflows/build-macos.yml` → `release/`. Repo is PUBLIC at
  `github.com/Ihusain5555/questday`. (1) `build.mac.identity` MUST be `"-"` (ad-hoc), NOT `null` —
  `null` logs "skipped code signing" and the universal binary is killed on launch by Apple Silicon.
  (2) `electron-builder --mac` MUST pass `--publish never` — a tag-triggered build otherwise fails
  demanding `GH_TOKEN` (implicit publish). (3) `workflow_dispatch` takes ~10 min to register on a
  fresh repo; a `push: tags: v*` trigger fires immediately (throwaway tag `v1.10.0-mac.1` exists on
  the remote, points to the pre-fix commit). (4) GitHub Actions **artifacts need a GitHub login to
  download** — to hand the `.dmg` to a non-GitHub user, attach it to a public Release or transfer
  the file. (5) Renderer detects macOS via `navigator.userAgent` (`src/renderer/platform.ts`
  `IS_MAC`), NOT a preload field — keeps the security surface untouched. (6) Active Mode is hidden +
  never started on macOS (Win32/PowerShell-only). (7) Icon regenerated to 1024px via
  `scripts/_gen-icon.cjs` — headless Electron renders the Clash Display Bold "Q" to a canvas (no
  standalone Chrome here; Playwright drives Electron). (8) `directories.output` is now relative
  `release/`; the Windows `dist` script overrides it back to `questday-release/` via `-c.`.
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
- **The Level-1 TOWN render-engine (v1.10, built 2026-06-16) lives in `src/renderer/app/TownView.tsx`** — clicking a
  charted hero town on the map zooms into an iso town that grows Camp→Empire (`COUNT_BY_STAGE`, count derived from the
  civ stage). Art is **self-authored inked SVG** baked into two AUTO-GENERATED modules: `townBuildings.ts`
  (`BUILDING_SVG`, 5 kinds: hall/keep/tavern/house/cottage) and `biomeDecor.ts` (`BIOME_GROUND` = 8 biomes' base/accent +
  decoration SVGs, plus `REGION_BIOME` mapping all 15 region ids → biome). RealmView passes `biome={REGION_BIOME[id]}`.
  **Tunables at the top of TownView** (don't hardcode elsewhere): `TILE_W=100 TILE_H=50` (2:1 iso, wider than a building
  so grass shows), `BUILDING_SCALE=0.72`, `DECORATION_SCALE=0.45` (keeps trees/pines UNDER house height — a user rule),
  `JITTER_X=16 JITTER_Y=9`. Placement is organic via a deterministic `hash(gx,gy)` jitter + size variation; the centre
  Hall (plot 0) is anchored. Everything is **pure-derived** (stage+plot+region → deterministic, nothing stored) so **↩
  Restore stays exact** — do NOT add stored state.
- **TOWN GOTCHA — a CSS animation that sets `transform` OVERRIDES an SVG `transform` attribute.** Buildings are positioned
  by an SVG `transform` on an OUTER `<g>`, but the `.town-bldg` rise animation (`@keyframes town-rise`, `translateY`) also
  sets `transform` — so positioning and animation MUST be on separate elements (outer = position, inner `.town-bldg` =
  animate), else every building stacks at 0,0. Buildings are inlined via `dangerouslySetInnerHTML` on `<g>` (the
  `storybookMapIcons` pattern). Buildings + scattered decorations are **merged into one list and depth-sorted by screen-y**
  (a tree in front of a house must paint over it). Decorations scatter on EMPTY tiles only.
- **Inked-SVG art pipeline (reuse for any new town art).** Generate via a **Workflow against a LOCKED style contract**
  (exact palette hexes, ink `#5a4a2e`, single upper-left light, exact iso box/roof vertex math) + a per-asset
  **precision/cohesion enforcer** pass (snaps colours, forces constant-x verticals, centres roof ridges, converts flat
  "sticker" windows to in-plane parallelograms). Two traps: (a) workflow returns SVGs **HTML-entity-encoded** — decode
  before embedding (`&lt;`→`<` …, `&amp;` last, strip `<![CDATA[`); (b) **workflow agents cannot reliably write files or
  "render in a browser"** — a returned HTML that claims a file write is CONFABULATED, so have the workflow return RAW svg
  data and assemble/codegen/screenshot in the MAIN thread (or resume the run with the return changed → cached agents are
  instant). Tune all scales/spacing VISUALLY in throwaway `mockups/` previews (served via `node scripts/_mockserver.mjs`
  on :8777 + Playwright MCP, which blocks `file://`) BEFORE baking into TownView. Gemini critique (`_gemini-buildings.mjs`)
  is one opinion only — it confabulates and flip-flops by model; the visually-driven user is the art judge.
- **Town EDITING v1 is DESIGNED, NOT built — don't re-derive it** (spec
  `docs/superpowers/specs/2026-06-16-town-editing-design.md`, 2026-06-16; the civilization layer's chosen
  headline, after the Goodgame-Empire research). v1 "Arrange your town" = drag-move + type-swap in a dedicated
  Edit mode, grid-snap, all unlocked towns, reset-to-auto. **Architecture to reuse:** keep the current
  pure-derived town as the BASE; persist ONLY sparse per-building overrides in a NEW sealed top-level db key
  `townLayouts` (`Record<townId,{overrides:Record<buildingIndex,{cell?:PLOTSindex,kind?:'keep'|'tavern'|'house'|'cottage'}>}>`),
  **wholesale-replace** on save (reset = omit the town), NEVER read by `civilization.ts`/rewards (keeps ↩ Restore
  exact). Render = derived base + overrides; **untouched buildings keep their own default `PLOTS[i]` cell and
  reflow ONLY if an override claimed that exact cell** — do NOT refill the whole grid order, or untouched
  buildings shuffle when you move a different one. Hall (index 0) is fixed/non-swappable. Adding `townLayouts` =
  STOP-AND-CONFIRM schema change. Build order in spec §13 (mockup → data layer → render → swap UI → drag UI →
  reset/polish → `pw:townedit` driver).
