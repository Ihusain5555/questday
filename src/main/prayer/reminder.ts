// ---------------------------------------------------------------------------
// Prayer-time reminder scheduler (main process, v1.13). Polls every 30s and fires a
// gentle full-screen reminder the moment a prayer time arrives. ON-DEVICE only — it
// reuses the pure PrayerTimes math (same as the Salah quests), ZERO network, ZERO new
// deps. Never touches rewards/civilization → ↩ Restore stays exact.
//
// Why polling, not setTimeout(prayerTime - now): long timers drift across sleep/DST.
// A 30s poll that fires when `now` is within a short window AFTER each prayer time is
// robust, and means an app restart can't replay prayers that are already well past.
// ---------------------------------------------------------------------------

import { computePrayerDay, localTzHours, type PrayerDayTimes } from '@shared/engine/prayerTimes'
import { ymd } from '@shared/engine/rollover'
import type { Database, PrayerReminderInfo } from '@shared/types'

const PRAYERS = [
  { key: 'fajr', name: 'Fajr', arabic: 'الفجر' },
  { key: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر' },
  { key: 'asr', name: 'Asr', arabic: 'العصر' },
  { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب' },
  { key: 'isha', name: 'Isha', arabic: 'العشاء' }
] as const

const CHECK_MS = 30_000
// Fire if `now` is within this window AFTER a prayer time. A hair over 3× the poll so a
// single missed tick (sleep, GC pause) still catches it, but old prayers never replay.
const FIRE_WINDOW_MS = 95_000

const pad = (n: number): string => String(n).padStart(2, '0')
const hhmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`

let timer: ReturnType<typeof setInterval> | null = null
/** Prayers already reminded this session, keyed `YYYY-MM-DD:fajr` (fire once per day). */
const fired = new Set<string>()

/**
 * Start the reminder poll. Idempotent (a second call is a no-op). `getDb` returns the
 * live database; `show` displays the full-screen reminder window.
 */
export function startPrayerReminders(getDb: () => Database, show: (r: PrayerReminderInfo) => void): void {
  if (timer) return
  const tick = (): void => {
    const db = getDb()
    const pt = db.settings.prayerReminderEnabled ? db.settings.prayerTimes : null
    if (!pt || pt.lat == null || pt.lon == null) return
    const now = new Date()
    let times: PrayerDayTimes
    try {
      times = computePrayerDay({
        lat: pt.lat,
        lon: pt.lon,
        date: now,
        tzHours: localTzHours(now),
        method: pt.method,
        asr: pt.asr
      })
    } catch {
      return // bad lat/lon etc. — never crash the scheduler
    }
    const dateKey = ymd(now)
    for (const p of PRAYERS) {
      const t = times[p.key]
      const delta = now.getTime() - t.getTime()
      if (delta >= 0 && delta < FIRE_WINDOW_MS) {
        const fk = `${dateKey}:${p.key}`
        if (!fired.has(fk)) {
          fired.add(fk)
          show({ prayer: p.name, arabic: p.arabic, timeLabel: hhmm(t) })
        }
      }
    }
    // Keep the dedup set tiny — drop anything not from today.
    for (const k of fired) if (!k.startsWith(dateKey)) fired.delete(k)
  }
  timer = setInterval(tick, CHECK_MS)
  tick()
}

/** A sample reminder for the "Preview" button / driver — bypasses the schedule. */
export function samplePrayerReminder(): PrayerReminderInfo {
  return { prayer: 'Maghrib', arabic: 'المغرب', timeLabel: hhmm(new Date()) }
}
