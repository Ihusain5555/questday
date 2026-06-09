import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'

/**
 * 👁️ Flash Recall — a Useful-Field-of-View (speed-of-processing) drill. Keep
 * your eyes on the centre; a target flashes for a split second somewhere on the
 * ring, then everything is masked. Click where it appeared. Get it right and the
 * next flash is even briefer — you're training how fast you can take in the
 * whole scene at a glance (the cognitive-training paradigm with the strongest
 * real-world evidence). Fixed number of trials; score = correct locations.
 * A miss just lengthens the next flash a touch — never a penalty (tone rule).
 *
 * Feel: a "Get ready" countdown so the first flash never catches you cold, and a
 * "sharpest" readout of the briefest flash you nailed — a real sense of mastery.
 */

const SLOTS = 8 // positions around the ring (clock face)
// Start exposure by difficulty (chosen during "ready"); it still adapts from there.
const STARTS = [
  { key: 'relaxed', name: 'Relaxed', ms: 520 },
  { key: 'normal', name: 'Normal', ms: 420 },
  { key: 'sharp', name: 'Sharp', ms: 320 }
] as const
const START_MS = 420 // default first exposure (Normal)
const MIN_MS = 90 // floor — can't get easier to see than this
const MAX_MS = 650 // ceiling after misses
const STEP_DOWN = 40 // shorten on a hit (harder)
const STEP_UP = 55 // lengthen on a miss (easier)

type Phase = 'ready' | 'fixation' | 'flash' | 'respond' | 'feedback'

// Ring positions as % offsets from centre (0% = top, clockwise).
const POS = Array.from({ length: SLOTS }, (_, i) => {
  const a = (i / SLOTS) * 2 * Math.PI - Math.PI / 2
  return { left: 50 + 40 * Math.cos(a), top: 50 + 40 * Math.sin(a) }
})

export function FlashRecall({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.flashrecall
  const [trial, setTrial] = useState(0)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [count, setCount] = useState(3)
  const [target, setTarget] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [sharpest, setSharpest] = useState<number | null>(null) // briefest flash localised correctly
  const [diff, setDiff] = useState<(typeof STARTS)[number]['key']>('normal')
  const exposure = useRef(START_MS)

  // Difficulty sets the starting exposure (locked once the first flash begins).
  const pickDiff = (s: (typeof STARTS)[number]) => {
    if (phase !== 'ready') return
    setDiff(s.key)
    exposure.current = s.ms
  }
  const done = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Drive one trial: fixation -> brief flash -> respond.
  const runTrial = () => {
    clearTimers()
    setChosen(null)
    setPhase('fixation')
    const t = Math.floor(Math.random() * SLOTS)
    setTarget(t)
    timers.current.push(
      setTimeout(() => setPhase('flash'), 500),
      setTimeout(() => setPhase('respond'), 500 + exposure.current)
    )
  }

  // "Get ready" countdown -> first trial.
  useEffect(() => {
    if (phase !== 'ready') return
    if (count <= 0) {
      runTrial()
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  useEffect(() => clearTimers, [])

  const finish = (s: number) => {
    if (done.current) return
    done.current = true
    clearTimers()
    onFinish(s)
  }

  const choose = (slot: number) => {
    if (phase !== 'respond' || done.current) return
    const correct = slot === target
    play(correct ? 'good' : 'bad')
    const usedMs = exposure.current // the exposure this flash was shown at
    const nextScore = correct ? score + 1 : score
    setChosen(slot)
    setScore(nextScore)
    if (correct) setSharpest((s) => (s === null ? usedMs : Math.min(s, usedMs)))
    exposure.current = correct
      ? Math.max(MIN_MS, exposure.current - STEP_DOWN)
      : Math.min(MAX_MS, exposure.current + STEP_UP)
    setPhase('feedback')
    const next = trial + 1
    timers.current.push(
      setTimeout(() => {
        if (next >= cfg.trials) return finish(nextScore)
        setTrial(next)
        runTrial()
      }, 550)
    )
  }

  const endEarly = () => finish(score)

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>👁️ {score} found</span>
        <span>
          flash {Math.min(trial + 1, cfg.trials)}/{cfg.trials}
        </span>
        <span className="meta-dim">
          now {Math.round(exposure.current)}ms{sharpest !== null ? ` · sharpest ${sharpest}ms` : ''}
        </span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="ufov-field">
        <div className="ufov-fixation">+</div>
        {POS.map((p, i) => {
          const lit = phase === 'flash' && i === target
          const isChoice = chosen === i
          const reveal = phase === 'feedback' && i === target
          return (
            <button
              key={i}
              className={`ufov-cell${lit ? ' lit' : ''}${reveal ? ' reveal' : ''}${
                isChoice && !reveal ? ' wrong' : ''
              }`}
              style={{ left: `${p.left}%`, top: `${p.top}%` }}
              onClick={() => choose(i)}
              aria-label={`position ${i + 1}`}
            >
              {lit || reveal ? '●' : phase === 'respond' ? '?' : ''}
            </button>
          )
        })}
        {phase === 'ready' && (
          <div className="ufov-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              {STARTS.map((s) => (
                <button
                  key={s.key}
                  className={`game-diff-opt${diff === s.key ? ' on' : ''}`}
                  onClick={() => pickDiff(s)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <span className="ufov-ready-label">Eyes on the centre…</span>
            <span className="ufov-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        )}
      </div>
      <div className="ufov-caption meta-dim">
        {phase === 'respond'
          ? 'Where was it? Click the spot.'
          : phase === 'feedback'
            ? chosen === target
              ? 'Nice — eyes are getting quicker.'
              : 'There it was. Next one’s a touch longer.'
            : phase === 'ready'
              ? 'A target will flash on the ring — remember where.'
              : 'Watch the centre…'}
      </div>
    </div>
  )
}
