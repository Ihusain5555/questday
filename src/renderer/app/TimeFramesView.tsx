import { useState } from 'react'
import { useStore } from '../state/store'
import { minuteToHHMM, hhmmToMinute } from '@shared/format'
import { activeTimeFrame } from '@shared/engine/selectCurrentQuest'
import { effectiveTimeFrames } from '@shared/engine/prayerFrames'
import type { PrayerAnchorPoint, TimeFrame } from '@shared/types'
import { CaretUp, CaretDown, Clock, Mosque } from '@phosphor-icons/react'

const ANCHOR_OPTS: PrayerAnchorPoint[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
const ANCHOR_LABELS: Record<PrayerAnchorPoint, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha'
}

/** One edge (start OR end) of a frame's window — independently a CLOCK time or a PRAYER
 *  (v2.1). The clock/prayer mini-toggle swaps the input; a prayer edge writes startAnchor/
 *  endAnchor, a clock edge clears it and writes the minute. */
function BoundEditor({
  side,
  frame,
  update
}: {
  side: 'start' | 'end'
  frame: TimeFrame
  update: (patch: Partial<TimeFrame>) => void
}): JSX.Element {
  const isStart = side === 'start'
  const anchor = isStart ? frame.startAnchor : frame.endAnchor
  const minute = isStart ? frame.startMinute : frame.endMinute
  const isPrayer = !!anchor
  const setClock = (): void => update(isStart ? { startAnchor: undefined } : { endAnchor: undefined })
  const setPrayer = (p: PrayerAnchorPoint): void => update(isStart ? { startAnchor: p } : { endAnchor: p })
  const setMinute = (m: number): void => update(isStart ? { startMinute: m } : { endMinute: m })
  return (
    <div className="tf-bound">
      <div className="tf-anchor-toggle" role="group" aria-label={`${side} source`}>
        <button className={`tf-seg${!isPrayer ? ' on' : ''}`} onClick={setClock} title="Use a clock time">
          <Clock size={12} weight="bold" />
        </button>
        <button
          className={`tf-seg${isPrayer ? ' on' : ''}`}
          onClick={() => setPrayer(anchor ?? (isStart ? 'fajr' : 'dhuhr'))}
          title="Follow the daily prayer time"
        >
          <Mosque size={12} weight="bold" />
        </button>
      </div>
      {isPrayer ? (
        <select
          className="tf-prayer-select"
          aria-label={isStart ? 'Start prayer' : 'End prayer'}
          value={anchor}
          onChange={(e) => setPrayer(e.target.value as PrayerAnchorPoint)}
        >
          {ANCHOR_OPTS.map((p) => (
            <option key={p} value={p}>
              {ANCHOR_LABELS[p]}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="tf-time"
          type="time"
          aria-label={isStart ? 'Start time' : 'End time'}
          value={minuteToHHMM(minute)}
          onChange={(e) => {
            const m = hhmmToMinute(e.target.value)
            if (m !== null) setMinute(m)
          }}
        />
      )}
    </div>
  )
}

export function TimeFramesView(): JSX.Element {
  const { db, createTimeFrame, updateTimeFrame, deleteTimeFrame, moveTimeFrame } = useStore()
  const [newName, setNewName] = useState('')

  if (!db) return <div>Loading…</div>

  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)
  // Resolve prayer-anchored windows so the "active now" badge matches the rest of the app.
  const activeId = activeTimeFrame(effectiveTimeFrames(db.timeFrames, db.settings, new Date()), new Date())?.id ?? null
  const locationSet = db.settings.prayerTimes?.lat != null

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
        Frames may wrap past midnight (start later than end, like Night). Set each side — start and
        end — to a fixed <strong>clock</strong> time (🕐) or a <strong>prayer</strong> (🕌), in any
        mix: e.g. Fajr → 9:00, 12:00 → Asr, or Fajr → Dhuhr. Prayer edges shift with the daily times.
      </p>

      <div className="card">
        {frames.map((f, i) => {
          const anchored = !!(f.startAnchor || f.endAnchor)
          return (
            <div className="tf-item" key={f.id}>
              <div className="tf-row">
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
                <div className="tf-times tf-bounds">
                  <BoundEditor side="start" frame={f} update={(patch) => updateTimeFrame(f.id, patch)} />
                  <span className="dash">→</span>
                  <BoundEditor side="end" frame={f} update={(patch) => updateTimeFrame(f.id, patch)} />
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
              {anchored && !locationSet && (
                <div className="tf-anchor-hint">
                  ⓘ Set your location in <strong>Settings → Prayer times</strong> so this frame can follow the
                  real prayer schedule. Until then it uses its saved clock times.
                </div>
              )}
            </div>
          )
        })}
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
