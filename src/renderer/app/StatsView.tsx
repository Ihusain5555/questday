import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { totalXpEarned, completionsPerDay, completionsByFrame, totalCompletions } from '@shared/engine/stats'
import { ChartBar, Trophy, Lightning, CheckCircle } from '@phosphor-icons/react'
import { FlameIcon } from '../components/RewardIcons'

/**
 * 📊 Stats — the "look how far you've come" view. Pure celebration: totals,
 * a 14-day completions chart, and where in the day your wins land. No shame
 * metrics, ever.
 */
export function StatsView(): JSX.Element {
  const { db } = useStore()
  const now = useNow(60000)

  if (!db) return <div>Loading…</div>
  // Recurring history counts too — a daily quest's resets never erase its wins.
  const completedTotal = totalCompletions(db.quests)
  const days = completionsPerDay(db.quests, 14, now)
  const maxDay = Math.max(1, ...days.map((d) => d.count))
  const last7 = days.slice(-7).reduce((s, d) => s + d.count, 0)
  const byFrame = completionsByFrame(db.quests, db.timeFrames)
  const maxFrame = Math.max(1, ...byFrame.map((f) => f.count))

  return (
    <div>
      <div className="view-head">
        <h2>
          <ChartBar size={20} weight="fill" /> Your story so far
        </h2>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <div className="label">
              <Trophy size={13} weight="fill" color="var(--gold)" /> Quests completed
            </div>
            <div className="value" data-stat="completed">{completedTotal}</div>
          </div>
          <div className="stat">
            <div className="label">
              <Lightning size={13} weight="fill" color="var(--gold)" /> Total XP earned
            </div>
            <div className="value" data-stat="xp">{totalXpEarned(db.player)}</div>
          </div>
          <div className="stat">
            <div className="label">
              <CheckCircle size={13} weight="fill" color="var(--brand-bright)" /> Last 7 days
            </div>
            <div className="value" data-stat="week">{last7}</div>
          </div>
          <div className="stat">
            <div className="label">
              <FlameIcon size={14} /> Streak
            </div>
            <div className="value" data-stat="streak">{db.player.streakCount}</div>
          </div>
          <div className="stat">
            <div className="label">
              <FlameIcon size={14} /> Best streak
            </div>
            <div className="value" data-stat="best">{Math.max(db.garden.bestStreak, db.player.streakCount)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <strong>Last 14 days</strong>
        {completedTotal === 0 ? (
          <p className="meta-dim" style={{ marginTop: 8 }}>
            Your first completed quest starts the chart — it'll be waiting here. ✨
          </p>
        ) : (
          <div className="chart">
            {days.map((d) => (
              <div className="chart-col" key={d.date} title={`${d.date}: ${d.count} completed`}>
                <span className="chart-count">{d.count > 0 ? d.count : ''}</span>
                <div
                  className={`chart-bar ${d.count > 0 ? 'lit' : ''}`}
                  style={{ height: `${Math.max(4, Math.round((d.count / maxDay) * 100))}%` }}
                />
                <span className="chart-day">{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <strong>Where your wins land</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          All-time completions by time frame — your power hours.
        </p>
        <div className="fbar-list">
          {byFrame.map(({ frame, count }) => (
            <div className="fbar-row" key={frame.id}>
              <span className="fbar-name">{frame.name}</span>
              <div className="fbar-track">
                <div className="fbar-fill" style={{ width: `${Math.round((count / maxFrame) * 100)}%` }} />
              </div>
              <span className="fbar-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
