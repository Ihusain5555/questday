import { useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { weeklyReview } from '@shared/engine/stats'
import { ymd } from '@shared/engine/rollover'
import { isFeatureEnabled } from './features'
import { CalendarCheck, ShareNetwork } from '@phosphor-icons/react'
import { ShareCardModal } from './ShareCardModal'

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** YYYY-MM-DD (local) -> full weekday name. Parses the parts so it never shifts a
 *  day across the UTC boundary the way new Date('YYYY-MM-DD') would. */
function fullDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return FULL_DAYS[new Date(y, m - 1, d).getDay()]
}

/**
 * Weekly Review — a calm once-a-week recap card on the Dashboard. Pure
 * celebration over the trailing 7 days (completions, best day, the week's power
 * hour, streak). No targets, no misses, no shame. Derived entirely from existing
 * data, so ↩ Restore stays exact.
 */
export function WeeklyReviewCard(): JSX.Element | null {
  const { db } = useStore()
  const now = useNow(60000)
  const [sharing, setSharing] = useState(false)
  if (!db) return null

  const wr = weeklyReview(db.quests, db.timeFrames, now)
  const streak = db.player.streakCount

  // This week's end-of-day reflections (sealed dailyNotes map — display only, never read
  // by reward math), most recent first.
  const reflections: { date: string; text: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = ymd(d)
    const note = db.dailyNotes?.[key]
    if (note) reflections.push({ date: key, text: note })
  }

  return (
    <div className="card weekly-review">
      <div className="wr-head">
        <CalendarCheck size={18} weight="fill" />
        <strong>Your week</strong>
      </div>

      {wr.total === 0 ? (
        <p className="meta-dim wr-empty">
          A fresh week, a clean page. Finish your first quest and your recap begins right here. ✨
        </p>
      ) : (
        <>
          <p className="wr-lead">
            You completed <b data-wr="total">{wr.total}</b> {wr.total === 1 ? 'quest' : 'quests'} across{' '}
            <b data-wr="days">{wr.activeDays}</b> {wr.activeDays === 1 ? 'day' : 'days'} this week.
          </p>
          <div className="wr-chips">
            {wr.bestDay && wr.bestDay.count > 0 && (
              <div className="wr-chip">
                <span className="wr-chip-label">Best day</span>
                <span className="wr-chip-val" data-wr="bestday">
                  {fullDayName(wr.bestDay.date)} · {wr.bestDay.count}
                </span>
              </div>
            )}
            {wr.topFrame && (
              <div className="wr-chip">
                <span className="wr-chip-label">Power hour</span>
                <span className="wr-chip-val" data-wr="frame">
                  {wr.topFrame.frame.name}
                </span>
              </div>
            )}
            <div className="wr-chip">
              <span className="wr-chip-label">Streak</span>
              <span className="wr-chip-val" data-wr="streak">
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
          <button className="ghost wr-share" onClick={() => setSharing(true)}>
            <ShareNetwork size={16} weight="bold" /> Share my week
          </button>
        </>
      )}

      {reflections.length > 0 && isFeatureEnabled(db.settings.enabledFeatures, 'endOfDayNote') && (
        <div className="wr-reflections">
          <div className="wr-reflections-head">This week’s reflections</div>
          <ul>
            {reflections.map((r) => (
              <li key={r.date}>
                <span className="wr-refl-day">{fullDayName(r.date)}</span>
                <span className="wr-refl-text">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sharing && (
        <ShareCardModal
          data={{
            weekTotal: wr.total,
            activeDays: wr.activeDays,
            streak,
            level: db.player.level,
            bestDayName: wr.bestDay ? fullDayName(wr.bestDay.date) : null,
            bestDayCount: wr.bestDay?.count ?? 0
          }}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  )
}
