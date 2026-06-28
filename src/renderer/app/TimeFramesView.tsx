import { useState } from 'react'
import { useStore } from '../state/store'
import { minuteToHHMM, hhmmToMinute } from '@shared/format'
import { activeTimeFrame } from '@shared/engine/selectCurrentQuest'
import { effectiveTimeFrames } from '@shared/engine/prayerFrames'
import type { PrayerAnchorPoint } from '@shared/types'
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
        Frames may wrap past midnight (start later than end, like Night). Switch a frame to{' '}
        <strong>Prayer</strong> to anchor its window to the daily prayer times — it then shifts with
        the real schedule (e.g. “Deep work” running from Fajr until Dhuhr).
      </p>

      <div className="card">
        {frames.map((f, i) => {
          const anchored = !!f.prayerAnchor
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
                <div className="tf-anchor-toggle" role="group" aria-label="Frame window source">
                  <button
                    className={`tf-seg${!anchored ? ' on' : ''}`}
                    onClick={() => updateTimeFrame(f.id, { prayerAnchor: undefined })}
                    title="Use a fixed clock time"
                  >
                    <Clock size={13} weight="bold" /> Clock
                  </button>
                  <button
                    className={`tf-seg${anchored ? ' on' : ''}`}
                    onClick={() =>
                      updateTimeFrame(f.id, { prayerAnchor: f.prayerAnchor ?? { start: 'fajr', end: 'dhuhr' } })
                    }
                    title="Follow the daily prayer times"
                  >
                    <Mosque size={13} weight="bold" /> Prayer
                  </button>
                </div>
                {anchored ? (
                  <div className="tf-times">
                    <select
                      className="tf-prayer-select"
                      aria-label="Frame starts at"
                      value={f.prayerAnchor!.start}
                      onChange={(e) =>
                        updateTimeFrame(f.id, {
                          prayerAnchor: { start: e.target.value as PrayerAnchorPoint, end: f.prayerAnchor!.end }
                        })
                      }
                    >
                      {ANCHOR_OPTS.map((p) => (
                        <option key={p} value={p}>
                          {ANCHOR_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <span className="dash">→</span>
                    <select
                      className="tf-prayer-select"
                      aria-label="Frame ends at"
                      value={f.prayerAnchor!.end ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateTimeFrame(f.id, {
                          prayerAnchor: { start: f.prayerAnchor!.start, end: v ? (v as PrayerAnchorPoint) : undefined }
                        })
                      }}
                    >
                      <option value="">Next prayer</option>
                      {ANCHOR_OPTS.map((p) => (
                        <option key={p} value={p}>
                          {ANCHOR_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                )}
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
