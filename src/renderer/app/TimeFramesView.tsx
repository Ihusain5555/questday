import { useState } from 'react'
import { useStore } from '../state/store'
import { minuteToHHMM, hhmmToMinute } from '@shared/format'
import { activeTimeFrame } from '@shared/engine/selectCurrentQuest'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

export function TimeFramesView(): JSX.Element {
  const { db, createTimeFrame, updateTimeFrame, deleteTimeFrame, moveTimeFrame } = useStore()
  const [newName, setNewName] = useState('')

  if (!db) return <div>Loading…</div>

  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)
  const activeId = activeTimeFrame(db.timeFrames, new Date())?.id ?? null

  const addFrame = async () => {
    const name = newName.trim() || 'New frame'
    // Default the new frame to a 1-hour slot after the last one.
    const last = frames[frames.length - 1]
    const start = last ? last.endMinute : 9 * 60
    await createTimeFrame({ name, startMinute: start % 1440, endMinute: (start + 60) % 1440 })
    setNewName('')
  }

  return (
    <div>
      <div className="view-head">
        <h2>Time frames</h2>
      </div>
      <p className="tagline">
        The active frame (by your clock) decides which quests are candidates for the current quest.
        Frames may wrap past midnight (start later than end, like Night).
      </p>

      <div className="card">
        {frames.map((f, i) => (
          <div className="tf-row" key={f.id}>
            <div className="tf-reorder">
              <button className="icon-btn" disabled={i === 0} onClick={() => moveTimeFrame(f.id, -1)} title="Move up">
                <CaretUp size={14} weight="bold" />
              </button>
              <button
                className="icon-btn"
                disabled={i === frames.length - 1}
                onClick={() => moveTimeFrame(f.id, 1)}
                title="Move down"
              >
                <CaretDown size={14} weight="bold" />
              </button>
            </div>
            <input
              className="tf-name"
              value={f.name}
              onChange={(e) => updateTimeFrame(f.id, { name: e.target.value })}
            />
            <div className="tf-times">
              <input
                className="tf-time"
                type="time"
                value={minuteToHHMM(f.startMinute)}
                onChange={(e) => {
                  const m = hhmmToMinute(e.target.value)
                  if (m !== null) updateTimeFrame(f.id, { startMinute: m })
                }}
              />
              <span className="dash">→</span>
              <input
                className="tf-time"
                type="time"
                value={minuteToHHMM(f.endMinute)}
                onChange={(e) => {
                  const m = hhmmToMinute(e.target.value)
                  if (m !== null) updateTimeFrame(f.id, { endMinute: m })
                }}
              />
            </div>
            {f.id === activeId && <span className="badge active-now">active now</span>}
            <button
              className="ghost danger"
              disabled={frames.length <= 1}
              onClick={() => deleteTimeFrame(f.id)}
              title={frames.length <= 1 ? 'Keep at least one frame' : 'Remove (its quests move to the first frame)'}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card add-frame">
        <input
          placeholder="New frame name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFrame()}
        />
        <button className="primary" onClick={addFrame}>
          + Add frame
        </button>
      </div>
    </div>
  )
}
