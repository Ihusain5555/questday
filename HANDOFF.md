# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-29 · branch `feature/civilization-world-map`._

## ▶ STATUS: Arcade + UI feedback batch BUILT, VERIFIED & COMMITTED (5 commits on top of v2.0.0)
All 9 items from `docs/arcade-and-ui-feedback-2026-06-29.md` are shipped in source and committed (per-feature) on
`feature/civilization-world-map`. **Verified green:** `typecheck` PASS · `build` PASS · `pw:arcade` 20/20 ·
`pw:observances` 8/8 · `pw:rewards` 7/7 (↩Restore exact) · `pw:prayer-frames` 9/9. **Commits are LOCAL ONLY — NOT
pushed, NOT released** (still v2.0.0 on GitHub/site). A live `npm run dev` was launched for the user to test the feel.
Nothing is broken or mid-flight.

**What shipped (each = a commit):**
1. `c428cb2` Arcade score-flash juice — `ScoreFlash.tsx` (`useScoreFlash`) + `balance.arcade.feedback`; penalties ALWAYS-ON,
   arcade-score-only (XP/streaks/tickets/↩Restore never touched). Wired StopTap/ColorClash/AimTrainer (−2) + ReactionTime (visual).
2. `c21f977` Flash Recall → **Memory Matrix** (parallel grid-flash; staircase-down, clock-bounded, no lives) + Reflex lifeMs 1200→700.
3. `dad6f51` Track Switch (remove guide line + next-node glow) + Mental Spin ("Same"→"Same shape" + persistent prompt).
4. `95e4cf0` UI: EOD "+ more" align · Dashboard `.realm-soon-peek` 16px margin · White Days collapse (`observances.ts`).
5. `1be0580` **Time-frames mixed prayer/clock anchors (SCHEMA)** — `TimeFrame.startAnchor`/`endAnchor`; legacy `prayerAnchor`
   auto-migrated (`store.ts`); per-side `BoundEditor`; `prayerFrames.ts` resolves each side independently.
6. (this) `docs:` close-out — HANDOFF + feedback doc + codebase-overview skill + CLAUDE.md lessons.

## Git state
- **Branch:** `feature/civilization-world-map` (repo default). **Remote:** `origin` = github.com/Ihusain5555/questday.
- **HEAD = the docs close-out commit (#6 above).** The 5 feature commits + this docs commit are **AHEAD of `origin` and
  UNPUSHED** (push is a stop-and-confirm). Commits newest-first:
  ```
  <docs>  docs: arcade+UI batch close-out (HANDOFF, skill, CLAUDE.md)   (this commit)
  1be0580 feat(frames): independent per-side prayer/clock anchors (schema)
  95e4cf0 fix(ui): EOD '+ more' align, dashboard Realm spacing, White Days collapse
  dad6f51 fix(arcade): Track Switch find-it-yourself + Mental Spin mirror clarity
  c21f977 feat(arcade): Flash Recall -> Memory Matrix (+ Reflex lifeMs)
  c428cb2 feat(arcade): shared score-flash juice + wire 4 games
  942710f docs: arcade penalties DECIDED (pre-batch baseline; pushed/in-sync with origin)
  ```
- **Tag `v2.0.0`** (at `d3a11de`); GitHub Release v2.0.0 = Latest with both installers. No new tag yet.
- **Stashes:** none.
- **Working tree after the docs commit:** only `.claude/settings.local.json` (pre-existing local config — leave it) +
  long-standing untracked dev files (`mockups/*.html`, `scripts/_*.mjs`/`_*.cjs`, `.github/*.png`, `presentation/`,
  root `_*.json`, `docs/*-2026-06-16.md`, `mockups/arcade-flash-mockup.html` ← the approved flash tuner). None are this
  batch's product code; all of it is committed.

## Session diff --stat (`942710f..HEAD`, feature commits only) + one-line "what & why" per file
`17 files changed, +817 / −356`.
```
src/renderer/app/arcade/ScoreFlash.tsx        | NEW — useScoreFlash hook + overlay: red/gold flash, ±N popup, shake, ~180ms anti-strobe throttle
src/renderer/app/arcade/games/StopTap.tsx     | STOP tap = −2 (award() now floors at 0) + red flash; GO/withhold = gold gain
src/renderer/app/arcade/games/ColorClash.tsx  | wrong ink = −2 + red flash; gains keep existing +1 juice (fast cadence → would strobe)
src/renderer/app/arcade/games/AimTrainer.tsx  | miss (click empty field, e.target===currentTarget) = −2 + red flash; gains unchanged
src/renderer/app/arcade/games/ReactionTime.tsx| early jump = red flash + shake (NO deduction; score is reaction ms); gold on a good click
src/renderer/app/arcade/games/FlashRecall.tsx | FULL REWRITE → Memory Matrix (flash a set, tap back any-order, level up; wrong = drop a level)
src/renderer/app/arcade/games/TrackSwitch.tsx | remove guide-line SVG + ts-next glow (Trail-Making B search is the skill: find it yourself)
src/renderer/app/arcade/games/MentalSpin.tsx  | "Same"→"Same shape" + persistent "rotated — same or mirror?" prompt + intro rewrite
src/shared/config/balance.ts                  | + arcade.feedback tunables; flashrecall → Memory-Matrix tiers; aim.modes.reflex lifeMs 1200→700
src/renderer/styles.css                       | score-flash + Memory-Matrix CSS (one contiguous hunk); .tf-bounds; .realm-soon-peek margin; .eod-wins-more align
src/shared/engine/observances.ts              | upcomingObservances(): collapse the monthly White-Days run (13–15) to ONE upcoming entry
src/shared/types.ts                           | TimeFrame.startAnchor/endAnchor (per-side); prayerAnchor @deprecated (migrated)
src/shared/engine/prayerFrames.ts             | anchorsOf() + effectiveFrame resolve EACH side independently (legacy prayerAnchor still honored)
src/main/db/store.ts                          | migrateFrameAnchor (legacy prayerAnchor → start/endAnchor) + validate the new per-side fields
src/renderer/app/TimeFramesView.tsx           | per-side BoundEditor (each edge clock-or-prayer) replaces the whole-frame Clock/Prayer toggle
scripts/pw-arcade.mjs                         | drive the Memory Matrix via data-lit test hook + wait-for-cards (ARCADE_CARDS_TEST flaked at fixed 400ms)
scripts/pw-prayer-frames.mjs                  | seed/assert startAnchor/endAnchor + NEW MIXED engine check; per-side toggle selectors
```

## Baseline (last-known PASS — re-verified THIS session against the BUILT `out/`; DON'T re-derive, Electron drivers are slow + single-instance)
- `npm run typecheck` → **PASS** (node + web). `npm run build` → **PASS** (electron-vite).
- `npm run pw:arcade` → **20/20 PASS** (all 11 games launch+play incl. Memory Matrix; ARCADE_CARDS_TEST 11/11).
- `npm run pw:observances` → **8/8 PASS** — `GUARDRAIL_YEAR: forbiddenDays=5 ruleMismatches=0 fastSuggestedOnForbidden=0`.
- `npm run pw:rewards` → **7/7 PASS** — `RESTORE_REVERSAL_TEST: xp=80 (want 80) level=1 currency=0` (↩Restore exact across the schema add).
- `npm run pw:prayer-frames` → **9/9 PASS** — RESOLVE_SHIFT, END_OMITTED, MIXED, FALLBACK, ISOLATION, DB_ACCEPTS, UI_PICKERS, TOGGLE_CLOCK, TOGGLE_PRAYER (ACTIVE_NOW conditional/skips outside the window).
- **Pre-existing INTENTIONAL non-pass (NOT regressions):** `pw:realm` + the expedition assertion in `pw-celebration` only pass with `REALM_COMING_SOON` flipped `false` (the Realm/civ is gated behind Coming-Soon by design).

## Verbatim currently-failing output
**NONE.** No failing test or open error at close.

## Deployed (unchanged this session — still v2.0.0)
- **Vercel production:** `https://questday-ihusain5556.vercel.app` (200); old `…website-virid-six…` still aliases (200).
  Project renamed `website`→`questday` (scope `ihusain5556`). CLI authed (`vercel whoami` → ihusain5555).
- GitHub Release **v2.0.0** is still Latest. **This batch is not released** — the live app/site do not yet have it.

## Next steps — file-level targets (pick per priority)
- **Test the batch:** `npm run dev` (already launched) → Arcade (StopTap red −2 / gold +1, Flash Recall = Memory Matrix),
  Time frames (per-side clock/prayer anchors), Dashboard/EOD spacing, Calendar Upcoming (White Days collapsed).
- **Push** (stop-and-confirm): `git push origin feature/civilization-world-map` — the 6 commits are local only.
- **Release v2.1.0** (when the user wants it on the site): bump `package.json` version → tag `v2.1.0` (CI builds the Mac
  `.dmg`) → `npm run dist` (Win `.exe`) → `gh release create v2.1.0 … --latest` with BOTH installers. Procedure + the
  version-drift trap → memory `questday-release-procedure`.
- **Optional design revisits (flagged, no rush):** add a gold gain-flash to the fast games (Aim/ColorClash) if the strobe
  risk is acceptable (`ScoreFlash` throttle already guards it); restore the Track Switch next-node glow if it plays too hard
  (`TrackSwitch.tsx`); an in-round Reflex lifeMs ramp (`AimTrainer.tsx` + a `balance` floor); extend the White-Days collapse
  to Tashreeq's 3 days (`observances.ts`).
- **Lower-priority carryovers (none blocking):** site auto-deploy on push (connect repo in Vercel, root `website`); custom
  domain (a purchase → stop-and-confirm).

## Open / deferred
- **No code TODO/FIXME added this session** (swept `942710f..HEAD` — zero matches).
- **Two accepted commit ride-alongs** (noted in the commit bodies, caused by contiguous additions that can't be hunk-split):
  the **Memory-Matrix CSS** sits in `c428cb2`'s `styles.css` hunk (logic in `c21f977`); the **Reflex lifeMs** change sits in
  `c21f977`'s `balance.ts` hunk (it's the same hunk as the flashrecall config).
- **Design calls made under batch mode (revisitable — full list in the feedback doc's BUILT header):** penalties always-on;
  ColorRecreation excluded from penalties (graded slider); FlashRecall staircase-down not lives (tone rule); Mental Spin keeps
  rotation-always + mirror-or-not (relabeled, not re-scoped).
- **Deferred by decision (unchanged):** Ramadan mode (~Dec 2026, ~2mo before Ramadan 2027); Qibla (CUT — no desktop compass);
  civ/Realm deep roadmap (PARKED behind Coming-Soon); installer code-signing (needs a paid cert); Microsoft Store (~$19);
  paid human security review (when real users appear).
- **Untracked dev files (unchanged):** still undecided whether to track `mockups/*.html` (incl. `arcade-flash-mockup.html`),
  `scripts/_*.mjs`/`_*.cjs`. Left untracked, matching convention.

## Resume commands (offline; no env vars / services / network needed for the APP)
```powershell
npm install          # only if node_modules missing (OneDrive electron-binary gotcha → shipping-and-gotchas skill)
npm run build        # compile to out/ — REQUIRED before any pw driver
npm run typecheck    # tsc node + web — run before "done"
npm run dev          # live app (exits 127 => OneDrive electron gotcha; fallback: npm run start)
# pw drivers — QUIT any running QuestDay first (single-instance lock); all use an isolated --user-data-dir:
#   Get-Process QuestDay,electron | Stop-Process -Force
npm run pw:arcade          # ALL 11 games launch+play (incl. Memory Matrix) + ARCADE_CARDS_TEST
npm run pw:prayer-frames   # per-side prayer/clock anchors (RESOLVE_SHIFT/END_OMITTED/MIXED/FALLBACK + UI)
npm run pw:observances     # Hijri/observance calendar + the forbidden-fast guardrail
npm run pw:rewards         # ↩Restore exactness — run after ANY schema/save change
```
Website (separate Next.js project; needs network for install/deploy):
```powershell
cd website ; npm install ; npm run build        # static landing page
npx vercel --prod --yes                          # deploy (CLI already authed as ihusain5555)
```
Redirect verbose pw output to `/tmp/x.txt` (POSIX) or a gitignored `*-out.txt` — NOT `C:\temp\…` (mojibake repo-root file).
