// ---------------------------------------------------------------------------
// Islamic observance notifier (main process, v2 faith layer). Once per local day, if the
// user opted in, fires a GENTLE system notification for a notable Islamic observance today
// (Eid, Ashura, Arafah, Ramadan, the White Days). ON-DEVICE only — pure tabular-Hijri math,
// ZERO network, ZERO new deps. Never touches rewards → ↩ Restore stays exact.
//
// Hard rule (mirrors the calendar engine): it NEVER suggests fasting on a forbidden day —
// the observance's own `note` already carries the correct ruling (e.g. an Eid note says
// "fasting today is not permitted"), so whatever we surface is safe by construction.
// ---------------------------------------------------------------------------

import { Notification } from 'electron'
import { observancesOn } from '@shared/engine/observances'
import { ymd } from '@shared/engine/rollover'
import type { Database } from '@shared/types'

// Poll every 30 min so a midnight crossing surfaces within the hour without a heavy timer.
const CHECK_MS = 30 * 60_000

let timer: ReturnType<typeof setInterval> | null = null

/**
 * Start the observance notifier (idempotent — a second call is a no-op). `getDb` returns the
 * live database; `markNotified(today)` persists settings.observanceLastNotified so we fire at
 * most once per day. Off unless `settings.observanceNotify` is true.
 */
export function startObservanceNotifier(getDb: () => Database, markNotified: (today: string) => void): void {
  if (timer) return
  const tick = (): void => {
    const db = getDb()
    if (!db.settings.observanceNotify) return
    const now = new Date()
    const today = ymd(now)
    if (db.settings.observanceLastNotified === today) return
    // Only the dated observances are worth a notification — skip the weekly Mon/Thu/Friday.
    const notable = observancesOn(now).filter((o) => o.key !== 'monThu' && o.key !== 'friday')
    if (notable.length === 0) return
    const lead = notable[0]
    try {
      if (Notification.isSupported()) {
        new Notification({ title: lead.nameEn, body: lead.note }).show()
      }
    } catch {
      // Never let a notification failure crash the scheduler.
    }
    markNotified(today)
  }
  timer = setInterval(tick, CHECK_MS)
  tick()
}
