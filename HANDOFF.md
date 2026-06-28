# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-28 · branch `feature/civilization-world-map`._

## ▶ STATUS: backlog batch SHIPPED & PUSHED. Civilization layer #6 is the next feature.
The 5 backlog features (built + verified a prior session) were committed this session as 5 coherent
splits + a docs commit + a gitignore/cleanup commit, and **pushed to `origin`**. The repo-root scratch
pile was deleted and gitignored. Working tree is clean except 2 pre-existing edits and the intentional
untracked keepers (docs / mockups / deck / generators). Only the LAST docs commit (this resume kit +
CLAUDE.md lesson) is local-and-unpushed — see Git state.

## Git state
- **Branch:** `feature/civilization-world-map` (the repo default). **Remote:** `origin`
  `https://github.com/Ihusain5555/questday.git`.
- **Pushed HEAD:** `44dc0f1` (origin is at this). The doc commit written below (HANDOFF + CLAUDE) is a
  NEW local commit on top — **not yet pushed** (push is the stop-and-confirm gate).
- **Stashes:** none.
- **Staged:** none.
- **Unstaged (tracked) — PRE-EXISTING, not this session, intentionally left:**
  `.claude/settings.local.json`, `.claude/skills/shipping-and-gotchas/SKILL.md`.
- **Untracked — intentional KEEPERS (not scratch):** `docs/*.md` (4: feature-ideas + social research/plan +
  town-drag spec), `mockups/*.html` (~20 design records incl. `theme-preview.html`, `color-recreation.html`),
  `presentation/QuestDay-Shareholder-Presentation.html` (pitch deck), `scripts/_*.mjs` (~19 civ-art
  generators) + `scripts/_biome-data.json`, `scripts/{build-deck,pw-deck}.mjs`, `.github/*.png` (5 mockup
  images), root `_biomes.json`/`_buildings.json`/`_halls.json`/`_apply-profile.cjs`.

### Session commits (all PUSHED except the docs commit on top)
```
44dc0f1 chore: gitignore regenerable test-output dumps + root preview PNGs   <- origin HEAD
4f7b374 docs: record backlog-batch conventions + resume kit
6829604 fix(arcade): register Flash Recall / Track Switch taps on pointerdown
eae4916 feat(widget): Show-widget button is now a Show/Hide toggle
5478b65 feat(ui): light/dark themes + accent picker
171d386 feat(arcade): Color Recreation game + share high score from the grid
aa01342 feat(quests): per-frame Auto/Custom order column + #1 drives current quest
76195cc feat(share): responsive share-card layout  (← prior session; branch point)
```
Three multi-feature files (`types.ts`, `balance.ts`, `styles.css`) were split at the hunk level so each
commit is coherent (see the CLAUDE.md "Per-feature commits" note for the technique).

## Session diffstat (`git diff --stat 76195cc..HEAD`)
```
 .claude/skills/codebase-overview/SKILL.md         |  62 +-
 .gitignore                                        |  15 +
 CLAUDE.md                                         |  20 +-   (+ this session's redirect/dump/commit notes)
 HANDOFF.md                                        | 213 +++-  (+ this rewrite)
 package.json                                      |   1 +
 scripts/pw-arcade.mjs                             |  35 +-
 scripts/pw-theme.mjs                              | 118 +++
 src/main/index.ts                                 |  20 +-
 src/renderer/app/Dashboard.tsx                    |  14 +-
 src/renderer/app/DataView.tsx                     |  70 +
 src/renderer/app/QuestsView.tsx                   |  69 +-
 src/renderer/app/arcade/ArcadeView.tsx            |  52 +-
 src/renderer/app/arcade/gameIcons.tsx             |   2 +
 src/renderer/app/arcade/games/ColorRecreation.tsx | 429 +++++ (new)
 src/renderer/app/arcade/games/FlashRecall.tsx     |   8 +-
 src/renderer/app/arcade/games/TrackSwitch.tsx     |   6 +-
 src/renderer/app/shareCard.ts                     |   8 +-
 src/renderer/friction.tsx                         |   5 +
 src/renderer/main.tsx                             |   5 +
 src/renderer/prayer.tsx                           |   5 +
 src/renderer/state/store.ts                       |  20 +-
 src/renderer/styles.css                           | 681 ++++++++ (hunk-split across 3 commits)
 src/renderer/theme.css                            |  83 +   (new theme tokens)
 src/renderer/theme.ts                             |  85 +   (new)
 src/renderer/widget.tsx                           |   6 +
 src/shared/config/balance.ts                      |  18 +-
 src/shared/defaults.ts                            |   1 +
 src/shared/engine/selectCurrentQuest.ts           |  46 +-
 src/shared/types.ts                               |  11 +
 29 files changed, 1964 insertions(+), 144 deletions(-)
```

### Per touched file — what changed & why (→ commit)
| File | → | What & why |
|---|---|---|
| `src/shared/types.ts` | aa01342 + eae4916 | +`TimeFrame.manualOrder?` (quests) and +`Settings.widgetVisible` (widget). Both optional/tolerant; **never read by reward / ↩Restore math**. |
| `src/shared/defaults.ts` | eae4916 | Seed `widgetVisible:true` (widget opens every launch). |
| `src/shared/config/balance.ts` | aa01342 + 171d386 | +`selection.dueSoonRescueThreshold:0.5` (custom-frame deadline rescue); +`arcade.games.colorrecall` config w/ per-tier difficulty (Color Recreation). |
| `src/shared/engine/selectCurrentQuest.ts` | aa01342 | `rankCandidates` is frame-mode aware (Auto→score desc, Custom→`sortOrder` asc); `resolveCurrentQuest` adds the custom-frame deadline rescue; `selectCurrentQuest` routes through it. |
| `src/renderer/state/store.ts` | aa01342 | `moveQuestBefore` flips the frame to `manualOrder:true` (same atomic save); +`resetFrameOrder(frameId)`. |
| `src/renderer/app/QuestsView.tsx` | aa01342 | Numbered **rank badge** (= drag handle), frame-mode sort, per-frame Auto/Custom pill + Reset-to-auto, current-quest highlight. |
| `src/main/index.ts` | eae4916 | `syncWidgetVisible()` deep-merges ONLY `settings.widgetVisible` on widget show/hide/close + tray toggle + friction re-show (**main = source of truth**). |
| `src/renderer/app/Dashboard.tsx` | eae4916 | Show-widget button → Show/Hide toggle (reads `widgetVisible`, calls `widget.hide()/show()`, label flips). |
| `src/renderer/app/arcade/games/ColorRecreation.tsx` | 171d386 | **NEW** 429-line game: flash HSB colour → rebuild via sliders → redmean-distance score 0–10 × 5 rounds. `.cr-field[data-phase]` + `data-target="h,s,b"` test hooks; tone-rule ease. |
| `src/renderer/app/arcade/ArcadeView.tsx` | 171d386 | `sharing` state holds card data; per-card **Share button**; `ColorRecreation` registered in `GAME_COMPONENTS`. |
| `src/renderer/app/arcade/gameIcons.tsx` | 171d386 | +`Eyedropper` icon import + ICONS entry. |
| `src/renderer/app/shareCard.ts` | 171d386 | Arcade "Result" chip reads **"Personal best"** for a best-showcase share (score===best). |
| `src/renderer/app/arcade/games/{FlashRecall,TrackSwitch}.tsx` | 6829604 | Tap registers on **`onPointerDown`** (button=0), not `onClick` — fixes dropped tap when the button re-renders. |
| `src/renderer/theme.css` | 5478b65 | +`--on-brand` ink token; `[data-theme="daylight"]` light surfaces; 4 `[data-accent]` blocks (emerald/amethyst/sky/gold). |
| `src/renderer/theme.ts` | 5478b65 | **NEW** localStorage theme/accent + `applyStoredTheme()`/`watchThemeChanges()`. Default = **dusk** (opt-in light). |
| `src/renderer/{main,widget,friction,prayer}.tsx` | 5478b65 | Call `applyStoredTheme()`+`watchThemeChanges()` before `createRoot`; widget/friction/prayer = `{allowLightTheme:false}` (accent only). |
| `src/renderer/app/DataView.tsx` | 5478b65 | +`AppearanceSettings` card (theme segmented control + accent swatches). |
| `src/renderer/styles.css` | aa01342 / 171d386 / 5478b65 | **Hunk-split:** rank/order CSS (quests); `.arcade-grid-share` + `.cr-*` (arcade); appearance picker + ink `#hex`→`var(--on-brand)` (themes). |
| `scripts/pw-arcade.mjs` | 171d386 | `ARCADE_CARDS_TEST` 10→11 + Color Recreation play block (reads `data-target`, perfect 5-round run). |
| `scripts/pw-theme.mjs` | 5478b65 | **NEW** driver — flips to Daylight+amethyst, screenshots every main tab. |
| `package.json` | 5478b65 | +`pw:theme` npm script. |
| `.gitignore` | 44dc0f1 | Ignore regenerable test-dump patterns + root preview PNGs (see CLAUDE.md note). |
| `CLAUDE.md` | 4f7b374 + (local) | Conventions (ordering/theming/widgetVisible/localStorage); this session +redirect-landmine, +dump-gitignore, +per-feature-commit notes. |
| `.claude/skills/codebase-overview/SKILL.md` | 4f7b374 | v1.14 gotchas (Color Recreation hooks, theme axes, arcade union static-key). |
| `HANDOFF.md` | 4f7b374 + (local) | This resume kit. |

## Baseline (verification — DON'T re-derive)
- **`npm run typecheck` → PASS** — RE-RUN THIS SESSION (2026-06-28) via the `test-runner` agent; both
  tsc projects (node/main + web/renderer) clean, zero errors.
- **Everything below = last-known PASS from the prior session; NOT re-run this session** (slow Electron
  drivers + single-instance lock). Safe to trust: **no runtime code changed this session** — the commits
  are byte-identical to the working tree that was verified last session (only docs/config/gitignore moved).
  Re-run only if you touch runtime code.
  - `npm run build` → **PASS** (build, not typecheck, is the icon gate — caught the `Eyedropper` import).
  - `npm run pw:arcade` → **PASS 20/20** (`ARCADE_CARDS_TEST=11`; Color Recreation perfect run = 50/50 new
    best; FLASHRECALL/TRACKSWITCH = the pointerdown hitbox fix).
  - `npm run pw` → **PASS** (19 current-quest / focus assertions).
  - `node scripts/pw-widget.mjs` → **PASS 8/8** (incl. the new Show/Hide toggle).
  - `npm run pw:rewards` → **PASS** (↩Restore stays EXACT despite the 2 new schema fields).
  - `npm run pw:rollover` → **PASS**.
  - `npm run pw:theme` → **PASS** (`DAYLIGHT_APPLIED_TEST`, `ACCENT_APPLIED_TEST`; screenshots reviewed).

## Verbatim currently-failing output
**NONE.** Every command above exited 0. Pre-existing INTENTIONAL failures are unchanged and not
regressions: `pw:realm` and the expedition assertion in `pw-celebration` only pass when
`REALM_COMING_SOON` is flipped to `false` (the Realm is gated behind a "Coming Soon" wall by design).

## Resume commands (exact — fully offline, no env vars / services / network)
```powershell
npm install                 # only if node_modules is missing
npm run build               # compile to out/ — REQUIRED before any pw driver (drivers launch the built out/)
npm run dev                 # live app (widget + main window, hot-reload). Exits 127 => OneDrive electron-binary
                            #   gotcha (see shipping-and-gotchas skill); fallback `npm run start` (preview of out/).
npm run typecheck           # tsc (node + web) — run before considering anything done
npm run pw:arcade           # 11 games incl Color Recreation; screenshots -> pw-shots/arcade-*.png
npm run pw:theme            # Daylight + accent screenshots -> pw-shots/theme-*.png
npm run pw                  # current-quest / focus
node scripts/pw-widget.mjs  # widget + the Show/Hide toggle
npm run pw:rewards          # reward + ↩Restore exactness — run after ANY schema/save change
npm run pw:rollover         # rollover / recurrence
```
All pw drivers use an isolated `--user-data-dir` (never touch the real `db.json`) and need the app QUIT
(shared single-instance lock). Redirect verbose output to `/tmp/x.txt` or a gitignored `*-out.txt` name —
NOT `C:\temp\...` (creates a mojibake repo-root file; see CLAUDE.md "Redirect landmine").

## Next steps (file-level targets)
1. **Civilization town-editing layer (#6)** — the next real feature. Spec:
   `docs/superpowers/specs/2026-06-16-town-editing-design.md`. First task (**STOP-AND-CONFIRM schema change**):
   add a new top-level `townLayouts` db key `Record<townId,{overrides:Record<buildingIndex,{cell?,kind?}>}>`
   to `src/shared/types.ts` + seed in `src/shared/defaults.ts` + tolerant migration in `src/main/db/store.ts`
   (**wholesale-replace** on save; reset = omit the town). It must be **NEVER read by
   `src/shared/engine/civilization.ts` / rewards** so ↩ Restore stays exact. Town renders as derived base +
   sparse overrides. v1 = drag-move + swap building type, dedicated Edit mode, grid-snap, reset-to-auto.
2. **(Optional, your call) Track the untracked deliverables** if you want them in git:
   `docs/*-2026-06-16.md`, `presentation/QuestDay-Shareholder-Presentation.html`,
   `scripts/{build-deck,pw-deck}.mjs`. Currently untracked, not scratch.
3. **(Optional) Mockups keep/remove** — `mockups/{theme-preview,color-recreation}.html` (+ ~18 others) are
   design records, untracked. Keep as the design archive or delete.
4. **(Deferred, needs go-ahead) Per-theme NATIVE Windows title bar** — stays emerald in every theme today.
   Relighting in Daylight needs a new `window:setTitleBarOverlay` IPC in `src/main/index.ts` +
   `src/preload/index.ts` (**touches preload/IPC = STOP-AND-CONFIRM**).

## Open / deferred
- **No TODO/FIXME added this session** — swept `git diff 76195cc..HEAD -- src scripts` for TODO/FIXME/HACK/XXX: clean.
- **This session's docs commit (HANDOFF + CLAUDE update) is LOCAL** — push pending your OK (stop-and-confirm).
- **Track-or-not the untracked deliverables** (docs research, shareholder deck, deck scripts) — undecided.
- **Mockups keep/remove** — undecided.
- **Scratch generators `scripts/_*.mjs` kept** — civ layer #6 art work may reuse them (that's why option-1 cleanup left them).
- **Native title-bar per-theme relight** — DEFERRED (needs new IPC; step 4). Branded emerald in all themes by design.
- **Widget / friction / prayer stay DARK in light mode** (accent only, `allowLightTheme:false`) — a light treatment is parked.
- **Theme default = `dusk`, not `system`** — chosen so existing users aren't flipped to light on update; change `loadThemeChoice()`'s default for "follow OS".
- **v1 customization = preset themes + 1 accent** — free color-wheel / per-token editor = v2.
- **High-score card has NO date** — `ArcadeState.best` is `Record<string,number>` (no timestamp); adding a date = db.json schema change (skipped for v1).
- **Civilization layer #6** — was explicitly HELD by the user for a later session; `townLayouts` add is a stop-and-confirm schema change.
