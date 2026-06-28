import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import {
  hijriDate,
  formatHijri,
  fastingRuling,
  observancesOn,
  upcomingObservances,
  type FastingRuling,
  type Observance
} from '@shared/engine/observances'
import { MoonStars, CalendarStar, Prohibit, ForkKnife, Info } from '@phosphor-icons/react'

const RULING_LABEL: Record<FastingRuling, string> = {
  obligatory: 'Obligatory fast (Ramadan)',
  encouraged: 'A recommended voluntary fast',
  permitted: 'A voluntary fast is permitted',
  forbidden: 'Fasting is not permitted today'
}

const FAST_TAG: Record<FastingRuling, string> = {
  obligatory: 'Fast · obligatory',
  encouraged: 'Fast · recommended',
  permitted: 'Fast · optional',
  forbidden: 'No fasting'
}

function ObsRow({ o }: { o: Observance }): JSX.Element {
  return (
    <div className="obs-row">
      <div className="obs-line">
        <span className={`obs-name obs-cat-${o.category}`}>{o.nameEn}</span>
        {o.nameAr && <span className="obs-ar">{o.nameAr}</span>}
        {o.fasting && <span className={`obs-fast obs-fast-${o.fasting}`}>{FAST_TAG[o.fasting]}</span>}
        {o.confidence === 'contested' && (
          <span className="obs-contested" title="Scholarly-contested authenticity — cherished by many, not a confirmed Sunnah.">
            cherished
          </span>
        )}
      </div>
      <span className="obs-note">{o.note}</span>
    </div>
  )
}

/**
 * Calendar (v2 faith layer, opt-in tab `observanceCalendar`). Shows today's Hijri date, the
 * fasting ruling for today (with the FORBIDDEN-FAST guardrail front and centre), today's
 * observances, and the upcoming dated observances. All computed on-device from the tabular
 * Hijri calendar — never read by reward math, and it NEVER suggests fasting on a forbidden day.
 */
export function CalendarView(): JSX.Element {
  const { db, updateSettings } = useStore()
  const now = useNow(60000)
  if (!db) return <div>Loading…</div>

  const h = hijriDate(now)
  const ruling = fastingRuling(now)
  const todays = observancesOn(now)
  const upcoming = upcomingObservances(now, 120)
  const notify = db.settings.observanceNotify ?? false
  const gregLabel = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="view calendar-view">
      <div className="view-head">
        <h2>Calendar</h2>
      </div>

      <div className="card cal-today">
        <div className="cal-hijri">
          <MoonStars size={28} weight="fill" />
          <div>
            <div className="cal-hijri-date">{formatHijri(h)}</div>
            <div className="cal-greg">{gregLabel}</div>
          </div>
        </div>
        <p className="cal-caveat">
          <Info size={13} weight="bold" /> Hijri dates are computed on your device — an estimate. The actual day
          depends on the local moon sighting, especially around Ramadan and the two Eids.
        </p>

        <div className={`cal-fasting cal-fasting-${ruling.ruling}`}>
          {ruling.ruling === 'forbidden' ? <Prohibit size={20} weight="fill" /> : <ForkKnife size={18} weight="fill" />}
          <div className="cal-fasting-body">
            <strong>{RULING_LABEL[ruling.ruling]}</strong>
            <span>{ruling.reason}</span>
          </div>
        </div>

        {todays.length > 0 && (
          <div className="cal-todays">
            <div className="cal-todays-head">Today</div>
            {todays.map((o) => (
              <ObsRow key={o.key} o={o} />
            ))}
          </div>
        )}
      </div>

      <label className="cal-notify">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => void updateSettings({ observanceNotify: e.target.checked })}
        />
        <span>
          Gentle notification on special days — computed entirely on your device (Eids, Ashura, Arafah,
          Ramadan, the White Days). Off by default.
        </span>
      </label>

      <div className="card cal-upcoming">
        <div className="cal-upcoming-head">
          <CalendarStar size={16} weight="fill" /> Upcoming
        </div>
        {upcoming.length === 0 ? (
          <div className="cal-empty">No marked observances in the next few months.</div>
        ) : (
          <ul className="cal-list">
            {upcoming.map((u) => (
              <li className="cal-day" key={u.ymd}>
                <div className="cal-day-when">
                  <span className="cal-day-hijri">
                    {u.hijri.day} {u.hijri.monthName}
                  </span>
                  <span className="cal-day-greg">
                    {u.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="cal-day-obs">
                  {u.observances.map((o) => (
                    <ObsRow key={o.key} o={o} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
