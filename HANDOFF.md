# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-29 · branch `feature/civilization-world-map`._

## ▶ STATUS: v2.0.0 RELEASED (both platforms) — download works end-to-end. Website deployed.
The faith-first batch + theming + Color Recreation + quest ordering + share studio all shipped as the public
**v2.0.0** release: version bumped (was stuck at `1.14.0` across ~12 shipped features), tag `v2.0.0` pushed (auto-built
the macOS `.dmg` via GitHub Actions), Windows `.exe` built via `npm run dist`, and the **GitHub Release v2.0.0 was
published with BOTH installers, marked Latest**. `releases/latest` resolves to v2.0.0 and both download URLs serve
real bytes, so the live site's Windows + macOS buttons work. v2.0.0 is installed on this machine. Nothing blocking.
**Note:** the old v1.14.0 release (Jun 19) had only a stale Mac `.dmg`, no Windows `.exe` — that gap is now closed.
Procedure + the version-drift trap are saved in memory `questday-release-procedure`. No open errors.

### ▶ Session close-out (2026-06-29) — NEXT SESSION'S WORK IS CAPTURED, NOT BUILT
The user gave a batch of arcade + UI feedback at close. **All of it is captured in
`docs/arcade-and-ui-feedback-2026-06-29.md` — none is built.** Start there next session (one feature at a time).
**Arcade penalties — DECIDED 2026-06-29:** in-game point deduction on a wrong action (e.g. StopTap −2) **within the
round score only**, with red (penalty) / green-or-gold (gain) flash feedback. **Productivity reward world stays
gains-only** (XP/streaks/tickets/↩Restore never deducted). Build a tunable flash mockup first. Per-game targets + the
one remaining design question (penalty always-on vs advanced-mode only) are in that doc.

## Git state
- **Branch:** `feature/civilization-world-map` (repo default). **Remote:** `origin` = github.com/Ihusain5555/questday.
- **HEAD = the close-out docs commit** (this HANDOFF + `docs/arcade-and-ui-feedback-2026-06-29.md` + CLAUDE.md/skill
  lessons); **previous HEAD `ca653d3`** was pushed (in sync). Push the close-out commit to keep the resume point current.
- **This session (post-`/clear`) = release + docs ONLY. The only app-code change was the version string.** Commits newest-first:
  ```
  <close-out> docs: capture arcade+UI feedback + session close-out   (this commit)
  ca653d3 docs: Vercel renamed website→questday + record CLI rename / clean URL
  b7eaf78 docs: update HANDOFF — v2.0.0 released (both platforms), download works
  d3a11de chore(release): bump version to 2.0.0     <- ONLY code change (version string → __APP_VERSION__)
  556a234 chore: track _split-diff.cjs              <- pre-session baseline
  ```
- **Tag `v2.0.0`** (at `d3a11de`); **GitHub Release v2.0.0** = Latest, assets `QuestDay.Setup.2.0.0.exe` (Win) + `QuestDay-2.0.0-universal.dmg` (Mac, universal).
- **Stashes:** none.
- **Working tree after the doc-update commit (this close-out):**
  - **Unstaged tracked, intentionally NOT committed (PRE-EXISTING, not this session's feature work):**
    `.claude/settings.local.json` (local Claude config — leave it).
  - **Untracked NEW this session (deliberately left untracked — throwaway dev helpers, matching the `scripts/_*.mjs` convention):**
    `scripts/_extract-observances.cjs` (one-shot: pulled the research workflow's JSON → `docs/islamic-observances-*`),
    `scripts/_split-diff.cjs` (splits `git diff <file>` into per-hunk patches for per-feature commits — reusable).
  - **Untracked pre-existing keepers (unchanged from baseline — still undecided whether to track):** `mockups/*.html`,
    `scripts/_gen-*.mjs`/`_*.mjs`, `.github/*.png`, `presentation/`, root `_*.json`, `docs/*-2026-06-16.md`,
    `docs/superpowers/specs/2026-06-18-*`, `scripts/build-deck.mjs`, `scripts/pw-deck.mjs`.

### Session diff --stat (`6231a0d..HEAD`) + one-line "what & why" per file
`42 files changed, +3964 / -235`. Grouped by the commit that owns each:

**#1 prayer-aware time frames (`5ea264f`):**
```
src/shared/engine/prayerFrames.ts      | NEW  — pure resolver: a frame's prayerAnchor → effective start/end minutes from prayer times
src/shared/engine/prayerTimes.ts       | +export hijriFromGregorian (was private, #2 needs it) + new prayerDayFor() convenience
src/main/activeMode/scheduler.ts       | route all 3 resolveCurrentQuest + the activeTimeFrame call through effectiveTimeFrames
src/renderer/app/TimeFramesView.tsx     | per-frame Clock/Prayer segmented toggle + prayer-point dropdowns + no-location hint
src/renderer/app/Dashboard.tsx          | wrap db.timeFrames → effectiveTimeFrames for current-quest + active frame
src/renderer/widget/Widget.tsx          | same wrap (compute `frames` once, feed engine) so the widget agrees
src/renderer/widget/WidgetList.tsx      | resolve frames for the "active now" detection
src/renderer/app/FocusView.tsx          | wrap the selectCurrentQuest call
src/renderer/app/ActiveModeSettings.tsx | wrap the selectCurrentQuest call
src/renderer/app/EisenhowerView.tsx     | wrap the selectCurrentQuest call
src/renderer/app/QuestsView.tsx         | wrap for activeFrameId + currentQuest highlight (+ #3's bundlesOn/panel render ride along)
src/main/db/store.ts                    | validate(): reject a malformed TimeFrame.prayerAnchor on the write path
src/shared/types.ts                     | + PrayerAnchorPoint type + TimeFrame.prayerAnchor (+ #3's Bundle types ride this hunk)
src/renderer/styles.css                 | .tf-anchor-toggle / .tf-seg / .tf-prayer-select / .tf-anchor-hint
scripts/pw-prayer-frames.mjs            | NEW driver: engine math (RESOLVE_SHIFT/END_OMITTED/FALLBACK) + UI toggles + DB accept
```
**#2 Hijri date + observance calendar + notifications (`fc3235d`):**
```
src/shared/engine/observances.ts        | NEW pure engine: Hijri date, fastingRuling(), observancesOn(), upcomingObservances() + the forbidden-fast guardrail
src/renderer/app/CalendarView.tsx        | NEW feature-gated tab: Hijri date, today's fasting ruling, upcoming observances list
src/main/observance/notify.ts            | NEW main-process daily system notification for a notable observance (opt-in)
src/main/index.ts                        | startObservanceNotifier(getDatabase, persist last-notified) in whenReady
src/renderer/app/App.tsx                 | add the 'observanceCalendar' tab (id === feature id so the toggle can hide it)
src/renderer/app/DataView.tsx            | FEATURE_ICON += CalendarStar (+ Stack for #3 rides along)
src/renderer/app/features.ts             | TOGGLEABLE_FEATURES += observanceCalendar (faith TAB, OFF by default)
src/shared/types.ts                      | Settings += observanceNotify? + observanceLastNotified?
src/shared/defaults.ts                   | seed observanceNotify:false, observanceLastNotified:null, enabledFeatures.observanceCalendar:false
src/renderer/styles.css                  | .cal-* / .obs-* calendar styles (this hunk also carries #3 bundles + #4 eod CSS)
docs/islamic-observances-reference.md    | NEW durable authentic-source reference (Quran + Sahih Sunnah, adversarially verified)
docs/islamic-observances-forbidden-fasts.json | NEW machine list of forbidden/disliked fast days (the guardrail data)
scripts/pw-observances.mjs               | NEW driver: 365-day guardrail scan + Eid/Arafah rulings + the Calendar tab UI
```
**#3 Quest Bundles (`31615a7`):**
```
src/renderer/app/QuestBundlesPanel.tsx   | NEW panel in the Quests tab: save current quests / apply / delete a named bundle
src/shared/types.ts                      | + BundleQuest + QuestBundle interfaces + Database.questBundles key
src/shared/defaults.ts                   | seed questBundles: []
src/main/db/store.ts                     | migrate() tolerant + validate() strict for the new questBundles key
src/renderer/state/store.ts              | createBundle / createBundleFromActive / applyBundle / deleteBundle actions
src/renderer/app/features.ts             | TOGGLEABLE_FEATURES += questBundles (sub-section, default ON)
scripts/pw-bundles.mjs                   | NEW driver: save / apply / delete + DB-accept + rewards-exact
```
**#4 end-of-day wind-down (`a7c3dce`):**
```
src/renderer/app/EndOfDayCard.tsx        | + today's-wins recap (derived) + "rest open quests until tomorrow" button
src/renderer/state/store.ts              | pushUnfinishedToTomorrow() — snooze every active quest to next local midnight
scripts/pw-winddown.mjs                  | NEW driver: wins recap + push action + rewards-exact
```
**chore (`3ba33ed`):** `package.json` — register pw:prayer / pw:prayer-frames / pw:winddown / pw:bundles / pw:observances.
**site (`aa7db2f`):** `website/` — Next.js 14 App Router landing page (faithful port of the approved mockup), deployed.
**docs (`3fea82b` + this close-out):** `HANDOFF.md`, `CLAUDE.md`, the two `.claude/skills/*` SKILL.md.

## Baseline (last-known PASS — DO NOT re-derive; Electron drivers are slow + single-instance)
**Re-verified 2026-06-29 (release gate, via subagent):** `npm run typecheck` → PASS (node + web), `npm run build` → PASS,
`npm run pw:rewards` → **7/7 ALL PASS** (↩Restore exactness), no dev-asset PNG leaked into `out/`. Only code change this
session was the version string, so the per-driver results below still hold.
Recorded from the prior (faith-batch) session's runs against the BUILT `out/` (each after `npm run build`):
- `npm run typecheck` → **PASS** (node + web), re-run green after every feature.
- `npm run build` → **PASS** (electron-vite).
- `npm run pw:prayer-frames` → **9/9 ALL PASS** (RESOLVE_SHIFT, END_OMITTED, FALLBACK, ISOLATION, DB_ACCEPTS, UI_PICKERS, ACTIVE_NOW, TOGGLE_CLOCK, TOGGLE_PRAYER).
- `npm run pw:observances` → **7/7 ALL PASS** — incl. `GUARDRAIL_YEAR: forbiddenDays=5, ruleMismatches=0, fastSuggestedOnForbidden=0` (365-day scan).
- `npm run pw:bundles` → **7/7 ALL PASS**.
- `npm run pw:winddown` → **5/5 ALL PASS**.
- `npm run pw:rewards` → **7/7 ALL PASS** (↩Restore exactness — the 3 new schema keys never touch reward math). Re-run green after the schema adds.
- `website/`: `npm run build` (inside website/) → **PASS** (static `/` + `/_not-found`).
- **Pre-existing INTENTIONAL non-pass (NOT regressions):** `pw:realm` + the expedition assertion in `pw-celebration` only pass with `REALM_COMING_SOON` flipped `false` (the Realm/civ is gated behind a Coming-Soon wall by design).

## Verbatim currently-failing output
**NONE.** No failing test or open error at close. Everything above passed; nothing is mid-broken.

## Deployed
- **Vercel production (live, public):** `https://questday-ihusain5556.vercel.app` (HTTP 200). The old
  `https://website-virid-six-hmzgotbvpo.vercel.app` still aliases to the same deployment (200) — no breakage.
- Project **renamed `website`→`questday`** (2026-06-29, via `vercel project rename` — CLI v54 supports it), account
  scope `ihusain5556`, latest prod deployment id `dpl_6QQMgndyULGw1bJHdKDxp6DauLE9`. (`questday.vercel.app` bare name is taken.)
- The deployment-specific `questday-<hash>-…vercel.app` URL is 302→SSO (Vercel default Deployment Protection); the
  production ALIASES above are the public ones. CLI was already authed (`vercel whoami` → ihusain5555).

## Next steps — file-level targets (pick per priority)
**PRIMARY — process `docs/arcade-and-ui-feedback-2026-06-29.md`** (per-file targets + open questions are in it):
- **Arcade:** RESOLVE the tone-rule decision FIRST (penalties vs tone-compatible stakes); then Track Switch guide-lines
  (`TrackSwitch.tsx`), Aim-Trainer Reflex-mode `lifeMs` (`AimTrainer.tsx`), Mental Spin "mirror" clarity
  (`MentalSpin.tsx`), Flash Recall redesign + the still-TODO research (`FlashRecall.tsx`).
- **UI/feature:** End-of-day "+more" alignment (`EndOfDayCard.tsx`), Dashboard Realm↔Your-Week spacing (`Dashboard.tsx`),
  mixed prayer/clock time-frame anchors (`types.ts`/`prayerFrames.ts`/`TimeFramesView.tsx` — SCHEMA change), observance
  White-Days dedup (`observances.ts`/`CalendarView.tsx`).

Lower-priority / optional (carried over, none blocking):
1. ~~Publish GitHub Release~~ **DONE** (v2.0.0, both installers). Optional: one-click direct-download links (tradeoff: brittle per-release vs the robust `releases/latest` page).
2. ~~Rename Vercel project~~ **DONE** (`questday`, redeployed; clean URL live).
3. **(If wanted) auto-deploy on push:** connect the GitHub repo in Vercel, Root Directory = `website` (currently CLI-deployed only).
4. **Custom domain** for the site (a purchase → stop-and-confirm).

## Open / deferred
- **No code TODO/FIXME added this session** (swept `556a234..HEAD` — zero matches; session was docs + a version bump only).
- **✅ DECIDED (arcade penalties):** in-game point deduction + red/green-gold flash, **arcade-score-only**; productivity
  rewards stay gains-only. Recorded in CLAUDE.md tone rule + `docs/arcade-and-ui-feedback-2026-06-29.md`.
- **Captured-but-not-built (this session's feedback):** the full arcade + UI batch in `docs/arcade-and-ui-feedback-2026-06-29.md`.
- **Open questions for the user (in that doc):** arcade penalty always-on vs advanced-mode only; Mental Spin = mirror-only / rotation-only / both.
- **Deferred by decision (unchanged):** Ramadan mode (~Dec 2026 / ~2mo before Ramadan 2027); Qibla (CUT — no desktop
  compass); civ/Realm deep roadmap (PARKED behind Coming-Soon); installer code-signing (needs a paid cert); Microsoft
  Store (~$19, before distributing); a paid human security review (when real users appear).
- **Done this session (were deferred):** GitHub Release v2.0.0 (both installers); Vercel rename + clean URL.
- **Untracked decision (unchanged):** whether to `git add` the pre-existing untracked keepers + the 2 new `_*.cjs`
  helpers, and whether to commit the pre-existing `.claude/settings.local.json` edit.
- **Two accepted commit ride-alongs (noted in the commit bodies):** the `BundleQuest`/`QuestBundle` *type defs* sit in
  #1's `types.ts` hunk (adjacent to PrayerAnchorPoint); the wind-down + bundles *CSS* sit in #2's `styles.css` hunk.
  Logic for each landed in its own commit. Caused by contiguous additions that can't be hunk-split incrementally.

## Resume commands (offline; no env vars / services / network needed for the APP)
```powershell
npm install          # only if node_modules missing (OneDrive electron-binary gotcha → shipping-and-gotchas skill)
npm run build        # compile to out/ — REQUIRED before any pw driver
npm run typecheck    # tsc node + web — run before "done"
npm run dev          # live app (exits 127 => OneDrive electron gotcha; fallback: npm run start)
# pw drivers — QUIT any running QuestDay first (single-instance lock); all use an isolated --user-data-dir:
#   Get-Process QuestDay,electron | Stop-Process -Force   # then relaunch the installed app after
npm run pw:prayer-frames   # prayer-anchored frames
npm run pw:observances     # Hijri/observance calendar + the forbidden-fast guardrail
npm run pw:bundles         # Quest Bundles
npm run pw:winddown        # end-of-day wind-down
npm run pw:rewards         # ↩Restore exactness — run after ANY schema/save change
```
Website (separate Next.js project; needs network for install/deploy):
```powershell
cd website ; npm install ; npm run build        # static landing page
npx vercel --prod --yes                          # deploy (CLI already authed as ihusain5555)
```
Redirect verbose pw output to `/tmp/x.txt` (POSIX) or a gitignored `*-out.txt` — NOT `C:\temp\…` (mojibake repo-root file).
