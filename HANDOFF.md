# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-28 · branch `feature/civilization-world-map` · feature batch `aa01342`…`6829604`
(+ this docs commit), all LOCAL — **NOT pushed**._

## ▶ STATUS: backlog items 1–5 COMMITTED (5 splits) — local only, awaiting user "push" OK
User asked (batch mode) to build 5 backlog items and hold the civilization layer (#6) for a later
session. All 5 are coded, typecheck-clean, and pass their pw drivers + visual screenshot review.
Committed 2026-06-28 as 5 feature/fix splits + 1 docs commit (see Git state). NOT pushed — the user
has not OK'd a push. The big repo-root scratch pile (`pw-*.txt`, `sweep-*.txt`, biome/town/edit
`*.png`, extra mockups, `scripts/_*.mjs`) was deliberately left uncommitted.

| # | Feature | State | Verified by |
|---|---|---|---|
| 1 | **Quest ordering column** (numbered rank, Auto↔Custom per frame, #1 drives widget + deadline rescue) | ✅ built | `pw`, `pw-widget`, `pw:theme` screenshots show it |
| 2 | **Theming** (Daylight/Dusk/System + 4 accents) | ✅ built | `pw:theme` (5 tabs screenshotted in Daylight + amethyst) |
| 3 | **Minigame high-score share card** (Share button on each game card) | ✅ built | `pw:arcade` (reuses approved studio) |
| 4 | **Color Recreation** minigame (11th arcade game, dialed.gg-style) | ✅ built | `pw:arcade` `COLORRECALL_PLAY=50/50` |
| 5 | **Show-widget button → toggle** (Show/Hide, label tracks real visibility) | ✅ built | `pw-widget`, screenshots |
| — | **Bug fix:** Flash Recall + Track Switch hitbox (pointerdown, not click) | ✅ built | `pw:arcade` FLASHRECALL/TRACKSWITCH PASS |

Two design mockups were built & user-APPROVED ("they're both great") before coding: `mockups/theme-preview.html`
and `mockups/color-recreation.html`. The quest-order mockup `mockups/quest-order-column.html` (pre-existing) was
confirmed as the design.

## Git state
- branch **`feature/civilization-world-map`**, was at `76195cc` (pushed). **6 new LOCAL commits this
  session (NOT pushed):** `aa01342` feat(quests) order column · `171d386` feat(arcade) Color Recreation
  + grid share · `5478b65` feat(ui) themes + accent picker · `eae4916` feat(widget) Show/Hide toggle ·
  `6829604` fix(arcade) pointerdown taps · + this docs commit. Three multi-feature files (`types.ts`,
  `balance.ts`, `styles.css`) were split at the hunk level so each commit is coherent.
- stashes: **none**.
- **This session's FEATURE changes (tracked, unstaged):** `package.json`, `scripts/pw-arcade.mjs`,
  `src/main/index.ts`, `src/renderer/app/Dashboard.tsx`, `src/renderer/app/DataView.tsx`,
  `src/renderer/app/QuestsView.tsx`, `src/renderer/app/arcade/ArcadeView.tsx`,
  `src/renderer/app/arcade/gameIcons.tsx`, `src/renderer/app/arcade/games/FlashRecall.tsx`,
  `src/renderer/app/arcade/games/TrackSwitch.tsx`, `src/renderer/app/shareCard.ts`,
  `src/renderer/{main,widget,friction,prayer}.tsx`, `src/renderer/state/store.ts`,
  `src/renderer/styles.css`, `src/renderer/theme.css`, `src/shared/config/balance.ts`,
  `src/shared/defaults.ts`, `src/shared/engine/selectCurrentQuest.ts`, `src/shared/types.ts`.
- **This session's NEW (untracked):** `src/renderer/app/arcade/games/ColorRecreation.tsx`,
  `src/renderer/theme.ts`, `scripts/pw-theme.mjs`, `mockups/theme-preview.html`,
  `mockups/color-recreation.html`, `pw-shots/theme-*.png` + `pw-shots/arcade-colorrecall.png` (artifacts).
- **This session's docs/meta edits:** `.claude/skills/codebase-overview/SKILL.md` (+gotchas), `CLAUDE.md`
  (+conventions), this `HANDOFF.md`, and memory files under `~/.claude/projects/.../memory/`
  (`questday-feature-backlog.md`).
- **Pre-existing uncommitted (NOT this session):** `.claude/settings.local.json`,
  `.claude/skills/shipping-and-gotchas/SKILL.md`, plus a large prior-session scratch pile (`pw-*.txt`,
  `biome*`/`town*`/`edit-*` pngs, `docs/*-2026-06-16.md`, many `mockups/`, `scripts/_gen-*`). Predate today.

### Per-file: what changed & why (this session's feature files)
| File | What changed & why |
|---|---|
| `src/shared/types.ts` | +`Settings.widgetVisible: boolean` (item 5) and +`TimeFrame.manualOrder?: boolean` (item 1). Both optional/tolerant, NEVER read by reward/↩Restore math. |
| `src/shared/defaults.ts` | Seed `widgetVisible: true` (widget opens on launch). |
| `src/main/index.ts` | `syncWidgetVisible()` helper writes `settings.widgetVisible` (deep-merge, only that field) on widget show/hide/close + tray toggle + friction re-show. Source of truth = MAIN process. |
| `src/renderer/app/Dashboard.tsx` | "Show widget" button is now a toggle: reads `db.settings.widgetVisible`, calls `widget.hide()`/`widget.show()`, label + title flip Hide/Show. |
| `src/shared/engine/selectCurrentQuest.ts` | `rankCandidates` is now frame-mode aware (`orderByFrameMode`: Auto→score desc, Custom→`sortOrder` asc). `resolveCurrentQuest` adds the **custom-frame deadline rescue** (a near-due quest grabs the spotlight while keeping its list spot). `selectCurrentQuest` now routes through `resolveCurrentQuest`. |
| `src/shared/config/balance.ts` | +`selection.dueSoonRescueThreshold: 0.5` (rescue trigger). +`arcade.games.colorrecall` config (name/icon `Eyedropper`/color `--skill-flex` + `rounds:5` + per-tier `tiers.{easy,medium,hard}`). |
| `src/renderer/state/store.ts` | `moveQuestBefore` now also flips the target frame to `manualOrder:true` (same atomic save). +`resetFrameOrder(frameId)` action (clears the flag → re-sorts by priority). |
| `src/renderer/app/QuestsView.tsx` | Numbered **rank badge** (replaces the dots grip, doubles as drag handle); active quests sort by frame mode; per-frame **Auto·by priority / Custom order** pill + **Reset to auto** button; **current-quest highlight** (green bar + filled badge) in the active frame. |
| `src/renderer/widget/WidgetList.tsx` | *(unchanged file)* — automatically reflects custom order because it already calls `rankCandidates`. |
| `src/renderer/app/arcade/ArcadeView.tsx` | `sharing` state now holds the card data (built by `arcadeShareData()`); a small **Share button** added to each game card's "best:" line (item 3). +`ColorRecreation` registered in `GAME_COMPONENTS`. |
| `src/renderer/app/shareCard.ts` | Arcade card "Result" chip reads **"Personal best"** for a best-showcase share (score===best, not a fresh best). |
| `src/renderer/app/arcade/games/ColorRecreation.tsx` | **NEW** — the colour-recreation game (flash HSB colour → rebuild with sliders → redmean-distance score 0–10 × 5 rounds). Pure colour math; tone-rule ease; `data-phase`/`data-target` test hooks. |
| `src/renderer/app/arcade/gameIcons.tsx` | +`Eyedropper` import + ICONS entry (the new game's glyph). |
| `src/renderer/app/arcade/games/{FlashRecall,TrackSwitch}.tsx` | Hit registers on **`onPointerDown`** (button=0), not `onClick` — fixes the dropped-tap-when-the-button-moves/re-renders bug. |
| `src/renderer/theme.css` | +`--on-brand` ink token; +`[data-theme="daylight"]` (warm-paper light theme, `color-scheme:light`); +4 `[data-accent="…"]` blocks (emerald/amethyst/sky/gold). |
| `src/renderer/theme.ts` | **NEW** — localStorage theme/accent (`questday.theme`/`questday.accent`), `applyStoredTheme()` (entry), `setThemeChoice`/`setAccentChoice`, `watchThemeChanges` (cross-window via `storage` event + `prefers-color-scheme`). Default = **dusk** (opt-in light). |
| `src/renderer/{main,widget,friction,prayer}.tsx` | Call `applyStoredTheme()`+`watchThemeChanges()` before `createRoot`. Main = full theme; widget/friction/prayer = `{allowLightTheme:false}` (accent only, dusk surfaces — they're designed dark). |
| `src/renderer/app/DataView.tsx` | +`AppearanceSettings` card (Theme segmented control + accent swatches) rendered after the stats card. |
| `src/renderer/styles.css` | +`.arcade-grid-share`; +rank/order-mode/reset-auto/current CSS; +`cr-*` colour-game CSS; +Appearance-picker CSS; ink hardcodes (`#06231a`/`#0c1410`/`#06251a`) → `var(--on-brand)` so accents recolour text. |
| `scripts/pw-arcade.mjs` | `ARCADE_CARDS_TEST` 10→**11**; +Color Recreation play block (reads `data-target`, sets sliders, 5-round perfect run). |
| `scripts/pw-theme.mjs` | **NEW** — flips to Daylight + amethyst, screenshots every main tab. |
| `package.json` | +`pw:theme` npm script. |

## Baseline (this session — last known result, ALL PASS; no re-run needed)
- `npm run typecheck` → **PASS** (main + renderer).
- `npm run build` → **PASS** (incl. the new `Eyedropper` icon import — build, not typecheck, is the icon gate).
- `npm run pw:arcade` → **PASS 20/20** — `ARCADE_CARDS_TEST=11`, `COLORRECALL_LAUNCH_TEST`,
  `COLORRECALL_PLAY_TEST` (perfect run scored **50/50, new best**), + all 10 prior games (incl.
  FLASHRECALL/TRACKSWITCH = the hitbox fix).
- `npm run pw` → **PASS** (19 current-quest/focus assertions).
- `node scripts/pw-widget.mjs` → **PASS 8/8** (`WIDGET_CURRENT/STEP/DEFER/LIST/PIN_SWITCH/PIN_TOGGLE_OFF/READY/REOPEN`).
- `npm run pw:rewards` → **PASS** (`SETTINGS_MERGE/VALIDATION_REJECT/REWARD_MATH/LEVEL_UP/COMPLETION_AWARD/RESTORE_REVERSAL/RESTORE_QUEST_STATE`) — **↩Restore stays exact despite the 2 new schema fields**.
- `npm run pw:rollover` → **PASS**.
- `npm run pw:theme` → **PASS** — `DAYLIGHT_APPLIED_TEST` (`data-theme="daylight"`),
  `ACCENT_APPLIED_TEST` (`data-accent="amethyst"`); screenshots `pw-shots/theme-daylight-*.png` reviewed
  (Dashboard/Quests/Data/Forge/Arcade + amethyst) — readable, no broken surfaces, title bar stays emerald.

### Verbatim currently-failing output
**NONE this session — every command above exited 0.** Pre-existing INTENTIONAL failures are unchanged and
untouched: `pw:realm` and the expedition assertion in `pw-celebration` only pass when `REALM_COMING_SOON`
is flipped to `false` (the Realm is gated). Not regressions.

## Resume commands (exact)
```powershell
npm install                 # only if node_modules is missing
npm run build               # compile to out/ — REQUIRED before any pw driver (drivers launch the built out/)
npm run dev                 # live app (widget + main window, hot-reload). If it exits 127, that's the OneDrive
                            #   electron-binary gotcha (see shipping-and-gotchas skill) — `npm run start`
                            #   (electron-vite preview of out/) is the fallback.
npm run typecheck           # tsc (node + web)
npm run pw:arcade           # 11 games incl Color Recreation; screenshots -> pw-shots/arcade-*.png
npm run pw:theme            # Daylight + accent screenshots -> pw-shots/theme-*.png
npm run pw                  # current-quest / focus
node scripts/pw-widget.mjs  # widget + the new Show/Hide toggle
npm run pw:rewards          # reward + ↩Restore exactness (run after ANY schema/save change)
```
No env vars, no services, no network — fully offline/local-only. All pw drivers use an isolated
`--user-data-dir` (never touch the real `db.json`) and need the app quit (shared single-instance lock).

## Next steps (file-level targets)
1. **DONE — batch committed** as 5 feature/fix splits (`aa01342`…`6829604`) + 1 docs commit, all LOCAL.
   **Next gate = user OK to `git push`** (push is stop-and-confirm). The mockup files
   (`theme-preview`, `color-recreation`.html) were left uncommitted pending the keep/remove call.
2. **(Optional) User click-through** in the real app (`npm run dev`): Quests tab (drag to flip Custom,
   Reset to auto, #1 highlight), Data → Appearance (Daylight + accents), Dashboard (Hide/Show widget),
   Arcade → Color Recreation + a grid Share button.
3. **(Optional) Decide on the mockup files** `mockups/{theme-preview,color-recreation}.html` — keep as design
   record or remove; not app code.
4. **(Deferred, needs go-ahead) Per-theme NATIVE Windows title bar** — currently stays emerald in every theme.
   Relighting it in Daylight needs a new `window:setTitleBarOverlay` IPC in `src/main/index.ts` +
   `src/preload/index.ts` (touches preload/IPC = STOP-AND-CONFIRM).
5. **Civilization layer (#6)** — user explicitly HELD for a later session (spec
   `docs/superpowers/specs/2026-06-16-town-editing-design.md`; adding `townLayouts` is a stop-and-confirm schema change).

## Open / deferred
- **Native title-bar per-theme relight** — DEFERRED (needs new IPC; see step 4). Title bar is branded emerald
  in all themes by design.
- **Widget / friction / prayer overlays stay DARK in light mode** — they get accent only (`allowLightTheme:false`),
  surfaces forced dusk, because they float over the desktop / are atmospheric. A light treatment for them is parked.
- **Theme default is `dusk`, not `system`** — chosen so existing users aren't flipped to light on update; light/system
  is opt-in. `nativeTheme.themeSource` is still `'dark'` (main process); `color-scheme:light` in the daylight block
  handles renderer scrollbars/controls. If a future "follow OS by default" is wanted, change `loadThemeChoice()`'s default.
- **v1 customization = preset themes + 1 accent** — a free color-wheel / per-token custom editor is DEFERRED to v2.
- **High-score card has NO date** — `ArcadeState.best` is `Record<string,number>` (no timestamp); adding a date would
  be a db.json schema change. Omitted for v1 (card shows game + score + "Personal best").
- **Color Recreation in-game summary shows total/50**; the all-time personal best is shown by the ARCADE result banner
  (the game component doesn't read `db.arcade.best`). Intended (consistent with other games).
- **Cross-frame drop onto a position flips the destination frame to Custom** (intended — you chose a slot). A loose drop
  onto a frame (lands at end) does NOT change its mode.
- **No TODO/FIXME added** this session (swept all changed `.ts`/`.tsx` — clean).
- **Disposable clutter** (optional cleanup): `pw-shots/*.png`, plus the large prior-session scratch pile at repo root.
