// ---------------------------------------------------------------------------
// QuestDay — on-device prayer-time engine (v1.12). PURE, ZERO dependencies.
//
// Implements the standard astronomical method (the well-known "PrayTimes"
// approach) from public solar-position formulas — NO third-party code, NO
// network, NO API. Given a location + date + method, it returns the five daily
// prayer times as local `Date` objects, plus the per-prayer "due" times QuestDay
// schedules against (each prayer is due when its window closes; Isha is due at
// Islamic midnight — the user's choice, see the prayer-times spec §Decisions).
//
// Timezone/DST: the caller passes `tzHours` (the local UTC offset for that day).
// `localTzHours(date)` derives it from the system clock, which already accounts
// for DST — so the bundled city table only needs lat/lon (spec §Architecture).
// ---------------------------------------------------------------------------

import type { PrayerMethod, AsrSchool, PrayerSettings } from '../types'

export interface PrayerOptions {
  lat: number
  lon: number
  /** Any Date on the target local calendar day (only Y/M/D are read). */
  date: Date
  /** Local UTC offset in hours for that day (East +). Use `localTzHours(date)`. */
  tzHours: number
  method: PrayerMethod
  asr: AsrSchool
}

export interface PrayerDayTimes {
  fajr: Date
  sunrise: Date
  dhuhr: Date
  asr: Date
  maghrib: Date
  isha: Date
  /** Islamic midnight = midpoint between sunset and the next day's Fajr. */
  islamicMidnight: Date
  /** When each prayer's quest is DUE (window-close; Isha = Islamic midnight). */
  due: { fajr: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date }
}

/** Twilight angles (Fajr°, Isha°) per method. Maghrib = sunset for these (Sunni)
 *  methods; Umm al-Qura uses a fixed 90 min after Maghrib for Isha. */
const METHODS: Record<PrayerMethod, { fajr: number; isha: number; ishaMinutes?: number }> = {
  isna: { fajr: 15, isha: 15 },
  mwl: { fajr: 18, isha: 17 },
  egyptian: { fajr: 19.5, isha: 17.5 },
  karachi: { fajr: 18, isha: 18 },
  ummAlQura: { fajr: 18.5, isha: 0, ishaMinutes: 90 }
}

// --- degree-based trig + range helpers --------------------------------------
const dtr = (d: number): number => (d * Math.PI) / 180
const rtd = (r: number): number => (r * 180) / Math.PI
const dSin = (d: number): number => Math.sin(dtr(d))
const dCos = (d: number): number => Math.cos(dtr(d))
const dTan = (d: number): number => Math.tan(dtr(d))
const dArcSin = (x: number): number => rtd(Math.asin(x))
const dArcCos = (x: number): number => rtd(Math.acos(x))
const dArcTan2 = (y: number, x: number): number => rtd(Math.atan2(y, x))
const dArcCot = (x: number): number => rtd(Math.atan2(1, x))
const fixAngle = (a: number): number => ((a % 360) + 360) % 360
const fixHour = (h: number): number => ((h % 24) + 24) % 24
/** Clamp to [-1,1] so extreme latitudes degrade to a real time instead of NaN
 *  (high-latitude twilight adjustment is out of scope for v1 — spec §Out of scope). */
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x))

/** Julian Date for a Gregorian calendar date (at 0h UT). */
function julianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1
    month += 12
  }
  const a = Math.floor(year / 100)
  const b = 2 - a + Math.floor(a / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5
}

/** Sun declination (deg) and equation of time (hours) for a Julian date. */
function sunPosition(jd: number): { decl: number; eqt: number } {
  const d = jd - 2451545.0
  const g = fixAngle(357.529 + 0.98560028 * d) // mean anomaly
  const q = fixAngle(280.459 + 0.98564736 * d) // mean longitude
  const l = fixAngle(q + 1.915 * dSin(g) + 0.02 * dSin(2 * g)) // ecliptic longitude
  const e = 23.439 - 0.00000036 * d // obliquity
  const ra = dArcTan2(dCos(e) * dSin(l), dCos(l)) / 15 // right ascension (hours)
  const decl = dArcSin(dSin(e) * dSin(l))
  const eqt = q / 15 - fixHour(ra)
  return { decl, eqt }
}

/** Local UTC offset (hours, East +) for a date, DST-correct via the system clock. */
export function localTzHours(date: Date): number {
  return -date.getTimezoneOffset() / 60
}

/** Build a local Date on day (y,m,d) at `clockHours` past local midnight.
 *  setMinutes normalizes overflow (e.g. 23.8h, or >24h after midnight) and
 *  honours the local DST rules for that wall-clock time. */
function atClockHours(year: number, month: number, day: number, clockHours: number): Date {
  const dt = new Date(year, month, day, 0, 0, 0, 0)
  dt.setMinutes(Math.round(clockHours * 60))
  return dt
}

/** Integer Julian Day Number (noon-based) for a Gregorian date (month 1..12). */
function julianDayNumber(year: number, month: number, day: number): number {
  return Math.floor(julianDate(year, month, day) + 0.5)
}

/** Gregorian → tabular ("arithmetic"/civil) Islamic calendar. Dependency-free and
 *  fully on-device (no network — honours the local-only rule). The tabular calendar
 *  can differ from an official sighting-based date by ±1 day near a month boundary,
 *  which is fine here: it's used only to widen the Umm al-Qura Isha interval in Ramadan. */
export function hijriFromGregorian(
  year: number,
  month0: number,
  day: number
): { year: number; month: number; day: number } {
  const jd = julianDayNumber(year, month0 + 1, day)
  const l0 = jd - 1948440 + 10632
  const n = Math.floor((l0 - 1) / 10631)
  let l = l0 - 10631 * n + 354
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238)
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29
  const month = Math.floor((24 * l) / 709)
  const hDay = l - Math.floor((709 * month) / 24)
  const hYear = 30 * n + j - 30
  return { year: hYear, month, day: hDay }
}

/** True when `date` falls in Ramadan (the 9th Hijri month) by the tabular calendar. */
export function isRamadan(date: Date): boolean {
  return hijriFromGregorian(date.getFullYear(), date.getMonth(), date.getDate()).month === 9
}

/** Convenience: compute today's prayer times straight from the user's saved
 *  `PrayerSettings`, or `null` when no location is configured yet (so callers can
 *  fall back to plain clock frames). DST-correct via the system clock. Pure. */
export function prayerDayFor(settings: PrayerSettings | undefined | null, now: Date): PrayerDayTimes | null {
  if (!settings || settings.lat == null || settings.lon == null) return null
  return computePrayerDay({
    lat: settings.lat,
    lon: settings.lon,
    date: now,
    tzHours: localTzHours(now),
    method: settings.method,
    asr: settings.asr
  })
}

export function computePrayerDay(opts: PrayerOptions): PrayerDayTimes {
  const { lat, lon, date, tzHours, method, asr } = opts
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // Sun position at local solar noon (declination/EqT drift over a day is sub-minute).
  const jd = julianDate(year, month + 1, day) - lon / (15 * 24)
  const { decl, eqt } = sunPosition(jd + 0.5)

  // Hours from local solar midnight → add `adjust` to get local clock hours.
  const adjust = tzHours - lon / 15
  const midDay = 12 - eqt // solar noon (solar hours)

  // Hour-angle of the sun at a given depression `angle` below the horizon.
  const T = (angle: number): number =>
    (1 / 15) *
    dArcCos(clamp1((-dSin(angle) - dSin(decl) * dSin(lat)) / (dCos(decl) * dCos(lat))))

  // Asr: sun altitude when an object's shadow = factor×height + noon shadow.
  const factor = asr === 'hanafi' ? 2 : 1
  const asrAltitude = dArcCot(factor + dTan(Math.abs(lat - decl)))
  const asrHourAngle =
    (1 / 15) *
    dArcCos(clamp1((dSin(asrAltitude) - dSin(decl) * dSin(lat)) / (dCos(decl) * dCos(lat))))

  const m = METHODS[method] ?? METHODS.isna // tolerate a corrupt/missing method (don't crash the rollover)

  // All in solar hours first; +adjust converts to local clock hours.
  const sunriseH = midDay - T(0.833) + adjust
  const sunsetH = midDay + T(0.833) + adjust
  const fajrH = midDay - T(m.fajr) + adjust
  const dhuhrH = midDay + 1 / 60 + adjust // ~1 min past solar noon (sun fully clears meridian)
  const asrH = midDay + asrHourAngle + adjust
  const maghribH = sunsetH // Sunni methods: Maghrib = sunset
  // Umm al-Qura sets Isha a fixed interval after Maghrib; during Ramadan that interval
  // widens to 120 min (vs 90 the rest of the year) — the published Umm al-Qura rule.
  const ishaMinutes =
    m.ishaMinutes != null && method === 'ummAlQura' && isRamadan(date) ? 120 : m.ishaMinutes
  const ishaH =
    ishaMinutes != null ? sunsetH + ishaMinutes / 60 : midDay + T(m.isha) + adjust

  // Islamic midnight = midpoint between sunset and the next day's Fajr (≈ today's Fajr + 24h).
  const islamicMidnightH = (sunsetH + (fajrH + 24)) / 2

  const at = (h: number): Date => atClockHours(year, month, day, h)

  return {
    fajr: at(fajrH),
    sunrise: at(sunriseH),
    dhuhr: at(dhuhrH),
    asr: at(asrH),
    maghrib: at(maghribH),
    isha: at(ishaH),
    islamicMidnight: at(islamicMidnightH),
    // Each prayer is due when its window closes (spec §Decisions):
    due: {
      fajr: at(sunriseH), // Fajr window ends at sunrise
      dhuhr: at(asrH), // Dhuhr ends when Asr begins
      asr: at(maghribH), // Asr ends at Maghrib (sunset)
      maghrib: at(ishaH), // Maghrib ends when Isha begins
      isha: at(islamicMidnightH) // Isha ends at Islamic midnight (user's choice)
    }
  }
}
