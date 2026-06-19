# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-18 · branch `feature/civilization-world-map` · **v1.13.0** · HEAD `36b0b26` (PUSHED) · tag `v1.13.0`._

## ▶ STATUS: v1.13.0 SHIPPED — 8-feature batch done; one ACTIVE in-flight track (TownPlacer, the user's)

The v1.13 feature batch is **built, verified, adversarially-audited, committed, pushed, and SHIPPED** as a
public macOS Release: https://github.com/Ihusain5555/questday/releases/tag/v1.13.0 (210MB universal no-login
`.dmg`). **Both installers also built locally** in `C:\Users\ihusa\questday-release\`:
`QuestDay Setup 1.13.0.exe` (Windows, freshly built) + `QuestDay-1.13.0-universal.dmg` (Mac, from the Release).

**⚠ ACTIVE TRACK (the user's, NOT this batch — do not clobber):** a dev-only **TownPlacer** map tool is
uncommitted in the tree — `src/renderer/app/TownPlacer.tsx` (untracked), `src/shared/config/townPositions.ts`
(untracked, 15 towns x/y/r authored), `src/renderer/assets/dev/overworld.png` (untracked), plus modified
`RealmView.tsx` (DEV-gated `<TownPlacer>` render) + `.gitignore`. Resume detail in memory **[[town-map-positions]]**.
Next per that memory: wire pin-click → `onEnterTown`. The v1.13 installers were built CLEAN (this WIP stashed
out, then restored) — it is NOT in the shipped builds.

## What shipped in v1.13 (8 features, each its own commit)
- `91857a2` — **v1.13 polish checkpoint:** snooze (`snoozedUntil`), quest notes (`notes`), end-of-day reflection
  (`dailyNotes`) — all sealed keys; due-soon nudge seed; **Ramadan-aware Umm al-Qura Isha** (`isRamadan`);
  reduced-motion celebration; + 6 arcade game fixes + cottage roof + capital biome↔map.
- `04805f8` **#3 share card** — colour-coded weekly stats + "Best day"→"Most productive" + arcade-score card.
- `268da9d` **#4** — per-minigame how-to-play strip + 🧠 brain-benefit on all 10 games.
- `0e283d0` **#5** — deadline-aware scorer (cubic dueSoon, weight 1.8, decays overdue) + `resolveCurrentQuest`.
- `51ea450` **#6** — widget click-to-switch (`settings.pinnedQuestId` sealed) + Dashboard "Show widget" (`widget:show` IPC).
- `7c57986` **#7** — opt-in gentle full-screen **prayer reminder** (4th BrowserWindow + `src/main/prayer/reminder.ts`).
- `9fecf5e` **#8** — one-keystroke quick-add + first-run starter quests (`createStarterQuests`).
- `2ee65de` **#9** — Memory Match overhaul (8/12/15 pairs, Hard 45s, 18 colours, animations).
- `8b03930` **#10** — juicier rewards: surprise XP bonus folded into `completionAward` (↩Restore-exact) + sound.
- `7d43a5f` audit fixes (Active Mode honors the pin; Memory Match 18 colours) · `e080302` v1.13.0 bump ·
  `36b0b26` codebase-overview skill update.

## Git state
- branch `feature/civilization-world-map`, HEAD **`36b0b26`**, **PUSHED** (origin up to date), tag `v1.13.0` pushed.
- Uncommitted tracked: `.claude/settings.local.json` (personal, intentionally not committed) + the TownPlacer
  WIP (`RealmView.tsx`, `.gitignore` — the user's active track). No stashes left.

## Baseline (these held at session end)
- `npm run typecheck` → **PASS** · `npm run build` → **PASS** (~6s).
- Full driver regression GREEN: `pw-rollover` 6/6 · `pw-quickadds` 9/9 · `pw-library` 12/12 · `pw-eisenhower` 15/15
  · `pw-timeboxing` 6/6 · `pw-realm` 11/11 · `pw-prayer` 14/14 · `pw-capacity` 4/4 · `pw-weekly` 4/4 ·
  `pw-townedit` 15/15 · `pw-celebration` 7/7 · `pw-scale` 2/2 · `pw:arcade` 18/18. Plus v1.13's own:
  `check-scoring` 12/12 (pure scorer) · `pw-rewards` 3× incl. a jackpot (↩Restore exact) · `pw-widget` 8/8 ·
  `pw-prayer-reminder` 4/4 · `pw-quickadd-onboard` 4/4 · `pw-sharecard` 4/4.
- Known-stale: `pw-main` NAV_ICONS expects ≥8 tabs (app has 7 by design) — NOT a regression; fix or delete that check.

## Resume / verification commands
- `npm install` only on a fresh clone (OneDrive electron-download gotcha — memory `v1-9-0-audit-release`).
- `npm run dev` (live) · `npm run build` (→ `out/`, before any pw driver) · `npm run typecheck`.
- Drivers run the built `out/` in an isolated `--user-data-dir`; kill stray `electron`/`QuestDay` first. Many lack
  npm aliases — run via `node scripts/pw-<name>.mjs`. Test-output hook collapses PASS lines → redirect to a temp
  file + `Read` it, or use the `test-runner` agent (instruct it READ-ONLY: no git/edits — one earlier run reverted a file).
- **Ship a release:** `npm run dist` → Windows `.exe` in `C:\Users\ihusa\questday-release\` (build CLEAN: stash any
  WIP source first). macOS: bump `package.json` → `git tag vX.Y.Z` → `git push origin vX.Y.Z` (fires
  `build-macos.yml`) → `gh run watch <id> --exit-status` → `gh run download <id>` → `gh release create vX.Y.Z <dmg>`.
  Detail: memory `[[mac-build-pipeline]]`. **push / dist / release are stop-and-confirm.**

## How to test the new v1.13 features (for the user, beginner steps; `npm run dev`)
1. **Quick-add:** Quests tab → type in the top box → Enter (instant quest). "More options" = full form pre-filled.
2. **Memory Match:** Arcade → Memory Match → pick **Hard** (15 pairs / 45s); watch the colour flip/match pops.
3. **Prayer reminder:** Data (gear) → Salah settings → set city → toggle "Full-screen reminder" → **Preview**.
4. **Widget switch:** expand widget → tap another quest (becomes current; tap again to unpin). Close it → Dashboard → **Show widget**.
5. **Juicier reward:** complete a few quests → a gold **Bonus** chip (rare 🎁 Jackpot) + chime.
6. **Share an arcade score:** finish a game → **Share score** on the result card.

## Open / deferred (nothing required)
- **Windows v1.13 install** — the user runs v1.12 locally; the `.exe` is built but NOT installed. Offer: quit
  QuestDay → run `QuestDay Setup 1.13.0.exe /S` → relaunch. (Data in `%APPDATA%` is untouched.)
- **Faith-copy Islamic-Center sign-off** — prayer-reminder wording (`PrayerReminder.tsx`) + faith card copy
  (`QuestsView.tsx` ~line 185) + `PrayerSettings` labels. Opt-in/off-by-default; audit found tone correct.
- **TownPlacer track** (the user's active WIP — see top): wire pin-click → `onEnterTown`; licensing of the
  overworld art still to confirm before any bundle. Detail: memory `[[town-map-positions]]`.
- **Town drag-in palette (v2 of town editing)** — spec written `docs/superpowers/specs/2026-06-18-town-drag-in-palette-design.md`
  + mockup `mockups/town-drag-in.html`; awaiting mockup approval, then build. decorate=v2 / terraform=v3.
- **Backlog (parked):** Quest Library Bundles + morning prompt; Pipe Connect minigame + unlock tiers (mockup-first);
  Qibla / Hijri; AI/hero-art upgrade for the civilization (style-lock / commissioned map) — DEFERRED.

## Architecture reference (durable — full detail in the codebase-overview skill, updated `36b0b26`)
- **Sealed-key + never-read-by-rewards** is the template for every new optional feature → ↩ Restore stays exact.
  v1.13 sealed keys: `snoozedUntil`, `notes`, `dailyNotes`, `pinnedQuestId`, `prayerReminderEnabled`.
- **Scorer is now deadline-aware** (`scoreQuest` dueSoon curve) + **pin override** (`resolveCurrentQuest`, used by
  Widget + Dashboard + Active Mode scheduler). Still gated to the active frame.
- **Variable rewards stay Restore-exact** by folding the rolled bonus into `applyCompletion`'s `xpGained` before
  the level-up loop, then storing the single total in `completionAward`. `pw-rewards` asserts invariants, not a frozen number.
- **4 BrowserWindows:** main / widget / friction / **prayer** (all `sandbox:false` + contextIsolation).

## Throwaway (untracked; delete only with user OK — stop-and-confirm)
Root PNGs (`biome-*`/`town-*`/`tb-*`/`tp-*`/`edit-*`/`cadence-*`/`halls-*`/`*-mockup.png`), `_*.json`/`_*.txt`/
`_gemcrit*`/`_vers*`, the `C:…TEMP*` stray txt files, `mockups/_*`, `scripts/_*.mjs` generators,
`pw-*-out.txt`/`-run.txt`/`-result.txt`, `scripts/build-deck.mjs`/`pw-deck.mjs`, `presentation/`, `pw-shots/`,
`.playwright-mcp/`. KEEP the real drivers: `pw-prayer.mjs`, `pw-prayer-reminder.mjs`, `pw-quickadds.mjs`,
`pw-quickadd-onboard.mjs`, `pw-widget.mjs`, `pw-rewards.mjs`, `pw-sharecard.mjs`, `pw-capacity.mjs`,
`pw-townedit.mjs`, `pw-townlayouts.mjs`, `pw-celebration.mjs`, `pw-library.mjs`, `pw-weekly.mjs`,
`pw-resting.mjs`, `pw-scale.mjs`, `check-scoring.mjs` (+ `pw-memory-shot.mjs` shot tool), and committed mockups.
