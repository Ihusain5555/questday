import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { selectCurrentQuest } from '@shared/engine/selectCurrentQuest'
import { balance } from '@shared/config/balance'
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Coffee,
  CheckCircle,
  Timer,
  ClockCountdown,
  HourglassMedium,
  Brain,
  Waves,
  BoundingBox,
  type Icon
} from '@phosphor-icons/react'

// One timer engine; the preset just changes the cadence. `work: null` = Flowtime
// (count UP, stop by hand; break is a fraction of however long you focused).
type Preset = {
  name: string
  icon: string
  blurb: string
  work: number | null
  break?: number
  longBreak?: number
  cyclesPerLong?: number
  breakRatio?: number
}
const PRESETS = balance.focus.presets as Record<string, Preset>
const PRESET_KEYS = Object.keys(PRESETS)

/** Preset icon name (from balance) -> Phosphor component. Crisp, on-brand icons
 *  replace the old emoji glyphs (same app-wide convention as the Eisenhower view). */
const PRESET_ICON: Record<string, Icon> = {
  ClockCountdown,
  HourglassMedium,
  Brain,
  Waves
}

type Phase = 'idle' | 'work' | 'break'

const fmt = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Focus timer (execution layer — the Pomodoro family). The countdown runs in
 * transient renderer state against an absolute deadline (no store write per
 * tick); only the chosen preset persists. Tone: abandoning a session costs
 * nothing; breaks are part of the method, never "slacking".
 */
export function FocusView(): JSX.Element {
  const { db, updateSettings } = useStore()
  const now = useNow(20000)
  const current = db ? selectCurrentQuest(db.quests, db.timeFrames, now) : null

  const presetKey = db?.settings.focusPreset ?? 'pomodoro'
  const preset = PRESETS[presetKey] ?? PRESETS.pomodoro
  const isFlow = preset.work === null
  const PresetIcon = PRESET_ICON[preset.icon] ?? Timer

  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [ms, setMs] = useState(0) // countdown: remaining; flowtime work: elapsed
  const [total, setTotal] = useState(0) // phase length (0 for flowtime work = no ring)
  const [cycle, setCycle] = useState(0) // completed work sessions today (long-break + tally)
  const [isTimebox, setIsTimebox] = useState(false) // current session is a quest timebox

  // Timebox length = the current quest's estimate × a planning-fallacy buffer
  // (research: ×1.5 — we under-estimate), floored so tiny estimates still give a
  // real box. Only offered when there's a current quest. Tunable in balance.
  const tbCfg = balance.focus.timebox
  const timeboxMinutes = current
    ? Math.max(tbCfg.minMinutes, Math.round(current.timeEstimateMinutes * tbCfg.bufferMultiplier))
    : null

  const deadlineRef = useRef<number | null>(null) // countdown end timestamp
  const flowStartRef = useRef<number | null>(null) // flowtime work start timestamp
  const pausedRef = useRef<number | null>(null) // remaining/elapsed captured on pause

  // ---- phase transitions ---------------------------------------------------
  const startWork = (): void => {
    setIsTimebox(false)
    if (isFlow) {
      flowStartRef.current = Date.now()
      setTotal(0)
      setMs(0)
    } else {
      const len = (preset.work as number) * 60_000
      deadlineRef.current = Date.now() + len
      setTotal(len)
      setMs(len)
    }
    setPhase('work')
    setRunning(true)
  }

  // Timebox the current quest: a hard-stop countdown sized from its estimate.
  // Always a fixed countdown, independent of the chosen preset (incl. Flowtime).
  const startTimebox = (minutes: number): void => {
    setIsTimebox(true)
    const len = minutes * 60_000
    deadlineRef.current = Date.now() + len
    flowStartRef.current = null
    setTotal(len)
    setMs(len)
    setPhase('work')
    setRunning(true)
  }

  const goBreak = (workedMs: number): void => {
    let breakMin: number
    if (isFlow && !isTimebox) {
      breakMin = Math.max(1, Math.round((workedMs / 60_000) * (preset.breakRatio ?? 0.2)))
    } else {
      const isLong =
        !isTimebox &&
        !!preset.longBreak &&
        !!preset.cyclesPerLong &&
        (cycle + 1) % (preset.cyclesPerLong as number) === 0
      breakMin = isLong ? (preset.longBreak as number) : preset.break ?? 5
    }
    const len = breakMin * 60_000
    deadlineRef.current = Date.now() + len
    flowStartRef.current = null
    setTotal(len)
    setMs(len)
    setPhase('break')
    setRunning(true)
  }

  // A focus session finished (timer ran out, or Flowtime "Take a break").
  const finishWork = (workedMs: number): void => {
    setCycle((c) => c + 1)
    goBreak(workedMs)
  }

  const finishBreak = (): void => {
    setRunning(false)
    setPhase('idle')
    deadlineRef.current = null
    setMs(0)
    setTotal(0)
  }

  const pause = (): void => {
    if (isFlow && !isTimebox && phase === 'work') {
      pausedRef.current = ms
    } else if (deadlineRef.current != null) {
      pausedRef.current = deadlineRef.current - Date.now()
    }
    setRunning(false)
  }

  const resume = (): void => {
    if (isFlow && !isTimebox && phase === 'work') {
      flowStartRef.current = Date.now() - (pausedRef.current ?? ms)
    } else {
      deadlineRef.current = Date.now() + (pausedRef.current ?? ms)
    }
    pausedRef.current = null
    setRunning(true)
  }

  const reset = (): void => {
    setRunning(false)
    setPhase('idle')
    setMs(0)
    setTotal(0)
    setIsTimebox(false)
    deadlineRef.current = null
    flowStartRef.current = null
    pausedRef.current = null
  }

  const pickPreset = (key: string): void => {
    if (key === presetKey) return
    reset()
    setCycle(0)
    void updateSettings({ focusPreset: key })
  }

  // ---- the tick: drive display + auto-advance at zero ----------------------
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (isFlow && !isTimebox && phase === 'work') {
        setMs(Date.now() - (flowStartRef.current ?? Date.now()))
        return
      }
      const deadline = deadlineRef.current
      if (deadline == null) return
      const left = deadline - Date.now()
      if (left > 0) {
        setMs(left)
        return
      }
      setMs(0)
      if (phase === 'work') void finishWork(total)
      else finishBreak()
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, isFlow, isTimebox, total, cycle, presetKey])

  // ---- ring geometry -------------------------------------------------------
  const R = 86
  const C = 2 * Math.PI * R
  const elapsedFrac =
    phase === 'idle' || total === 0 ? 0 : Math.min(1, Math.max(0, (total - ms) / total))
  const ringColor = phase === 'break' ? 'var(--gold)' : 'var(--brand-bright)'
  const display = isFlow && phase === 'work' ? fmt(ms) : phase === 'idle' ? fmt(0) : fmt(ms)

  const phaseLabel =
    phase === 'work'
      ? isTimebox
        ? 'Timebox'
        : isFlow
          ? 'Focusing — stop when ready'
          : 'Focus'
      : phase === 'break'
        ? 'Break — step away'
        : 'Ready'

  return (
    <div className="view focus-view">
      <div className="view-head">
        <h2>
          <Timer size={20} weight="fill" className="focus-title-icon" /> Focus
        </h2>
        <span className="focus-tally">
          <PresetIcon size={14} weight="fill" /> {cycle} session{cycle === 1 ? '' : 's'} today
        </span>
      </div>

      {/* Preset picker — the whole Pomodoro family. */}
      <div className="focus-presets">
        {PRESET_KEYS.map((k) => {
          const p = PRESETS[k]
          const PIcon = PRESET_ICON[p.icon] ?? Timer
          return (
            <button
              key={k}
              className={`focus-preset ${k === presetKey ? 'on' : ''}`}
              onClick={() => pickPreset(k)}
              disabled={phase !== 'idle' && k !== presetKey}
              title={p.blurb}
            >
              <span className="fp-badge">
                <PIcon size={18} weight="fill" />
              </span>
              <span className="fp-name">{p.name}</span>
              <span className="fp-blurb">{p.blurb}</span>
            </button>
          )
        })}
      </div>

      <div className="card focus-card">
        <div className={`focus-quest ${current ? '' : 'none'}`}>
          {current ? (
            <>
              <span className="fq-label">Focusing on</span>
              <span className="fq-title">{current.title}</span>
            </>
          ) : (
            <span className="fq-label">No current quest — focus on whatever you like.</span>
          )}
        </div>

        <div className="focus-ring-wrap">
          <svg className="focus-ring" width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={R} className="ring-track" />
            <circle
              cx="100"
              cy="100"
              r={R}
              className="ring-progress"
              style={{
                stroke: ringColor,
                strokeDasharray: C,
                strokeDashoffset: isFlow && !isTimebox && phase === 'work' ? 0 : C * (1 - elapsedFrac),
                opacity: isFlow && !isTimebox && phase === 'work' ? 0.35 : 1
              }}
            />
          </svg>
          <div className="focus-readout">
            <div className="focus-time" data-phase={phase}>
              {display}
            </div>
            <div className="focus-phase">
              {phase === 'break' && <Coffee size={14} weight="fill" />}
              {phaseLabel}
            </div>
          </div>
        </div>

        <div className="focus-controls">
          {phase === 'idle' ? (
            <>
              <button className="primary focus-start" onClick={startWork}>
                <Play size={18} weight="fill" /> Start focus
              </button>
              {timeboxMinutes !== null && (
                <button
                  className="focus-timebox"
                  onClick={() => startTimebox(timeboxMinutes)}
                  title={`Hard-stop box sized from this quest's estimate (×${tbCfg.bufferMultiplier} buffer). When it ends: start another box, or move on — no penalty.`}
                >
                  <BoundingBox size={16} weight="fill" /> Timebox · {timeboxMinutes}m
                </button>
              )}
            </>
          ) : (
            <>
              {running ? (
                <button onClick={pause}>
                  <Pause size={16} weight="fill" /> Pause
                </button>
              ) : (
                <button className="primary" onClick={resume}>
                  <Play size={16} weight="fill" /> Resume
                </button>
              )}
              {isFlow && phase === 'work' && (
                <button className="primary" onClick={() => void finishWork(ms)}>
                  <CheckCircle size={16} weight="fill" /> Take a break
                </button>
              )}
              {phase === 'break' && (
                <button className="primary" onClick={finishBreak}>
                  <CheckCircle size={16} weight="fill" /> End break
                </button>
              )}
              <button className="ghost" onClick={reset}>
                <ArrowCounterClockwise size={16} weight="bold" /> Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Local YYYY-MM-DD (matches the store's day-keying). */
function todayStr(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
