import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { classifyQuests, type Quadrant } from '@shared/engine/eisenhower'
import { selectCurrentQuest } from '@shared/engine/selectCurrentQuest'
import { balance } from '@shared/config/balance'
import type { Quest } from '@shared/types'
import { Star } from '@phosphor-icons/react'

const QUADS = balance.eisenhower.quadrants

/** A short, friendly due hint (urgency at a glance — never a countdown of shame). */
function dueHint(dueAt: string, now: Date): string {
  const hours = (Date.parse(dueAt) - now.getTime()) / 3_600_000
  if (hours < 0) return 'overdue'
  if (hours < 24) return 'due today'
  const days = Math.round(hours / 24)
  return `due in ${days}d`
}

/**
 * Eisenhower matrix (prioritization layer). Read-only triage over the quests you
 * already have: urgency from `dueAt`, importance from `skippability`/`priority`.
 * It shows where effort should go and why the current quest leads — manage the
 * quests themselves in the Quests tab. Tone: the low/low cell is "Later".
 */
export function EisenhowerView(): JSX.Element {
  const { db } = useStore()
  const now = useNow(30000)
  if (!db) return <div />

  const groups = classifyQuests(db.quests, now)
  const current = selectCurrentQuest(db.quests, db.timeFrames, now)
  const total = (Object.values(groups) as Quest[][]).reduce((n, arr) => n + arr.length, 0)

  return (
    <div className="view eisenhower-view">
      <div className="view-head">
        <h2>🧭 Eisenhower matrix</h2>
        <span className="eh-hint">
          {total} active quest{total === 1 ? '' : 's'} · urgent × important
        </span>
      </div>
      <p className="tagline">
        Triage by urgency and importance. This mirrors each quest's due date and skippability —
        read-only, so manage the quests themselves in the Quests tab.
      </p>

      <div className="eh-axes">
        <div className="eh-axis-x">
          <span>Urgent →</span>
          <span>Not urgent</span>
        </div>
        <div className="eh-grid">
          {QUADS.map((q) => {
            const quests = groups[q.key as Quadrant]
            return (
              <div
                key={q.key}
                className="eh-quad"
                data-quad={q.key}
                style={{ borderColor: q.color }}
              >
                <div className="eh-quad-head">
                  <span className="eh-quad-name" style={{ color: q.color }}>
                    {q.name}
                  </span>
                  <span className="eh-quad-count">{quests.length}</span>
                </div>
                <div className="eh-quad-blurb">{q.blurb}</div>
                <div className="eh-chips">
                  {quests.length === 0 ? (
                    <div className="eh-empty">Nothing here ✨</div>
                  ) : (
                    quests.map((quest) => (
                      <div
                        key={quest.id}
                        className={`eh-chip ${current?.id === quest.id ? 'current' : ''}`}
                      >
                        {current?.id === quest.id && (
                          <Star size={12} weight="fill" className="eh-star" />
                        )}
                        <span className="eh-chip-title">{quest.title}</span>
                        <span className="eh-chip-meta">
                          {quest.skippability}
                          {quest.dueAt ? ` · ${dueHint(quest.dueAt, now)}` : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="eh-axis-y">
          <span>Important ↑</span>
          <span>Not important</span>
        </div>
      </div>
    </div>
  )
}
