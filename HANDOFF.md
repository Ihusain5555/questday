# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-17 · branch `feature/civilization-world-map` · v1.12.0 · NOT pushed (until the release push)._

## ▶ ACTIVE — RESUME HERE: v1.12 shipped both new features; cutting the macOS installer

Both 2026-06-17 requests are **BUILT, audit-hardened, verified, and committed:**
- **Request A — prayer-time Salah** (`e1bbe86` foundation + `f57709d` UI/store/audit-fixes): 5 separate
  daily prayer quests, each due at its window-close time for the user's city (Isha = Islamic midnight),
  on-device PrayTimes math (no API), city-list + manual coords, ISNA default + method/Asr picker,
  `setPrayerSettings` restamps on change, each prayer placed in its real time frame, 10 min → 2 XP.
  `pw-prayer.mjs` 12/12, `pw:rewards` 7/7 (↩ Restore exact).
- **Request B — segmented capacity bar** (`f9449f8`): each quest a time-proportional segment + soft
  over-capacity hatch. Pure-derived, no schema. `pw-capacity.mjs` 4/4. Mockup `mockups/capacity-segments.html`.
- **Adversarial multi-agent audit** (workflow `wf_629ff235`, 39 agents): 25 confirmed / 7 refuted; the
  9 actionable issues fixed in `f57709d`. Decisions DECIDED this round: add settings block · Isha =
  Islamic midnight · keep 2 XP · Request B = Variant A.

**Next action: cut the macOS installer for v1.12** — bump done (1.12.0); push branch + tag `v1.12.0`
(fires `build-macos.yml`); `gh run watch` → `gh run download` → `gh release create v1.12.0 <dmg>`
(see memory [[mac-build-pipeline]] for the exact clean flow).

**Deferred enhancement (flagged, NOT built):** widget "due-soon" promotion — the current-quest scorer
ignores `dueAt`, so a prayer doesn't auto-rise as its time nears (it surfaces within its frame by score).
This matches the user's locked "due-times only" scope; adding a bounded due-soon urgency boost in
`scoreQuest`/`balance.ts` is an available future option. Faith copy still wants Islamic-Center sign-off.

---

## (historical) Request A brainstorming — resolved
The 3 micro-confirms below were answered (Isha=Islamic midnight, keep 2 XP, leave old quest untouched);
the spec `docs/superpowers/specs/2026-06-17-prayer-times-salah-design.md` is written + implemented.

### Request A — Salah quests driven by REAL prayer times (supersedes the Salah half of `b0510b5`)
**What the user wants:** drop the single "Salah (daily prayers)" subtask-checklist. Instead, **five
separate daily quests** — Fajr, Dhuhr, Asr, Maghrib, Isha — each **due at the time the prayer ends**,
recurring every day.

**DECISIONS LOCKED in the interview (do NOT re-ask):**
- **NO online API** — compute ON-DEVICE via the **PrayTimes** astronomical formulas (self-implemented
  from public solar-position math → no third-party code, ZERO new dependency). Now also a `CLAUDE.md` rule.
- **Location = pick a city** from a bundled offline list (`src/shared/data/cities.ts`, ~150 cities + coords);
  PLUS a manual lat/lon fallback.
- **Method = default ISNA**, with a settings picker for method + Asr (Standard/Hanafi).
- **Due = when the window closes** (Fajr→sunrise, Dhuhr→Asr start, …).
- **Scope = due-times only, NO notifications** (the widget already surfaces the nearest due quest).

**APPROACH CHOSEN — A: recompute `dueAt` at the daily reset, identify prayer quests by stable TITLE,
NO `Quest` schema change.** (Rejected B = adding a `dueTimeOfDay` field to `Quest` — ripples into
`isOverdue`/widget/scoring/migration for no user-visible gain.) Safe for ↩ Restore because reward/Restore
math keys off completion records, never `dueAt` — so `dueAt` can be restamped daily with zero effect on payout.

**THE 3 MICRO-CONFIRMS the user still owes (ask these FIRST on resume):**
1. **Isha's "window close":** recommended = **next-day Fajr** (most forgiving, never overdue mid-evening)
   vs Islamic midnight.
2. **XP:** keep the gentle **2 XP** per prayer (status quo) or set **0** (worship not "scored").
3. **Old single "Salah (daily prayers)" quest** from `b0510b5`: plan = **leave it untouched** (never
   auto-delete user data); new card seeds the 5 timed quests; user deletes the old one. Confirm OK.

**THE REAL ARCHITECTURAL WRINKLE (verified in code this session):** the daily-reset/renew path in
`src/renderer/state/store.ts` (~line 758, the `renewIds` branch) re-activates a recurring quest —
clears `completedAt`/subtasks — but **never recomputes `dueAt`**. So Approach A must, in that renew path
(and on app open / rollover), restamp the 5 prayer quests' `dueAt` from `prayerTimes.ts` using today's
date + `settings.prayerTimes`. Prayer quests are matched by their stable titles (degrade gracefully if renamed).

**Files it will touch (for planning):**
- NEW `src/shared/engine/prayerTimes.ts` — pure PrayTimes math (lat, lon, date, method → 5 times). No deps.
- `src/shared/types.ts` + `defaults.ts` — new `settings.prayerTimes` shape (location + method + asr).
  **Adding a settings sub-shape = stop-and-confirm schema change.**
- `src/renderer/app/DataView.tsx` — settings UI (location + method pickers) behind the existing
  `faithChecklist` toggle.
- `src/renderer/state/store.ts` — **rewrite `addFaithChecklist`** (currently seeds one Salah checklist +
  one Qur'an quest; const titles `FAITH_SALAH_TITLE`/`FAITH_QURAN_TITLE`) to seed 5 timed prayer quests
  (+ keep Qur'an as-is). Stays gains-only, ordinary quests, never read by rewards → ↩ Restore exact.
- `src/shared/engine/rollover.ts` / `recurrence.ts` — daily `dueAt` recompute hook (wrinkle #4).
- NEW `scripts/pw-prayer.mjs` driver.

### Request B — per-quest time markers in the time-frame bar
**What the user wants:** in the Quests page, "depending on the estimated time for each quest… show a
marker for each quest in the progress bar — or think of a better idea." The time-frame **capacity bar**
already exists (shipped in `1898ea5`, calm gold, shows planned-minutes vs frame capacity).
**NOT started** — API outage hit right as I was about to read the capacity-bar code.

**Next concrete steps:**
1. Read the capacity-bar implementation: `grep` for `capacity` in `src/renderer/app/QuestsView.tsx` and
   `styles.css` (`.capacity*`); find where planned-minutes is summed per time frame.
2. Design (VISUAL feature → **mockup-first**, the user can't read code): the strongest idea is a
   **segmented capacity bar** — instead of one fill, each quest is a proportional segment sized by its
   `timeEstimateMinutes`, so you see how the frame's time is carved up and where each quest "lands."
   Hover/label per segment. Build `mockups/capacity-segments.html` (offline, inline SVG/CSS) and get the
   look APPROVED before coding.
3. Pure-derived from `quests[].timeEstimateMinutes` + frame capacity → no schema, ↩ Restore unaffected.

---

## Baseline (recorded 2026-06-17, so next session need not re-derive)
- `npm run typecheck` → **PASS** (~10s, main + renderer).
- `npm run build` → **PASS** (~25s).
- **No source code changed since this baseline** (only docs committed + an interview held) → the PASS
  above still holds; no need to re-run before resuming Request A.
- No open errors. Last failure of the session was an **API 529 overload** (infra, not code) — ignore.
- Last driver runs this session (all green): `pw-faith` 7/7 · `pw-weekly` 4/4 · `pw-resting` 4/4 ·
  `pw-scale` (+ `pw-library` 12/12) · `pw-sharecard` 3/3 · `pw:rewards` ALL PASS (↩ Restore still exact).

## Git state
- Branch `feature/civilization-world-map`, HEAD **`6c4acf6`**, **NOT pushed**. No stashes.
- Last 6 commits: `6c4acf6` docs close-out · `be4dd14` share-card · `bccfe99` Quests icon/scaling ·
  `ef54094` resting widget · `2b8c7f5` Weekly Review · `b0510b5` Salah checklist.
- `6c4acf6` committed the close-out docs (this HANDOFF + CLAUDE.md no-API rule + codebase-overview
  gotchas + the civ-spec backlog line).
- **Only remaining uncommitted tracked change: `.claude/settings.local.json`** (added `WebSearch`
  permission — a personal/local setting, deliberately left out of the docs commit).
- **Untracked = throwaway** (see "Throwaway" below) — none of it is source.

## Batch — DONE this session (all committed, NOT pushed; each has a pw driver, typecheck+build clean)
- `1898ea5` **Quest Library v1** + 4 Tier-A quick wins (duplicate quest · reorder subtasks · time-frame
  capacity bar · Data-tab gear). `pw-library` 12/12, `pw:rewards` 8/8.
- `b0510b5` **Salah & Qur'an checklist** — opt-in OFF by default (`faithChecklist:false` seeded).
  `pw-faith` 7/7. **NOTE: the Salah half is being SUPERSEDED by Request A above** (single checklist →
  5 timed quests). Qur'an quest stays.
- `2b8c7f5` **Weekly Review** Dashboard card — pure `weeklyReview()` + `completionsByFrameRecent()` in
  `stats.ts`, toggle `weeklyReview` default-ON. `pw-weekly` 4/4.
- `ef54094` **Resting widget** — "🌙 Welcome back — your realm's been resting. No rush." when no win
  today AND last win 2+ days ago. `isRealmResting()` off `lastCompletionDate`, no schema. `pw-resting` 4/4.
- `bccfe99` **Quests fix** — action buttons icon-only (`aria-label`s preserve pw `getByRole` names) +
  responsive (rail drops full-width <940px; window min 720). `pw-scale` + `pw-library` green.
- `be4dd14` **Offline share-card** — Weekly Review → "Share my week" → Canvas-2D PNG (`shareCard.ts` /
  `ShareCardModal.tsx`), zero deps, zero new IPC, Save download + Copy clipboard, image-only (NO quest
  titles). `pw-sharecard` 3/3.

## Batch — PENDING user action (not blockers for Request A/B)
- (a) Visually test the batch in `npm run dev` (last definition-of-done gate — none tested in-app yet).
- (b) #1 Salah **faith copy needs Islamic-Center sign-off** before ship (mostly moot once Request A
  rewrites it, but the Qur'an copy + general wording still apply).
- (c) #1 XP: keep the small **2 XP** per prayer or set **0 XP** (user offered the 0 variant).
- (d) Decide **push** and/or **`npm run dist`** installer — both are STOP-AND-CONFIRM; await explicit go.

## Open / deferred (swept from the diff + this session)
- **Request A (prayer-time Salah) — 3 micro-confirms owed by the user before the spec is written**
  (resume here): (1) Isha window-close = next-day Fajr [recommended] vs Islamic midnight; (2) XP per
  prayer = keep 2 [status quo] vs 0; (3) confirm the old `b0510b5` single Salah quest is left untouched
  (never auto-deleted) while the new card seeds the 5 timed quests. Full context in ▶ ACTIVE above.
- **Request B (per-quest capacity-bar time markers)** — not started; mockup-first (segmented bar).
- **`#1 Salah faith copy`** still needs Islamic-Center sign-off (carries over; mostly moot once Request A
  rewrites the Salah quest, but the Qur'an + general copy still apply).
- **AI/hero-art upgrade** for the civilization (style-lock / commissioned hero map) — explicitly DEFERRED.
- **Town-editing live-trial feedback** (user tried `4ead7e7`, deferred all): (1) a tile rejects drops
  (likely the Hall centre cell, by design — confirm before "fixing"); (2) buildings look "deformed"
  (LOWEST priority, likely pre-existing art); (3) **panel + drag-in model** (buildings in a tray dragged
  IN, not auto-placed) — design as an OPTIONAL layer over auto-placement. Detail: memory [[town-editing-v1]].
- **Schema-gated, not in any batch** (each = stop-and-confirm when picked): snooze (`snoozedUntil`),
  quest notes (one string), end-of-day wind-down note.
- **Backlog (parked):** Quest Library Bundles (phase 2) + morning prompt (phase 3); Pipe Connect minigame
  + gains-only unlock tiers (mockup-first); Ramadan / Qibla / Hijri (bigger Muslim-layer pieces);
  world-map markers that develop with each town's stage (added to the civ spec backlog this session).
- **Celebration/XP WIP** committed inside `4ead7e7` runs + `pw-celebration` passes but was flagged
  "interim" — revisit only if the on-completion reward experience needs tidying.

## Architecture reference (durable)
- **Quest Library:** `questTemplates: QuestTemplate[]` top-level db key (types.ts), wholesale-replaced,
  `migrate()` tolerant, `validate()` rejects malformed; NEVER read by civ/rewards → ↩ Restore exact.
  Drag uses a DISTINCT MIME `application/x-questday-template` (frame `onDragOver` detects via
  `dataTransfer.types.includes`; `onDrop` checks it BEFORE the quest-move fallback). `QuestForm` gained
  `hideScheduling` + `isEdit`. Full gotchas live in the **codebase-overview** skill.
- The same **sealed-key + never-read-by-rewards** pattern is the template for Request A's prayer quests
  (they're ordinary quests) and Request B's markers (pure-derived).

## Verification quickref
`npm run typecheck` → `npm run build` → drivers (each isolated `--user-data-dir`, never the real
`db.json`): `node scripts/pw-library.mjs` (12/12), `npm run pw:rewards` (↩ Restore exact), plus
`pw:eisenhower`/`pw:realm`/`pw:rollover`/`pw:arcade`/`pw:timeboxing`, `node scripts/pw-townedit.mjs`
(15/15), and this batch's `pw-faith` / `pw-weekly` / `pw-resting` / `pw-scale` / `pw-sharecard`.
The Bash/PowerShell test-output hook collapses results — redirect to a temp file and `Read` it, or use
the `test-runner` agent. Launch blocked? Kill stray `electron`, release the app-lock. Mockups served
over HTTP via `scripts/_mockserver.mjs` :8777 (Playwright MCP blocks `file://`).

## Throwaway (untracked; delete only with user OK — stop-and-confirm)
Root PNGs (`biome-*`/`town-*`/`tb-*`/`tp-*`/`edit-*`/`cadence-*`/`halls-*`/`share-card-mockup.png`),
`_*.json`/`_*.txt`/`_gemcrit*`/`_vers*`, the `C:…TEMP*` stray txt files, `mockups/_*`,
`mockups/quest-library-{a,c}.html` (a/c throwaway; **b is the approved look — keep**), `scripts/_*.mjs`
generators, `pw-*-out.txt`/`pw-*-run.txt`/`pw-*-result.txt`, `scripts/build-deck.mjs`/`scripts/pw-deck.mjs`,
`presentation/`. KEEP the real drivers: `scripts/pw-townedit.mjs`, `scripts/pw-townlayouts.mjs`,
`scripts/pw-celebration.mjs`, `scripts/pw-library.mjs`, `scripts/pw-faith.mjs`, `scripts/pw-weekly.mjs`,
`scripts/pw-resting.mjs`, `scripts/pw-scale.mjs`, `scripts/pw-sharecard.mjs`, `mockups/town-edit-*.html`,
`mockups/quest-library-b.html`, `mockups/share-card.html`.
