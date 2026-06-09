import { useEffect, useRef, useState } from 'react'
import type { Quest, TimeFrame } from '@shared/types'
import type { QuestInput } from '../state/store'
import { DIFFICULTIES, PRIORITIES, SKIPPABILITIES } from './options'
import { isoToLocalInput, localInputToIso } from '@shared/format'
import { X, ArrowsClockwise } from '@phosphor-icons/react'

interface Props {
  timeFrames: TimeFrame[]
  initial: Quest | null
  defaultTimeFrameId: string
  onSave: (input: QuestInput) => void
  onCancel: () => void
}

interface SubRow {
  id?: string
  title: string
  /** Optional per-step estimate, minutes (kept as text while editing). */
  estimate: string
}

export function QuestForm({ timeFrames, initial, defaultTimeFrameId, onSave, onCancel }: Props): JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [difficulty, setDifficulty] = useState<Quest['difficulty']>(initial?.difficulty ?? 'Medium')
  const [priority, setPriority] = useState<Quest['priority']>(initial?.priority ?? 'Medium')
  const [skippability, setSkippability] = useState<Quest['skippability']>(
    initial?.skippability ?? 'Should do'
  )
  // Estimate is edited as hours + minutes but stored as total minutes.
  const initialEstimate = initial?.timeEstimateMinutes ?? 30
  const [estHours, setEstHours] = useState<string>(String(Math.floor(initialEstimate / 60)))
  const [estMinutes, setEstMinutes] = useState<string>(String(initialEstimate % 60))
  const [dueLocal, setDueLocal] = useState<string>(isoToLocalInput(initial?.dueAt ?? null))
  const [timeFrameId, setTimeFrameId] = useState<string>(
    initial?.timeFrameId ?? defaultTimeFrameId ?? timeFrames[0]?.id ?? ''
  )
  const [subs, setSubs] = useState<SubRow[]>(
    initial?.subTasks.length
      ? initial.subTasks.map((s) => ({
          id: s.id,
          title: s.title,
          estimate: s.timeEstimateMinutes ? String(s.timeEstimateMinutes) : ''
        }))
      : [{ title: '', estimate: '' }]
  )
  // Recurring (v1.5): weekdays the quest repeats on. Empty = one-off.
  const [recurDays, setRecurDays] = useState<number[]>(initial?.recurDays ?? [])

  // Focus the sub-task row inserted by Enter once it exists in the DOM.
  const subInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const pendingFocus = useRef<number | null>(null)
  useEffect(() => {
    if (pendingFocus.current !== null) {
      subInputRefs.current[pendingFocus.current]?.focus()
      pendingFocus.current = null
    }
  }, [subs])

  const titleError = title.trim().length === 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (titleError) return
    onSave({
      title,
      difficulty,
      priority,
      skippability,
      timeEstimateMinutes: Math.max(0, (Number(estHours) || 0) * 60 + (Number(estMinutes) || 0)),
      dueAt: localInputToIso(dueLocal),
      timeFrameId,
      subTasks: subs.map((s) => ({
        id: s.id,
        title: s.title,
        timeEstimateMinutes: Number(s.estimate) > 0 ? Math.round(Number(s.estimate)) : undefined
      })),
      recurDays
    })
  }

  // Repeats presets <-> the day array.
  const recurPreset =
    recurDays.length === 0 ? 'never'
    : recurDays.length === 7 ? 'daily'
    : [...recurDays].sort().join(',') === '1,2,3,4,5' ? 'weekdays'
    : [...recurDays].sort().join(',') === '0,6' ? 'weekends'
    : 'custom'
  const applyPreset = (p: string) =>
    setRecurDays(
      p === 'daily' ? [0, 1, 2, 3, 4, 5, 6]
      : p === 'weekdays' ? [1, 2, 3, 4, 5]
      : p === 'weekends' ? [0, 6]
      : p === 'custom' ? (recurDays.length > 0 ? recurDays : [1, 2, 3, 4, 5])
      : []
    )
  const toggleDay = (d: number) =>
    setRecurDays((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]))

  const setSub = (i: number, value: string) =>
    setSubs((rows) => rows.map((r, idx) => (idx === i ? { ...r, title: value } : r)))
  const setSubEstimate = (i: number, value: string) =>
    setSubs((rows) => rows.map((r, idx) => (idx === i ? { ...r, estimate: value } : r)))
  const addSub = () => setSubs((rows) => [...rows, { title: '', estimate: '' }])
  const removeSub = (i: number) => setSubs((rows) => rows.filter((_, idx) => idx !== i))
  /** Enter in a sub-task row: insert a fresh row right below and focus it. */
  const insertSubBelow = (i: number) => {
    pendingFocus.current = i + 1
    setSubs((rows) => [...rows.slice(0, i + 1), { title: '', estimate: '' }, ...rows.slice(i + 1)])
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{initial ? 'Edit quest' : 'New quest'}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
            />
            {titleError && <small className="err">A title is required.</small>}
          </label>

          <div className="grid-3">
            <label className="field">
              <span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Quest['difficulty'])}>
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Quest['priority'])}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Skippability</span>
              <select
                value={skippability}
                onChange={(e) => setSkippability(e.target.value as Quest['skippability'])}
              >
                {SKIPPABILITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid-3">
            <label className="field">
              <span>Estimate</span>
              <div className="est-split">
                <input
                  type="number"
                  min={0}
                  aria-label="Estimate hours"
                  value={estHours}
                  onChange={(e) => setEstHours(e.target.value)}
                />
                <span className="est-unit">h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  aria-label="Estimate minutes"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(e.target.value)}
                />
                <span className="est-unit">min</span>
              </div>
            </label>
            <label className="field">
              <span>Due (optional)</span>
              <input type="datetime-local" value={dueLocal} onChange={(e) => setDueLocal(e.target.value)} />
            </label>
            <label className="field">
              <span>Time frame</span>
              <select value={timeFrameId} onChange={(e) => setTimeFrameId(e.target.value)}>
                {timeFrames.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label-icon">
              Repeats <ArrowsClockwise size={13} weight="bold" />
            </span>
            <div className="recur-row">
              <select value={recurPreset} onChange={(e) => applyPreset(e.target.value)}>
                <option value="never">Never (one-off)</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="custom">Custom days…</option>
              </select>
              {recurDays.length > 0 && (
                <div className="day-toggles">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, d) => (
                    <button
                      type="button"
                      key={d}
                      className={`day-toggle ${recurDays.includes(d) ? 'on' : ''}`}
                      onClick={() => toggleDay(d)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {recurDays.length > 0 && (
              <small className="meta-dim">
                Completing it counts every time (full XP, coins, growth). It returns fresh the
                next scheduled day, and quietly rests in between.
              </small>
            )}
          </div>

          <div className="field">
            <span>Sub-tasks (ordered)</span>
            {subs.map((s, i) => (
              <div className="sub-row" key={i}>
                <span className="sub-index">{i + 1}.</span>
                <input
                  ref={(el) => (subInputRefs.current[i] = el)}
                  value={s.title}
                  onChange={(e) => setSub(i, e.target.value)}
                  onKeyDown={(e) => {
                    // Enter = next step, not form submit (fast brain-dump entry).
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      insertSubBelow(i)
                    }
                  }}
                  placeholder="Optional step…"
                />
                <input
                  className="sub-est"
                  type="number"
                  min={0}
                  title="Estimated minutes for this step (optional)"
                  placeholder="min"
                  value={s.estimate}
                  onChange={(e) => setSubEstimate(i, e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove step"
                  onClick={() => removeSub(i)}
                  title="Remove"
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
            ))}
            <button type="button" className="ghost" onClick={addSub}>
              + Add sub-task
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={titleError}>
              {initial ? 'Save changes' : 'Create quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
