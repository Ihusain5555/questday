# Prayer-time-driven Salah quests — design (v1)

_2026-06-17 · supersedes the single-checklist Salah half of commit `b0510b5`._

## Problem & who it's for
The shipped Salah feature is one "Salah (daily prayers)" quest with 5 subtasks — it doesn't know
when the prayers actually are. The user (a practising Muslim) wants **five separate daily quests**,
one per prayer, each **due at the real prayer time for their location**, so the day's structure
mirrors the actual prayer schedule. Success = the five prayers appear as their own daily quests with
correct, location-accurate due-times that re-compute every day, fully offline.

## Hard constraints (integrity line)
- **No network, ever.** Prayer times are computed **on-device** — no IslamicFinder/Aladhan/any API
  (it would leak location daily and break the local-only promise). Recorded in `CLAUDE.md`.
- **Zero new dependencies.** The astronomical math is implemented from public solar-position formulas
  (the well-known *PrayTimes* approach) — no third-party code bundled.
- **Gains-only / tone rule.** A missed prayer is never punished: recurring quests are already excluded
  from the overdue "needs review" nag (`rollover.ts:~49`), so it simply rests and returns fresh.
- **↩ Restore stays EXACT.** Reward/civilization math keys off completion records, never `dueAt`. So we
  can restamp `dueAt` daily with zero effect on payouts. No prayer state is stored beyond ordinary quests.

## Decisions (locked with the user 2026-06-17)
- **Location:** pick a **city** from a bundled offline list (+ a manual lat/lon fallback).
- **Method:** default **ISNA**, with a settings picker for method **and** Asr (Standard/Hanafi).
- **Due semantics:** each prayer is due when its window closes —
  - Fajr → **sunrise**
  - Dhuhr → **Asr start**
  - Asr → **Maghrib start (sunset)**
  - Maghrib → **Isha start**
  - Isha → **Islamic midnight** (midpoint between sunset and the next day's Fajr) — user's choice.
- **Scope:** set real due-times only; **no notifications** (the widget already surfaces the nearest
  due quest as "current"). Notifications = a later idea.
- **XP:** keep the gentle **2 XP** per prayer (Easy/Medium/Low), same as today.
- **Old quest migration:** the existing single "Salah (daily prayers)" quest is **left untouched**
  (never auto-deleted — tone rule); the new card seeds the 5 timed quests; the user deletes the old one.

## Architecture

### 1. `src/shared/engine/prayerTimes.ts` (NEW, pure, no deps)
- Input: `{ lat, lon, date: Date, method, asr }`. Output: the 5 due-times + sunrise/sunset as **local
  `Date` objects** for that calendar day.
- Implements standard astronomy: Julian date → sun **declination** + **equation of time** → solar noon
  (Dhuhr) → hour-angle helper `T(angle)` for sunrise/sunset/Fajr/Isha → Asr via shadow factor
  (Standard=1, Hanafi=2).
- **Method table** (Fajr°, Isha°): ISNA 15/15 · MWL 18/17 · Egyptian 19.5/17.5 · Karachi 18/18 ·
  Umm al-Qura 18.5 / 90-min-after-Maghrib. Maghrib = sunset for these (Sunni) methods.
- **Timezone/DST:** computed in the **system local timezone** via JS `Date`
  (`-date.getTimezoneOffset()/60` for that day → correct offset incl. DST). So the city table needs
  **only lat/lon** — no tz field, no DST table. v1 assumes the user's machine timezone matches their
  chosen city (true for the overwhelming majority; the manual-coords fallback covers the rest).
- "Due" outputs derived from the raw times per the mapping above; Isha-due = `(sunset + nextFajr)/2`
  (nextFajr ≈ today's Fajr + 24h, good to the minute).

### 2. `src/shared/data/cities.ts` (NEW data file)
- ~150 major world cities: `{ id, name, country, lat, lon }`. Plain TS array, no network.
- Plus the manual-coords path (user types lat/lon) for anyone not near a listed city.

### 3. Settings — `settings.prayerTimes` (schema addition — user approved)
- Shape: `{ cityId: string | null, lat: number | null, lon: number | null, method: PrayerMethod,
  asr: 'standard' | 'hanafi' }`. Seeded in `defaults.ts` (`cityId:null, lat:null, lon:null,
  method:'isna', asr:'standard'`). `migrate()` stays tolerant (missing → defaults). Additive only;
  deep-merged like other `settings` keys; **never read by rewards/civilization** → ↩ Restore exact.
- Surfaced in **`DataView.tsx`** under the existing `faithChecklist` toggle: a city picker (searchable
  list) + manual lat/lon + method dropdown + Asr toggle.

### 4. `src/renderer/state/store.ts`
- **Rewrite `addFaithChecklist`:** seed **5 recurring (every-day) quests** — titles `Fajr`/`Dhuhr`/
  `Asr`/`Maghrib`/`Isha` (exported consts `FAITH_PRAYER_TITLES`) — each with `dueAt` = today's
  due-time from `prayerTimes.ts` (using `settings.prayerTimes`); Easy/Medium/Low → 2 XP; idempotent by
  title. Keep the existing **Read Qur'an** quest. **Guard:** if no location is set, the setup card
  prompts the user to pick a city first (no timed quests seeded without a location).
- **Daily `dueAt` recompute:** in the renew/reset path (~line 758, the `renewIds` branch) **and** on
  app open, for any quest whose title is in `FAITH_PRAYER_TITLES`, restamp `dueAt` to **today's**
  computed due-time. Title-match keeps the `Quest` type unchanged (degrades gracefully if renamed).

### 5. Verification — `scripts/pw-prayer.mjs` (NEW)
- Seed a known city + fixed date in an isolated `--user-data-dir`; assert the 5 quests are created with
  the **expected due-times** (within ±2 min of a reference table for that city/date/method).
- Simulate a new day; assert `dueAt` recomputes.
- Re-run `pw:rewards` to prove ↩ Restore still exact.
- Acceptance: `npm run typecheck` + `npm run build` clean, `pw-prayer` green, `pw:rewards` all PASS.

## Out of scope (v1)
Prayer notifications/alerts; Qibla; Hijri calendar; Ramadan/iftar logic; high-latitude twilight
adjustments (use the method's raw angles for v1); per-city timezone override when machine tz differs.

## Implementation order (build one file at a time, typecheck after each)
1. `prayerTimes.ts` (+ a tiny self-check against a known reference) →
2. `cities.ts` →
3. `types.ts` + `defaults.ts` (the settings shape) →
4. `DataView.tsx` settings UI →
5. `store.ts` (seed rewrite + daily recompute) →
6. `pw-prayer.mjs` + run it + `pw:rewards`.
