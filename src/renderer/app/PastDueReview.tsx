import { useEffect, useState } from 'react'
import type { Quest } from '@shared/types'
import { useStore } from '../state/store'
import { formatDue, isoToLocalInput, localInputToIso } from '@shared/format'

interface Props {
  initialIds: string[]
  onClose: () => void
}

/**
 * Past-due relevance prompt (§6). When a quest's deadline has passed, rolling it
 * silently is pointless — so we ask: keep / reschedule / drop. No penalties.
 */
export function PastDueReview({ initialIds, onClose }: Props): JSX.Element | null {
  const { db, keepQuest, rescheduleQuest, dropQuest } = useStore()
  const [remaining, setRemaining] = useState<string[]>(initialIds)
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null)
  const [dueLocal, setDueLocal] = useState('')

  useEffect(() => {
    if (remaining.length === 0) onClose()
  }, [remaining, onClose])

  if (!db || remaining.length === 0) return null

  const quests = remaining
    .map((id) => db.quests.find((q) => q.id === id))
    .filter((q): q is Quest => Boolean(q))

  const resolve = (id: string) => setRemaining((r) => r.filter((x) => x !== id))

  const beginReschedule = (q: Quest) => {
    setRescheduleFor(q.id)
    setDueLocal(isoToLocalInput(q.dueAt))
  }
  const confirmReschedule = async (id: string) => {
    await rescheduleQuest(id, localInputToIso(dueLocal))
    setRescheduleFor(null)
    resolve(id)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal review-modal">
        <h2>A few quests slipped past their due date</h2>
        <p className="tagline">
          No worries — nothing's lost. Just let me know what's still worth your time.
        </p>

        <ul className="review-list">
          {quests.map((q) => (
            <li className="review-row" key={q.id}>
              <div className="review-main">
                <span className="q-title">{q.title}</span>
                <span className="meta-dim">was due {formatDue(q.dueAt)}</span>
              </div>

              {rescheduleFor === q.id ? (
                <div className="reschedule-row">
                  <input
                    type="datetime-local"
                    value={dueLocal}
                    onChange={(e) => setDueLocal(e.target.value)}
                  />
                  <button className="primary" onClick={() => void confirmReschedule(q.id)}>
                    Set
                  </button>
                  <button className="ghost" onClick={() => setRescheduleFor(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="review-actions">
                  <button
                    className="complete-btn"
                    onClick={async () => {
                      await keepQuest(q.id)
                      resolve(q.id)
                    }}
                    title="Keep it active (clears the old deadline)"
                  >
                    Keep
                  </button>
                  <button className="ghost" onClick={() => beginReschedule(q)}>
                    Reschedule
                  </button>
                  <button
                    className="ghost danger"
                    onClick={async () => {
                      await dropQuest(q.id)
                      resolve(q.id)
                    }}
                  >
                    Drop
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
