import { useEffect, useRef, useState } from 'react'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'
import { GameIcon } from '../gameIcons'

/**
 * ✋ Stop Tap — a GO/NO-GO inhibition drill (response stopping). Stimuli flash up
 * on a cadence: most are GO (a green circle) — tap the field while it's showing.
 * A minority are NO-GO (a red octagon, "STOP") — you must HOLD your tap and let
 * it pass. Trains the brake: overriding a primed response on the rare signal.
 *
 * Tone rule: a slip never punishes. Tapping a NO-GO is just a quiet non-point
 * with a brief red flash and a gentle "let that one pass"; missing a GO is silent.
 * Score is a non-negative count of correct GO taps + correct NO-GO withholds.
 *
 * Feel: a "Get ready" countdown so it never starts cold, and the cadence ramps
 * a touch faster as the score climbs (a gentle chase, never a wall).
 */

const DURATION_S = 45 // timed round (per prompt — kept local, not in balance)
const MIN_GAP_MS = 420 // floor for the gap as the cadence ramps up
const MIN_WINDOW_MS = 380 // floor for the response window as it tightens

// Difficulty: cadence + how often a trial is the rare NO-GO stop signal.
// `gap` is the blank before a stimulus, `window` how long it stays on screen,
// `noGo` the share of trials that are STOP. Medium is the default the app drives.
type Mode = 'easy' | 'medium' | 'hard'
const MODES: { key: Mode; name: string; gap: number; window: number; noGo: number }[] = [
  { key: 'easy', name: 'Easy', gap: 1150, window: 750, noGo: 0.15 },
  { key: 'medium', name: 'Medium', gap: 950, window: 650, noGo: 0.22 },
  { key: 'hard', name: 'Hard', gap: 750, window: 520, noGo: 0.32 }
]

type Stim = 'go' | 'nogo' | 'none'

export function StopTap({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [score, setScore] = useState(0)
  const [stim, setStim] = useState<Stim>('none')
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('medium')

  // Refs so the scheduling timeouts (which close over stale state) read fresh values.
  const scoreRef = useRef(0)
  const stimRef = useRef<Stim>('none')
  const respondedRef = useRef(false) // did the player tap during this stimulus?
  const done = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The chosen difficulty's params, read fresh inside the self-chaining loop.
  const cfgRef = useRef(MODES.find((m) => m.key === 'medium') ?? MODES[1])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const finish = () => {
    if (done.current) return
    done.current = true
    clearTimers()
    if (flashTimer.current) clearTimeout(flashTimer.current)
    onFinish(scoreRef.current)
  }

  const award = (delta: number) => {
    scoreRef.current += delta
    setScore(scoreRef.current)
  }

  const showFlash = (kind: 'good' | 'bad', msg?: string) => {
    setFlash(kind)
    setHint(msg ?? null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => {
      setFlash(null)
      setHint(null)
    }, 220)
  }

  // Difficulty is chosen during the "ready" countdown, then locked once play starts.
  const pickMode = (key: Mode) => {
    if (phase !== 'ready') return
    setMode(key)
    cfgRef.current = MODES.find((m) => m.key === key) ?? MODES[1]
  }

  // "Get ready" countdown -> start play (and the clock).
  useEffect(() => {
    if (phase !== 'ready') return
    if (count <= 0) {
      setPhase('playing')
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
  }, [phase, count])

  // Round clock: tick down once a second; at zero, end the round (guarded once).
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1
        if (next <= 0) {
          clearInterval(id)
          finish()
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // The trial loop: blank gap -> show a stimulus for the window -> score the
  // withhold/miss -> schedule the next. Self-chaining timeouts (no fixed grid)
  // so both the window and the gap can ramp tighter with the score.
  useEffect(() => {
    if (phase !== 'playing') return

    const showStimulus = () => {
      if (done.current) return
      const cfg = cfgRef.current
      const kind: Stim = Math.random() < cfg.noGo ? 'nogo' : 'go'
      respondedRef.current = false
      stimRef.current = kind
      setStim(kind)
      // Ramp: tighten the response window as the score rises, clamped to a floor.
      const window = Math.max(MIN_WINDOW_MS, cfg.window - scoreRef.current * 6)
      // Close the window: a GO left untapped is a quiet miss; a NO-GO left
      // alone is a correct withhold (+1). Either way, blank then loop.
      timers.current.push(
        setTimeout(() => {
          if (done.current) return
          if (stimRef.current === 'nogo' && !respondedRef.current) {
            play('good')
            award(1)
            showFlash('good', 'good — held it')
          }
          stimRef.current = 'none'
          setStim('none')
          scheduleNext()
        }, window)
      )
    }

    const scheduleNext = () => {
      if (done.current) return
      // Ramp: shrink the blank gap as the score rises, clamped to a floor.
      const gap = Math.max(MIN_GAP_MS, cfgRef.current.gap - scoreRef.current * 10)
      timers.current.push(setTimeout(showStimulus, gap))
    }

    scheduleNext()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Tapping the whole field is the response. GO in-window = point; NO-GO = slip
  // (gentle red flash, no point, no penalty); tapping a blank does nothing.
  const tap = () => {
    if (done.current || phase !== 'playing') return
    if (respondedRef.current) return // one response per stimulus
    const cur = stimRef.current
    if (cur === 'go') {
      respondedRef.current = true
      play('good')
      award(1)
      showFlash('good')
    } else if (cur === 'nogo') {
      respondedRef.current = true
      play('bad')
      showFlash('bad', 'let that one pass')
    }
    // Tapping during a blank ('none') is ignored — quiet, no effect.
  }

  const endEarly = finish

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span><GameIcon k="stoptap" size={15} /> {score}</span>
        <span className="hud-timer">
          <Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s
        </span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div
        className={`st-field${stim === 'go' ? ' st-go' : stim === 'nogo' ? ' st-nogo' : ''}${
          flash === 'bad' ? ' st-flash' : ''
        }`}
        data-stim={stim}
        onClick={tap}
        role="button"
        aria-label="response area"
      >
        {phase === 'ready' ? (
          <div className="st-ready">
            <span className="meta-dim">Tap GO. Hold on STOP.</span>
            <div className="game-diff" role="group" aria-label="difficulty">
              <button
                className={`game-diff-opt${mode === 'easy' ? ' on' : ''}`}
                onClick={() => pickMode('easy')}
              >
                Easy
              </button>
              <button
                className={`game-diff-opt${mode === 'medium' ? ' on' : ''}`}
                onClick={() => pickMode('medium')}
              >
                Medium
              </button>
              <button
                className={`game-diff-opt${mode === 'hard' ? ' on' : ''}`}
                onClick={() => pickMode('hard')}
              >
                Hard
              </button>
            </div>
            <span className="st-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : stim === 'go' ? (
          <div className="st-stim st-stim-go">
            <span className="st-label">GO</span>
          </div>
        ) : stim === 'nogo' ? (
          <div className="st-stim st-stim-nogo">
            <span className="st-label">STOP</span>
          </div>
        ) : (
          <div className="st-stim st-stim-blank">
            <span className="meta-dim">{hint ?? '·'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
