// ---------------------------------------------------------------------------
// QuestDay — Islamic observance calendar (v2 faith layer). PURE, on-device, ZERO deps.
//
// Maps a Gregorian day to its Hijri date and the Islamic observances that fall on it,
// grounded in `docs/islamic-observances-reference.md` (Quran + authenticated Sunnah, each
// item adversarially verified). Two hard rules encoded here, NEVER to be softened:
//
//   1. FORBIDDEN-FAST GUARDRAIL — the app must NEVER suggest fasting on a day fasting is
//      forbidden: the two Eids (1 Shawwal, 10 Dhul-Hijjah) and the three days of Tashreeq
//      (11–13 Dhul-Hijjah). `fastingRuling()` returns 'forbidden' on these, and any
//      recommended-fast observance landing on one is SUPPRESSED.
//   2. SIGHTING CAVEAT — Hijri dates are tabular/computed estimates; the real month start is
//      fixed by local moon-sighting. Ramadan/Eid/Arafah/Ashura entries carry `estimate:true`
//      so the UI can show "expected ~, subject to local sighting" — never present as certain.
//
// Tone: gains-only. Voluntary worship is a gentle invitation; missing it is never a loss.
// This engine is NEVER read by the reward / ↩ Restore math.
// ---------------------------------------------------------------------------

import { hijriFromGregorian } from './prayerTimes'

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhul-Qa'dah",
  'Dhul-Hijjah'
] as const

export interface HijriDate {
  year: number
  /** 1..12 (1 = Muharram). */
  month: number
  day: number
  monthName: string
}

/** Tabular (computed) Hijri date for a Gregorian Date. An ESTIMATE — the real month start
 *  is fixed by local crescent sighting, so it can differ by ±1 day near a month boundary. */
export function hijriDate(date: Date): HijriDate {
  const h = hijriFromGregorian(date.getFullYear(), date.getMonth(), date.getDate())
  return { ...h, monthName: HIJRI_MONTHS[h.month - 1] ?? '' }
}

/** Format a Hijri date as "10 Muharram 1447 AH". */
export function formatHijri(h: HijriDate): string {
  return `${h.day} ${h.monthName} ${h.year} AH`
}

export type FastingRuling = 'obligatory' | 'encouraged' | 'permitted' | 'forbidden'

export type ObservanceCategory = 'major' | 'fast' | 'virtue' | 'forbidden'

export interface Observance {
  key: string
  nameEn: string
  nameAr?: string
  category: ObservanceCategory
  /** Short, gains-only practice/encouragement line. */
  note: string
  /** Whether fasting on this day is obligatory/encouraged/permitted/forbidden (if relevant). */
  fasting?: FastingRuling
  /** True for date-sensitive days whose exact day depends on moon-sighting (show the caveat). */
  estimate?: boolean
  /** 'confirmed' vs 'contested' authenticity, surfaced honestly in the UI. */
  confidence?: 'confirmed' | 'contested'
}

/** The two Eids + the three days of Tashreeq — fasting forbidden by consensus. Pure date check
 *  on the tabular Hijri date. Returns the reason, or null when fasting is not forbidden. */
export function forbiddenFastReason(date: Date): string | null {
  const h = hijriFromGregorian(date.getFullYear(), date.getMonth(), date.getDate())
  if (h.month === 10 && h.day === 1) return 'Eid al-Fitr — fasting is not permitted today.'
  if (h.month === 12 && h.day === 10) return 'Eid al-Adha — fasting is not permitted today.'
  if (h.month === 12 && (h.day === 11 || h.day === 12 || h.day === 13))
    return 'Day of Tashreeq — fasting is not permitted today.'
  return null
}

/** The fasting ruling for a given day, with the forbidden-fast guardrail applied first. */
export function fastingRuling(date: Date): { ruling: FastingRuling; reason: string } {
  const forbidden = forbiddenFastReason(date)
  if (forbidden) return { ruling: 'forbidden', reason: forbidden }

  const h = hijriFromGregorian(date.getFullYear(), date.getMonth(), date.getDate())
  if (h.month === 9) return { ruling: 'obligatory', reason: 'Ramadan — the obligatory fast (for those able).' }

  // Encouraged voluntary fasts (the forbidden days are already returned above).
  if (h.month === 12 && h.day === 9)
    return { ruling: 'encouraged', reason: 'Day of Arafah — a highly recommended fast for non-pilgrims.' }
  if (h.month === 1 && (h.day === 9 || h.day === 10))
    return { ruling: 'encouraged', reason: 'Ashura (with the 9th) — a recommended fast.' }
  // White Days 13/14/15 (the Dhul-Hijjah 13th is a forbidden Tashreeq day, handled above).
  if (h.day === 13 || h.day === 14 || h.day === 15)
    return { ruling: 'encouraged', reason: 'A White Day (13th–15th) — the monthly three-day fast.' }
  // Monday & Thursday.
  const wd = date.getDay()
  if (wd === 1 || wd === 4) return { ruling: 'encouraged', reason: 'Monday/Thursday — a recommended weekly fast.' }
  // Six of Shawwal (any six from the 2nd; we mark the early window).
  if (h.month === 10 && h.day >= 2 && h.day <= 7)
    return { ruling: 'encouraged', reason: 'Six days of Shawwal — recommended after Ramadan.' }

  if (wd === 5)
    return { ruling: 'permitted', reason: 'Fasting Friday alone is disliked — pair it with Thursday or Saturday.' }
  if (wd === 6)
    return { ruling: 'permitted', reason: 'Prefer to pair a Saturday fast with another day.' }
  return { ruling: 'permitted', reason: 'A voluntary fast is permitted today.' }
}

// --- the observances that fall on a given day -------------------------------
const OBS = {
  newYear: { key: 'newYear', nameEn: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', category: 'major', note: 'The 1st of Muharram — a quiet calendar marker. No special worship is prescribed for the day itself.', estimate: true, confidence: 'confirmed' },
  tasua: { key: 'tasua', nameEn: 'Tasu’a (9th of Muharram)', nameAr: 'تاسوعاء', category: 'fast', note: 'Fast paired with Ashura (to differ from the practice before).', fasting: 'encouraged', estimate: true, confidence: 'confirmed' },
  ashura: { key: 'ashura', nameEn: 'Day of Ashura', nameAr: 'يوم عاشوراء', category: 'fast', note: 'A recommended fast — it expiates the previous year’s minor sins. Best paired with the 9th.', fasting: 'encouraged', estimate: true, confidence: 'confirmed' },
  ramadan: { key: 'ramadan', nameEn: 'Ramadan', nameAr: 'رمضان', category: 'major', note: 'The month of the obligatory fast — plus extra Qur’an, night prayer (Taraweeh), and charity.', fasting: 'obligatory', estimate: true, confidence: 'confirmed' },
  lastTen: { key: 'lastTen', nameEn: 'Last ten nights of Ramadan', nameAr: 'العشر الأواخر', category: 'virtue', note: 'Seek Laylat al-Qadr on the odd nights (esp. the 27th) — qiyam, du’a, and Qur’an.', estimate: true, confidence: 'confirmed' },
  eidFitr: { key: 'eidFitr', nameEn: 'Eid al-Fitr', nameAr: 'عيد الفطر', category: 'forbidden', note: 'The festival of breaking the fast. Give Zakat al-Fitr before the prayer. Fasting today is not permitted.', fasting: 'forbidden', estimate: true, confidence: 'confirmed' },
  sixShawwal: { key: 'sixShawwal', nameEn: 'Six days of Shawwal', nameAr: 'ست من شوال', category: 'fast', note: 'Fast any six days of Shawwal (from the 2nd) — as if fasting the whole year. Never on Eid (the 1st).', fasting: 'encouraged', confidence: 'confirmed' },
  firstTen: { key: 'firstTen', nameEn: 'First ten days of Dhul-Hijjah', nameAr: 'عشر ذي الحجة', category: 'virtue', note: 'The most virtuous days of the year for good deeds — dhikr, charity, and voluntary fasting (days 1–9).', estimate: true, confidence: 'confirmed' },
  arafah: { key: 'arafah', nameEn: 'Day of Arafah', nameAr: 'يوم عرفة', category: 'fast', note: 'For non-pilgrims, the greatest single-day fast — expiates the year before and after. Pilgrims do not fast it.', fasting: 'encouraged', estimate: true, confidence: 'confirmed' },
  eidAdha: { key: 'eidAdha', nameEn: 'Eid al-Adha', nameAr: 'عيد الأضحى', category: 'forbidden', note: 'The festival of sacrifice. Offer the udhiyah if able. Fasting today is not permitted.', fasting: 'forbidden', estimate: true, confidence: 'confirmed' },
  tashreeq: { key: 'tashreeq', nameEn: 'Days of Tashreeq', nameAr: 'أيام التشريق', category: 'forbidden', note: 'Days of eating, drinking and remembrance of Allah. Fasting is not permitted (for non-pilgrims).', fasting: 'forbidden', estimate: true, confidence: 'confirmed' },
  whiteDays: { key: 'whiteDays', nameEn: 'White Days', nameAr: 'الأيام البيض', category: 'fast', note: 'The 13th–15th of each Hijri month — the Sunnah three-day monthly fast (reward like fasting all year).', fasting: 'encouraged', confidence: 'confirmed' },
  monThu: { key: 'monThu', nameEn: 'Monday & Thursday', nameAr: 'الاثنين والخميس', category: 'fast', note: 'A recommended weekly fast — deeds are presented to Allah on these days.', fasting: 'encouraged', confidence: 'confirmed' },
  friday: { key: 'friday', nameEn: 'Jumu’ah (Friday)', nameAr: 'يوم الجمعة', category: 'virtue', note: 'The best day of the week. Send abundant salawat; seek the hour of accepted du’a. Reciting Surah al-Kahf is cherished by many.', confidence: 'contested' }
} as const satisfies Record<string, Observance>

/** Every observance that falls on `date`, with recommended-fast days SUPPRESSED when the day
 *  is a forbidden-fast day (e.g. a Monday that is Eid never shows a "fast" suggestion). */
export function observancesOn(date: Date): Observance[] {
  const h = hijriFromGregorian(date.getFullYear(), date.getMonth(), date.getDate())
  const wd = date.getDay()
  const out: Observance[] = []

  if (h.month === 1 && h.day === 1) out.push(OBS.newYear)
  if (h.month === 1 && h.day === 9) out.push(OBS.tasua)
  if (h.month === 1 && h.day === 10) out.push(OBS.ashura)
  if (h.month === 9) out.push(OBS.ramadan)
  if (h.month === 9 && h.day >= 21) out.push(OBS.lastTen)
  if (h.month === 10 && h.day === 1) out.push(OBS.eidFitr)
  if (h.month === 10 && h.day >= 2 && h.day <= 7) out.push(OBS.sixShawwal)
  if (h.month === 12 && h.day >= 1 && h.day <= 9) out.push(OBS.firstTen)
  if (h.month === 12 && h.day === 9) out.push(OBS.arafah)
  if (h.month === 12 && h.day === 10) out.push(OBS.eidAdha)
  if (h.month === 12 && (h.day === 11 || h.day === 12 || h.day === 13)) out.push(OBS.tashreeq)
  // White Days, excluding the 13th of Dhul-Hijjah (a forbidden Tashreeq day).
  if ((h.day === 13 || h.day === 14 || h.day === 15) && !(h.month === 12 && h.day === 13)) out.push(OBS.whiteDays)
  if (wd === 1 || wd === 4) out.push(OBS.monThu)
  if (wd === 5) out.push(OBS.friday)

  // GUARDRAIL: on a forbidden-fast day, drop every recommended-fast observance so the calendar
  // never suggests a fast on it (a Mon/Thu/White-Day landing on an Eid or Tashreeq day).
  if (forbiddenFastReason(date)) {
    return out.filter((o) => o.category !== 'fast')
  }
  // De-dup by key (keep first), preserving order.
  const seen = new Set<string>()
  return out.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)))
}

export interface UpcomingDay {
  /** Local YYYY-MM-DD. */
  ymd: string
  date: Date
  hijri: HijriDate
  observances: Observance[]
}

/** The notable observances in the next `days` days from `from` (inclusive). Only days that
 *  carry a major/forbidden/fast/virtue observance are returned. Iterates day-by-day on the
 *  tabular calendar — cheap integer math, fully on-device. Weekly Mon/Thu/Friday entries are
 *  excluded from the "upcoming" list (they'd flood it); only the dated observances surface. */
export function upcomingObservances(from: Date, days: number): UpcomingDay[] {
  const out: UpcomingDay[] = []
  const pad = (n: number): string => String(n).padStart(2, '0')
  // Collapse the monthly White-Days run (13th–15th) to a SINGLE entry — the first day of the
  // run within the window — so the three-day fast doesn't list 3× identically every month
  // (feedback 2026-06-29; its note already says "the 13th–15th of each Hijri month").
  let prevHadWhiteDays = false
  for (let i = 0; i <= days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    let dated = observancesOn(d).filter((o) => o.key !== 'monThu' && o.key !== 'friday')
    const hasWhite = dated.some((o) => o.key === 'whiteDays')
    if (hasWhite && prevHadWhiteDays) dated = dated.filter((o) => o.key !== 'whiteDays')
    prevHadWhiteDays = hasWhite
    if (dated.length === 0) continue
    const h = hijriDate(d)
    out.push({ ymd: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, date: d, hijri: h, observances: dated })
  }
  return out
}
