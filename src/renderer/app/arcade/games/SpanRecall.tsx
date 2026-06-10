import { useEffect, useRef, useState } from 'react'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'

/**
 * 🪜 Span Recall — a memory-span workout (Corsi block-tapping). The grid flashes
 * a sequence of cells one at a time; reproduce the same order by tapping. Get it
 * all right and the span grows by one (longer to remember); slip and it eases
 * back a step and replays a fresh one — never a punishment, just another go
 * (tone rule). Score = the longest span you reproduce in the round.
 *
 * Backward mode (optional, harder): reproduce the sequence in REVERSE order —
 * the classic working-memory twist.
 *
 * Feel: a "Get ready" countdown so the first flash never starts cold, and each
 * cell lights then clears before the next (a readable beat) like N-Back.
 */

const CELLS = 9 // 3x3 grid
const DURATION_S = 75 // timed round
const MAX_L = 9
const LIT_MS = 600 // each cell stays lit this long
const GAP_MS = 220 // blank gap between flashes

type Order = 'forward' | 'backward'
type Mode = 'easy' | 'medium' | 'hard'

// Each mode sets the recall direction and the STARTING span; the staircase still
// grows/shrinks from there (min span = the mode's start so it never eases below it).
const MODES: Record<Mode, { order: Order; start: number }> = {
  easy: { order: 'forward', start: 2 }, // gentle: forward, span 2
  medium: { order: 'forward', start: 3 }, // forward, span 3 (default, Playwright-driven)
  hard: { order: 'backward', start: 3 }, // working-memory twist: reverse, span 3
}

// A sequence of `len` distinct-from-neighbour cell indices (no immediate repeat).
function buildSequence(len: number): number[] {
  const seq: number[] = []
  for (let i = 0; i < len; i++) {
    let c = Math.floor(Math.random() * CELLS)
    while (i > 0 && c === seq[i - 1]) c = Math.floor(Math.random() * CELLS)
    seq.push(c)
  }
  return seq
}

export function SpanRecall({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [mode, setMode] = useState<Mode>('medium') // default = medium (forward, span 3)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [span, setSpan] = useState(MODES.medium.start) // the current sequence length
  const [best, setBest] = useState(0) // highest span reproduced this round = score
  const [seq, setSeq] = useState<number[]>([])
  const [showIdx, setShowIdx] = useState(-1) // which cell is lit during "show" (-1 = none)
  const [step, setStep] = useState<'show' | 'input'>('show')
  const [taps, setTaps] = useState(0) // how many correct taps so far this attempt
  const [flash, setFlash] = useState<{ idx: number; kind: 'correct' | 'wrong' } | null>(null)
  const [caption, setCaption] = useState('Watch the order…')

  const bestRef = useRef(0)
  const done = useRef(false)
  const showTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mode sets recall direction + starting span; locked once play starts (ready only).
  const order: Order = MODES[mode].order
  const minSpan = MODES[mode].start // staircase never eases below the mode's start
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    setMode(m)
    setSpan(MODES[m].start)
  }

  const clearShowTimers = () => {
    showTimers.current.forEach((t) => clearTimeout(t))
    showTimers.current = []
  }

  const finish = () => {
    if (done.current) return
    done.current = true
    clearShowTimers()
    if (flashTimer.current) clearTimeout(flashTimer.current)
    onFinish(bestRef.current)
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

  // The round clock.
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // Start a fresh attempt at length `len`: build + flash the sequence, then input.
  const startAttempt = (len: number) => {
    if (done.current) return
    clearShowTimers()
    const s = buildSequence(len)
    setSeq(s)
    setTaps(0)
    setShowIdx(-1)
    setStep('show')
    setCaption('Watch the order…')
    // Light each cell in turn (LIT_MS on, GAP_MS off), then hand over to input.
    let t = 0
    s.forEach((cell) => {
      showTimers.current.push(setTimeout(() => setShowIdx(cell), t))
      showTimers.current.push(setTimeout(() => setShowIdx(-1), t + LIT_MS))
      t += LIT_MS + GAP_MS
    })
    showTimers.current.push(
      setTimeout(() => {
        if (done.current) return
        setStep('input')
        setCaption(order === 'backward' ? 'Your turn — tap in REVERSE order' : 'Your turn — tap the order')
      }, t)
    )
  }

  // Kick off the first attempt once play begins.
  useEffect(() => {
    if (phase !== 'playing') return
    startAttempt(span)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // The expected tap order (reversed for backward mode).
  const expected = order === 'backward' ? [...seq].reverse() : seq

  const flashCell = (idx: number, kind: 'correct' | 'wrong') => {
    setFlash({ idx, kind })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 180)
  }

  const tap = (idx: number) => {
    if (done.current || phase !== 'playing' || step !== 'input') return
    if (idx === expected[taps]) {
      const next = taps + 1
      flashCell(idx, 'correct')
      if (next >= expected.length) {
        // Full sequence reproduced — span grows.
        play('good')
        const newBest = Math.max(bestRef.current, span)
        if (newBest > bestRef.current) {
          bestRef.current = newBest
          setBest(newBest)
          play('best') // new personal-best span this round
        }
        const grown = Math.min(MAX_L, span + 1)
        setSpan(grown)
        setCaption('Nice — span grows!')
        const id = setTimeout(() => startAttempt(grown), 650)
        showTimers.current.push(id)
        setStep('show') // freeze input during the brief pause
        setShowIdx(-1)
      } else {
        play('good')
        setTaps(next)
      }
    } else {
      // Wrong tap — gentle: no points lost, ease the span back and replay.
      play('bad')
      flashCell(idx, 'wrong')
      const eased = Math.max(minSpan, span - 1)
      setSpan(eased)
      setCaption('close — here it comes again')
      setStep('show')
      setShowIdx(-1)
      const id = setTimeout(() => startAttempt(eased), 850)
      showTimers.current.push(id)
    }
  }

  const endEarly = finish

  // Test hook: the field carries the ordered sequence + the current phase/order.
  const seqAttr = seq.join(',')

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🪜 span {best}</span>
        <span className="meta-dim">now {span}</span>
        <span className="hud-timer">
          <Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s
        </span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div
        className="sr-field"
        data-phase={phase === 'playing' ? step : 'ready'}
        data-order={order}
        data-sequence={seqAttr}
      >
        {phase === 'ready' ? (
          <div className="sr-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              {(['easy', 'medium', 'hard'] as Mode[]).map((m) => (
                <button
                  key={m}
                  className={`game-diff-opt${mode === m ? ' on' : ''}`}
                  onClick={() => pickMode(m)}
                >
                  {m === 'easy' ? 'Easy' : m === 'medium' ? 'Medium' : 'Hard'}
                </button>
              ))}
            </div>
            <span className="sr-caption">Memorize the flashing order…</span>
            <span className="sr-span">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          <>
            <div className="sr-grid">
              {Array.from({ length: CELLS }, (_, i) => {
                const lit = step === 'show' && i === showIdx
                const fl = flash && flash.idx === i ? ` ${flash.kind}` : ''
                return (
                  <button
                    key={i}
                    className={`sr-cell${lit ? ' lit' : ''}${fl}`}
                    data-index={i}
                    onClick={() => tap(i)}
                    disabled={step !== 'input'}
                    aria-label={`cell ${i}`}
                  />
                )
              })}
            </div>
            <div className="sr-caption meta-dim">{caption}</div>
          </>
        )}
      </div>
    </div>
  )
}
