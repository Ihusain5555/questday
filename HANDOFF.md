# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-28 · branch `feature/civilization-world-map`._

## ▶ STATUS: BUILD session COMPLETE (batch mode). All 5 faith slices built + verified; website built. Only the Vercel DEPLOY remains (needs the user's one-time `vercel login`).
The user enabled **batch mode** and asked to finish the whole agenda. Done this session (each plan→build→verify, schema
adds confirmed up-front in one approval):
- **#1 Prayer-aware time frames** — `TimeFrame.prayerAnchor` (schema); pure `engine/prayerFrames.ts` resolves a frame's
  effective window from prayer times; every selection call site routes through `effectiveTimeFrames`; per-frame Clock/Prayer
  toggle in TimeFramesView. Driver `pw:prayer-frames` ALL PASS.
- **#2 Hijri date + observance calendar + notifications** — pure `engine/observances.ts` (forbidden-fast guardrail), a
  feature-gated **Calendar** tab (`CalendarView`, toggle `observanceCalendar`, OFF by default), a main-process
  `observance/notify.ts` daily system notification (`settings.observanceNotify`/`observanceLastNotified` schema). Authentic-
  source research persisted to `docs/islamic-observances-reference.md` + `docs/islamic-observances-forbidden-fasts.json`.
  Driver `pw:observances` ALL PASS (incl. a 365-day guardrail scan: 0 fast-suggestions on forbidden days).
- **#3 Quest Bundles** — top-level `questBundles` key (schema); `BundleQuest`/`QuestBundle` types; store
  createBundle/createBundleFromActive/applyBundle/deleteBundle; `QuestBundlesPanel` in the Quests tab (toggle `questBundles`).
  Driver `pw:bundles` ALL PASS.
- **#4 End-of-day Wind-Down** — finished `EndOfDayCard`: today's-wins recap + `pushUnfinishedToTomorrow` (snooze to next
  midnight, gains-only). Driver `pw:winddown` ALL PASS.
- **#5 Export/import + restore** — was ALREADY BUILT (portable.ts + ipc/backup.ts + DataView UI). Verified, no change.
- **#6 Arcade depth modes** — ALREADY BUILT (all 11 games ship simple + advanced difficulty modes). Verified, no change.
- **#7 Website** — real Next.js app in `website/` (Next 14.2.35, App Router, faithful port of the approved mockup;
  download buttons → GitHub Releases latest). `npm run build` green. **NOT deployed** — needs `vercel login` (user) then
  `vercel --prod` from `website/`.

`pw:rewards` (↩Restore exactness) stayed ALL PASS throughout — the 3 new schema keys never touch reward math.
**Remaining:** deploy the website to Vercel (user `vercel login`), then optionally commit/push the branch (user's call —
git push is stop-and-confirm). NOTE: HANDOFF's old "Next steps" + "Open" sections below are now HISTORICAL.

Durable decision record = the memory file `questday-pivot-muslim-productivity` (~/.claude memory).

## The pivot in one line
QuestDay → **"the private, calm DESKTOP deep-work companion that structures your focused work around the five daily
prayers."** Faith layer becomes the CORE (keep ALL generic features too); civ parked behind Coming Soon; arcade gets
optional depth modes; free forever; local-only stays absolute.

## Git state
- **Branch:** `feature/civilization-world-map` (repo default). **Remote:** `origin` github.com/Ihusain5555/questday.
- **Staged:** none. **Stashes:** none. **Origin HEAD = `6231a0d`** (nothing committed this session).
- **Unstaged (tracked) — PRE-EXISTING, not this session, intentionally left:** `.claude/settings.local.json`,
  `.claude/skills/shipping-and-gotchas/SKILL.md`.
- **Modified THIS session (docs only — this close-out):** `HANDOFF.md`, `CLAUDE.md`,
  `.claude/skills/codebase-overview/SKILL.md`.
- **Untracked NEW this session:** `mockups/website-mockup.html` (landing-page mockup, user-approved).
- **Untracked pre-existing keepers:** `docs/*.md`, other `mockups/*.html`, `presentation/`, `scripts/_*.mjs`,
  `.github/*.png`, root `_*.json` — unchanged from commit 6231a0d's handoff.
- **Memory (outside repo, ~/.claude):** new `questday-pivot-muslim-productivity.md` + a `MEMORY.md` index line.

### Session diff --stat (tracked) + one-line "what & why"
```
 HANDOFF.md                                 | rewritten  — this resume kit (pivot + faith-first build plan)
 CLAUDE.md                                  | +section   — record the strategic pivot + the stale-docs lesson
 .claude/skills/codebase-overview/SKILL.md  | +gotchas   — verified built/not-built map, stale-docs landmine, dedup a repeated note
 mockups/website-mockup.html                | new (untracked) — approved offline landing-page mockup
```
`git diff --stat` for tracked **source** is EMPTY this session (no `src/` change).

### Last commits (origin at 6231a0d)
```
6231a0d docs: rewrite HANDOFF resume-kit + record session tooling lessons   <- origin HEAD
44dc0f1 chore: gitignore regenerable test-output dumps + root preview PNGs
4f7b374 docs: record backlog-batch conventions + resume kit
6829604 fix(arcade): register Flash Recall / Track Switch taps on pointerdown
eae4916 feat(widget): Show-widget button is now a Show/Hide toggle
```

## Baseline (DON'T re-derive — no code changed this session)
- **No `src/` runtime code changed**, so the last-known baseline still holds; NOT re-run (Electron drivers are slow +
  single-instance). Last-known PASS from commit 6231a0d's session: `npm run typecheck` PASS (node+web);
  `npm run build` PASS; `pw:arcade` 20/20; `pw` 19; `pw-widget` 8/8; `pw:rewards` exact; `pw:rollover`; `pw:theme` — all PASS.
- **Pre-existing INTENTIONAL "failures" (not regressions):** `pw:realm` + the expedition assertion in `pw-celebration`
  only pass when `REALM_COMING_SOON` is flipped `false` (Realm/civ is gated behind a Coming-Soon wall by design — the
  pivot KEEPS it parked there).

## Verbatim currently-failing output
**NONE.** No code ran or changed this session; no new failures.

## Decisions locked (source of truth = memory `questday-pivot-muslim-productivity`)
- **Identity:** Muslim-productivity niche. **Faith layer:** the CORE, keep ALL generic features (additive).
- **Civ:** parked behind "Coming Soon" (retention rides on faith + arcade + core, NOT realm growth).
- **Arcade:** build game-feel upgrades as an OPTIONAL depth layer — keep every game's simple default + an advanced mode; never remove simple.
- **Monetization:** FREE forever (sadaqah). **Social:** invest in the offline share-card as the growth lever.
- **Platform:** desktop + widget + one community; positioning = own focus-work *between* prayers (don't fight Muslim Pro/Athan).
- **Constraints:** local-only ABSOLUTE (+ add export/import + restore; no cloud); gains-only KEPT (stakes via
  prayer-consistency/identity, never punishment); zero-dep default + vetted exceptions; installer UNSIGNED for now
  (revisit Microsoft Store ~$19 before distributing).
- **Cut:** Qibla, Realm mystery reveal, arcade "New game discovered" unlock tiers, live-friends server.
- **Security answer:** offline shrinks the real RCE surface + verifiable export/import/restore + /security-review + dependabot.

## Next steps — file-level build targets (ORDER = faith first; each is its own plan→OK→build→test cycle; schema = STOP-AND-CONFIRM)
1. **Prayer-aware time frames (the differentiator, smallest safe blast radius).**
   - Add optional `prayerAnchor` to `TimeFrame` (`src/shared/types.ts:84`, e.g. `prayerAnchor?: { start: PrayerName; end?: PrayerName }`) — **schema change, stop-and-confirm**.
   - Tolerant migrate + `validate()` it in `src/main/db/store.ts` (mirror `manualOrder`/`questTemplates`).
   - New PURE helper to resolve a frame's EFFECTIVE start/end for a day from `PrayerDayTimes` (via `computePrayerDay()` in `src/shared/engine/prayerTimes.ts`); when `prayerAnchor` set, derive from prayer times instead of `startMinute/endMinute`.
   - Make `frameForTime()` (`src/main/db/store.ts:~159`) and `src/shared/engine/selectCurrentQuest.ts` read the effective window so widget/Dashboard/Quests agree.
   - UI: per-frame "Anchor to prayer times" toggle + prayer picker in `src/renderer/app/TimeFramesView.tsx`.
   - NEVER feeds reward/↩Restore. New driver `scripts/pw-prayer-frames.mjs`; `pw:rewards` must stay exact.
2. **Hijri date + Islamic observance calendar + notifications.** Source = this session's authentic-source research
   (Quran + Sahih Sunnah + an authenticity audit). **Review + persist that research FIRST** (see Open). Export the
   already-present-but-private `hijriFromGregorian()` in `prayerTimes.ts` to surface the Hijri date; add gentle date
   notifications. **Guardrail: NEVER suggest fasting on a forbidden day** (two Eids, days of Tashreeq); phrase
   Ramadan/Eid as "expected ~X, subject to local sighting." Likely a small schema add (enabled/last-shown) → stop-and-confirm.
3. **Quest Bundles** (generic now, faith starter-kits later). New sealed top-level db key (mirror `questTemplates`) → stop-and-confirm; build on the Quest Library plumbing.
4. **End-of-day Wind-Down** — finish the half-built feature in `src/renderer/app/EndOfDayCard.tsx`: add a "today's wins"
   recap + a manual "push unfinished to tomorrow" action (reflection-note third already exists; carry-over today is automatic in `src/shared/engine/rollover.ts`).
5. **Local export/import + restore** (data-safety; supports the security answer + local-only). `src/main/backup/portable.ts`
   already does opaque export/import — wire a user-facing export/import/restore into the Data tab.

**NEXT (after faith slices):**
6. **Arcade depth upgrades** — simple default + advanced mode per game. The full per-game analysis (reference + concrete
   upgrades + constraint audit, all 11 games) was produced this session via the `arcade-quality-upgrade` workflow
   (re-run/resume the saved workflow script for the data). Keep the simple version intact.
7. **Website (real build)** — polished **Next.js on Vercel**, download buttons → **GitHub Releases latest**. Mockup
   approved: `mockups/website-mockup.html`. Build with the **frontend-design** skill; deploy via the Vercel CLI (needs a
   one-time user `vercel login`). **AFTER the app changes** (user's instruction).

**LATER:** Ramadan mode (~Dec 2026 / ~2mo before Ramadan 2027); pre-launch polish (real Data-behind-gear move); revisit signing/Microsoft Store before distributing.

## Open / deferred
- **No code TODO/FIXME added** (no code changed this session).
- **Persist the Islamic-observances research** before building the calendar — currently only in the workflow task output
  (temp file, may be cleaned). Re-run the saved `islamic-observances-research` workflow, OR save its findings to a durable
  `docs/` reference. It FLAGGED: Surah-al-Kahf-on-Friday authenticity is CONTESTED (present as "cherished," not
  "confirmed"); the white-days fast must SKIP 13 Dhul-Hijjah (Tashreeq); a lone-Friday voluntary fast is disliked.
- **Schema changes pending (each stop-and-confirm):** `TimeFrame.prayerAnchor`; calendar-notification settings; Quest Bundles key.
- **Deferred by decision:** Ramadan mode (~Dec 2026); Data-behind-gear (pre-launch polish); signing/Microsoft Store
  (before launch); a paid human security review (when real users appear); the website real build (after app changes).
- **Cut (do not build):** Qibla; Realm mystery reveal; arcade unlock tiers; live-friends server; civ deep roadmap (parked).
- **Undecided (unchanged from 6231a0d):** track-or-not the pre-existing untracked keepers + the 2 pre-existing tracked edits.

## Resume commands (offline; no env/services/network)
```powershell
npm install          # only if node_modules missing (OneDrive electron-binary gotcha → shipping-and-gotchas skill)
npm run build        # compile to out/ — REQUIRED before any pw driver
npm run typecheck    # tsc node + web — run before "done"
npm run dev          # live app (exits 127 => OneDrive electron gotcha; fallback: npm run start)
# pw drivers: QUIT the app first (single-instance lock); all use an isolated --user-data-dir:
npm run pw:rewards   # ↩Restore exactness — run after ANY schema/save change
npm run pw:rollover  # rollover / recurrence
npm run pw           # current-quest / focus
```
Redirect verbose output to `/tmp/x.txt` (POSIX) or a gitignored `*-out.txt` — NOT `C:\temp\...` (mojibake repo-root file).
