# HANDOFF — QuestDay (resume kit)
_Updated 2026-06-17 · branch `feature/civilization-world-map` · HEAD `be4dd14` · NOT pushed._

## ▶ ACTIVE — RESUME HERE: two new feature requests (asked 2026-06-17, NEITHER built yet)

The researched-features batch is fully built & committed (see "Batch — DONE" below). Since then the
user gave **two new requests**. The session ended (API 529 outages) before either was built — they
are the live work.

### Request A — Salah quests driven by REAL prayer times (supersedes part of `b0510b5`)
**What the user wants:** drop the single "Salah (daily prayers)" subtask-checklist. Instead, **five
separate daily quests** — Fajr, Dhuhr, Asr, Maghrib, Isha — each **due at the actual prayer time**
("due at the time the prayer ends"), recurring every day. User suggested IslamicFinder; said "or find
a better solution."

**Direction already decided & told to the user (do NOT re-litigate):**
- **NO online API.** IslamicFinder/Aladhan would send the user's location off-device daily and break
  the local-only / no-network guarantee (now also recorded in `CLAUDE.md` persistence section).
- **Compute prayer times ON-DEVICE** with the well-known **PrayTimes** algorithm — pure date + lat/lon
  math, **zero new dependency**. Inputs (location + calculation method) become user-entered settings.

**This is a NON-TRIVIAL build → run the discovery interview → write a v1 spec → get explicit yes
BEFORE coding** (per the user's "before any non-trivial build" rule; batch mode does NOT waive the
schema/irreversible gates, and this needs a settings/schema decision). Open design questions to resolve
in that interview:
1. **Location entry:** manual lat/lon, a city lookup (offline city DB = a data file, no network), or
   timezone-only? (City lookup is friendliest but needs a bundled coords table.)
2. **Calculation method:** ISNA / Muslim World League / Umm al-Qura / Egyptian / etc. — needs a picker;
   default likely ISNA for North America. Asr = Standard vs Hanafi is a second toggle.
3. **"Due at when the prayer ends"** = the START of the NEXT prayer (e.g. Fajr's window ends at sunrise;
   Dhuhr ends when Asr starts). Decide per-prayer end semantics with the user.
4. **THE REAL ARCHITECTURAL WRINKLE:** prayer times shift every day, but a quest's `dueAt` is a fixed
   ISO timestamp and `recurDays` only repeats a fixed pattern. So either (a) the rollover/recurrence
   engine (`src/shared/engine/rollover.ts` / `recurrence.ts`) must RECOMPUTE each prayer quest's `dueAt`
   from the PrayTimes engine when it rolls the quest into a new day, or (b) store a time-of-day + a flag
   instead of an absolute `dueAt`. (a) is cleaner but touches the recurrence engine — flag it as
   stop-and-confirm.

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
- No open errors. Last failure of the session was an **API 529 overload** (infra, not code) — ignore.
- Last driver runs this session (all green): `pw-faith` 7/7 · `pw-weekly` 4/4 · `pw-resting` 4/4 ·
  `pw-scale` (+ `pw-library` 12/12) · `pw-sharecard` 3/3 · `pw:rewards` ALL PASS (↩ Restore still exact).

## Git state
- Branch `feature/civilization-world-map`, HEAD **`be4dd14`**, **NOT pushed**. No stashes.
- Last 6 commits: `be4dd14` share-card · `bccfe99` Quests icon/scaling · `ef54094` resting widget ·
  `2b8c7f5` Weekly Review · `b0510b5` Salah checklist · `1898ea5` Quest Library + quick wins.
- **Uncommitted tracked changes** (`git diff --stat HEAD` = 5 files, all close-out docs — NOT a feature):
  - `HANDOFF.md` — this rewrite.
  - `CLAUDE.md` — added the no-network/on-device prayer-times durable rule (persistence section).
  - `.claude/skills/codebase-overview/SKILL.md` — added gotchas (opt-in-faith-seeds-false; share-card
    canvas font preload), plus the batch's earlier gotchas.
  - `docs/superpowers/specs/2026-06-11-civilization-reward-layer-design.md` — 1-line backlog add
    (world-map markers that develop with town stage).
  - `.claude/settings.local.json` — added `WebSearch` permission.
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
- **Request A & B above** — the live open work.
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
