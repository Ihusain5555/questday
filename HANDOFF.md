# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-17 · branch `feature/civilization-world-map` · **v1.12.0** · HEAD `da00970` (PUSHED) · tag `v1.12.0`._

## ▶ STATUS: v1.12.0 SHIPPED — both new features done, no active task

Both 2026-06-17 feature requests are **built, audit-hardened, verified, committed, pushed, and shipped**
as a public macOS Release: https://github.com/Ihusain5555/questday/releases/tag/v1.12.0 (no-login `.dmg`).
- **Request A — prayer-time Salah** (`e1bbe86` foundation + `f57709d` UI/store/audit-fixes): five separate
  daily prayer quests (Fajr/Dhuhr/Asr/Maghrib/Isha), each due at its window-close time for the user's city
  (Isha = Islamic midnight). On-device PrayTimes math (NO API, zero deps), city list + manual coords, ISNA
  default + method/Asr picker, `setPrayerSettings` restamps on change, each prayer placed in its real time
  frame, 10 min → the locked 2 XP. `pw-prayer` 12/12, `pw:rewards` 7/7 (↩ Restore exact).
- **Request B — segmented capacity bar** (`f9449f8`): each quest a time-proportional segment + soft over-cap
  hatch. Pure-derived, no schema. `pw-capacity` 4/4. Mockup `mockups/capacity-segments.html` (Variant A).
- **Adversarial audit** (workflow `wf_629ff235`, 39 agents): 25 confirmed / 7 refuted; the 9 actionable
  issues fixed in `f57709d` (XP regression, frame-pinning, settings-change restamp, wayfinding copy, engine
  crash-guard, restamp gating, deleted obsolete `pw-faith.mjs`).

## Next options (no active task — the user's move; nothing required)
1. **Visual test** in `npm run dev` (the user's own acceptance gate — see "How to test" below). NOT yet done in-app.
2. **Faith-copy Islamic-Center sign-off** before wide promotion — copy lives in `QuestsView.tsx` (faith card,
   ~line 157) + `DataView.tsx` (`PrayerSettings`, method/asr labels). Opt-in/off-by-default; audit found tone correct.
3. **(deferred enhancement) Widget "due-soon" promotion** — the current-quest scorer ignores `dueAt`, so a
   prayer doesn't auto-rise as its time nears (it surfaces within its frame by score, matching the locked
   "due-times only" scope). To add: a bounded due-soon urgency term in `scoreQuest()` in
   `src/shared/engine/selectCurrentQuest.ts` + a tunable in `src/shared/config/balance.ts`. Affects ALL quests.
4. **(polish) Seasonal frame drift** — prayer quests keep their seed-day time frame; to follow seasonal
   shifts, re-evaluate `frameForTime` for prayer quests in the daily restamp loop in
   `src/renderer/state/store.ts` (the renew-path `db.quests.map`, ~line 813).

## Git state
- branch `feature/civilization-world-map`, HEAD **`da00970`**, **fully PUSHED** (origin up to date), tag
  `v1.12.0` pushed. No stashes.
- **Only uncommitted tracked file: `.claude/settings.local.json`** (personal `WebSearch` permission —
  intentionally not committed). Untracked = throwaway (see bottom); none is source.
- This-session commits: `6c4acf6`/`e897feb` (close-out docs) · `d34b2b0` (v1.11.0 bump → public v1.11.0
  release) · `b70ab64` (prayer spec) · `e1bbe86` (prayer foundation) · `f57709d` (prayer UI+audit fixes) ·
  `f9449f8` (capacity bar) · `da00970` (v1.12.0 bump + docs → public v1.12.0 release).

## Session diff --stat + why (`be4dd14..HEAD`, 19 files, +1781/-304)
- `src/shared/engine/prayerTimes.ts` (NEW 166) — pure on-device prayer-time math (PrayTimes astronomy).
- `src/shared/data/cities.ts` (NEW 184) — ~140-city offline lat/lon table + `findCity()`.
- `src/shared/types.ts` (+18) / `defaults.ts` (+6) — additive `settings.prayerTimes` schema + seed.
- `src/renderer/state/store.ts` (+140) — `addFaithChecklist` rewrite, `prayerDayInfo`/`frameForTime`,
  `setPrayerSettings`, daily `dueAt` restamp (gated to all-7-day recurring quests).
- `src/renderer/app/DataView.tsx` (+114) — `PrayerSettings` panel (city/method/Asr).
- `src/renderer/app/QuestsView.tsx` (+54) — 3-state faith card + segmented capacity bar.
- `src/renderer/styles.css` (+89) — `.prayer-settings` + `.capacity-seg`/`.capacity-over` styling.
- `scripts/pw-prayer.mjs` (NEW 267) / `scripts/pw-capacity.mjs` (NEW 127) — drivers; `pw-faith.mjs` DELETED (obsolete).
- Docs: prayer spec (NEW 93), `mockups/capacity-segments.html` (NEW 188), codebase-overview skill (+119),
  `CLAUDE.md` (+49), this HANDOFF, civ spec (+1), `package.json`/`-lock` (version 1.12.0).

## Baseline (no source changed since — these still hold)
- `npm run typecheck` → **PASS** · `npm run build` → **PASS** (~7s). No open errors.
- Drivers (all green): `pw-prayer` 12/12 · `pw-capacity` 4/4 · `pw:rewards` 7/7 (↩ Restore exact) ·
  `pw-library` 12/12 · `pw-scale` pass.

## Resume / verification commands
- `npm install` only on a fresh clone (OneDrive npm download gotcha — see memory `v1-9-0-audit-release`).
- `npm run dev` (live) · `npm run build` (→ `out/`, do this before any pw driver) · `npm run typecheck`.
- Drivers run the built `out/` in an isolated `--user-data-dir` (never the real `db.json`); kill stray
  `electron`/`QuestDay` first. `node scripts/pw-prayer.mjs`, `node scripts/pw-capacity.mjs`,
  `npm run pw:rewards`, `node scripts/pw-library.mjs`, plus `pw:eisenhower`/`pw:realm`/`pw:rollover`/
  `pw:arcade`/`pw:timeboxing`, `node scripts/pw-townedit.mjs`.
- Test-output hook collapses PASS/FAIL → redirect to a temp file and `Read` it, or use the `test-runner` agent.
- macOS installer: bump `package.json`, `git tag vX.Y.Z`, `git push origin vX.Y.Z` (fires `build-macos.yml`),
  `gh run watch <id> --exit-status` (background on Windows) → `gh run download <id> -n questday-mac-dmg`
  → `gh release create vX.Y.Z <dmg> --notes-file … --latest`. Detail: memory `mac-build-pipeline`.

## How to test (for the user, beginner steps)
1. `npm run dev` → **Data** tab (gear) → turn on **Salah & Qur'an checklist** → a prayer panel appears →
   pick your **city** + method.
2. **Quests** tab → the gold card says ready → **Add to my quests** → five prayer quests appear, each with a
   real **due time**, spread across the correct time frames; plus an optional **Read Qur'an** quest.
3. Any frame with quests → the **capacity bar** shows each quest as a colored time-slice (hover for its name).
4. On a Mac: download the v1.12.0 `.dmg`, right-click → **Open → Open Anyway** (one time, unsigned).

## Open / deferred
- **Faith-copy Islamic-Center sign-off** (option 2 above) — opt-in/off-by-default; review before wide promotion.
- **Widget due-soon promotion** + **seasonal frame drift** (options 3 & 4 above) — file-level targets noted.
- **Umm al-Qura Ramadan 120-min Isha** — engine uses the standard 90-min year-round (spec defers Ramadan).
- **AI/hero-art upgrade** for the civilization (style-lock / commissioned hero map) — explicitly DEFERRED.
- **Town-editing live-trial feedback** (user tried `4ead7e7`): tile-rejects-drop (likely Hall centre, by design);
  "deformed" buildings (lowest priority); **panel + drag-in model** as an optional layer. Detail: [[town-editing-v1]].
- **Schema-gated quick-adds** (each = stop-and-confirm): snooze (`snoozedUntil`), quest notes, end-of-day note.
- **Backlog (parked):** Quest Library Bundles + morning prompt; Pipe Connect minigame + unlock tiers (mockup-first);
  Qibla / Hijri; world-map markers that develop with each town's stage.
- **Celebration/XP WIP** in `4ead7e7` runs (`pw-celebration` passes) but flagged "interim".

## Architecture reference (durable)
- **Prayer times (v1.12):** pure engine `prayerTimes.ts` + data `cities.ts`; settings `prayerTimes` is additive
  + optional + **never read by rewards/civilization → ↩ Restore exact**. Prayer quests are ORDINARY quests
  matched by stable title (`FAITH_PRAYER_TITLES`); `dueAt` restamped daily (gated to 7-day recurring). Full
  detail in the **codebase-overview** skill (prayerTimes.ts entry + the XP-from-`timeEstimateMinutes` and
  widget-scoring landmines).
- **Quest Library (v1.11):** `questTemplates` top-level db key, wholesale-replaced, tolerant migrate, validate
  rejects malformed; never read by civ/rewards. Drag uses MIME `application/x-questday-template`.
- The **sealed-key + never-read-by-rewards** pattern is the template for every new optional feature.

## Throwaway (untracked; delete only with user OK — stop-and-confirm)
Root PNGs (`biome-*`/`town-*`/`tb-*`/`tp-*`/`edit-*`/`cadence-*`/`halls-*`/`share-card-mockup.png`/
`capacity-segments-mockup.png`), `_*.json`/`_*.txt`/`_gemcrit*`/`_vers*`, the `C:…TEMP*` stray txt files,
`mockups/_*`, `mockups/quest-library-{a,c}.html`, `scripts/_*.mjs` generators, `pw-*-out.txt`/`-run.txt`/
`-result.txt`, `scripts/build-deck.mjs`/`pw-deck.mjs`, `presentation/`, `pw-shots/`, `.playwright-mcp/`.
KEEP the real drivers: `pw-prayer.mjs`, `pw-capacity.mjs`, `pw-townedit.mjs`, `pw-townlayouts.mjs`,
`pw-celebration.mjs`, `pw-library.mjs`, `pw-weekly.mjs`, `pw-resting.mjs`, `pw-scale.mjs`, `pw-sharecard.mjs`,
and committed mockups (`capacity-segments.html`, `town-edit-*.html`, `quest-library-b.html`, `share-card.html`).
