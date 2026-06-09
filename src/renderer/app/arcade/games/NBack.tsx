import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

/**
 * 🔢 N-Back — the classic working-memory workout. Cells light up one at a time;
 * press MATCH whenever the lit cell is the same as the one N steps back (here
 * 2-back). You have to hold the last couple of positions in mind and update them
 * every step. Score = correct catches minus false alarms (floored at 0) — a
 * wrong tap costs a point in the round but never the product (no streak/level
 * harm). Misses are quiet; the round just rolls on.
 *
 * Feel: a "Get ready" countdown so the sequence never starts cold, and each cell
 * lights then CLEARS before the next (a readable beat) so the 2-back is trackable.
 */

const N = 2
const CELLS = 9 // 3x3 grid
const TOTAL = 24 // sequence length
const STEP_MS = 2400 // time per step (one cell)
const LIT_MS = 1650 // how long the cell stays lit within a step (rest is blank)
const MATCH_RATE = 0.32 // ~1/3 of eligible steps are forced matches

function buildSequence(): number[] {
  const seq: number[] = []
  for (let i = 0; i < TOTAL; i++) {
    if (i >= N && Math.random() < MATCH_RATE) {
      seq.push(seq[i - N]) // forced match
    } else {
      let c = Math.floor(Math.random() * CELLS)
      // Avoid an accidental match when we didn't intend one.
      if (i >= N) while (c === seq[i - N]) c = Math.floor(Math.random() * CELLS)
      seq.push(c)
    }
  }
  return seq
}

export function NBack({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const seq = useRef<number[]>(buildSequence())
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [step, setStep] = useState(0)
  const [lit, setLit] = useState(true)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0) // false alarms — shown gently as "oops"
  const [feedback, setFeedback] = useState<'hit' | 'oops' | null>(null)
  const pressed = useRef(false)
  const stepRef = useRef(0)
  const hitsRef = useRef(0)
  const faRef = useRef(0)
  const done = useRef(false)

  const isMatch = (i: number) => i >= N && seq.current[i] === seq.current[i - N]

  const finish = () => {
    if (done.current) return
    done.current = true
    onFinish(Math.max(0, hitsRef.current - faRef.current))
  }

  // "Get ready" countdown -> start the sequence.
  useEffect(() => {
    if (phase !== 'ready') return
    if (count <= 0) {
      setPhase('playing')
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
  }, [phase, count])

  // The sequence: score the step that just ended, then advance (or finish).
  // Within each step the cell lights for LIT_MS then clears (the readable beat).
  useEffect(() => {
    if (phase !== 'playing') return
    let litId: ReturnType<typeof setTimeout>
    const showStep = () => {
      setLit(true)
      litId = setTimeout(() => setLit(false), LIT_MS)
    }
    showStep()
    const id = setInterval(() => {
      const i = stepRef.current
      if (isMatch(i) && pressed.current) {
        hitsRef.current++
        setHits(hitsRef.current)
      }
      const next = i + 1
      if (next >= TOTAL) {
        clearInterval(id)
        clearTimeout(litId)
        finish()
        return
      }
      stepRef.current = next
      pressed.current = false
      setFeedback(null)
      setStep(next)
      showStep()
    }, STEP_MS)
    return () => {
      clearInterval(id)
      clearTimeout(litId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const match = () => {
    if (done.current || phase !== 'playing' || pressed.current) return
    pressed.current = true
    if (isMatch(stepRef.current)) {
      setFeedback('hit')
    } else {
      faRef.current++
      setMisses(faRef.current)
      setFeedback('oops')
    }
  }

  const endEarly = finish
  const current = seq.current[step]

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🔢 {hits} caught</span>
        {misses > 0 && <span className="meta-dim">{misses} oops</span>}
        <span>{phase === 'playing' ? Math.min(step + 1, TOTAL) : 0}/{TOTAL}</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="nback-grid">
        {Array.from({ length: CELLS }, (_, i) => (
          <div key={i} className={`nback-cell${phase === 'playing' && lit && i === current ? ' on' : ''}`} />
        ))}
        {phase === 'ready' && (
          <div className="nback-ready">
            <span className="nback-ready-label">Get ready…</span>
            <span className="nback-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        )}
      </div>
      <button
        className={`primary nback-btn ${feedback ?? ''}`}
        onClick={match}
        disabled={phase !== 'playing' || (pressed.current && feedback !== null)}
      >
        {feedback === 'hit'
          ? '✓ match!'
          : feedback === 'oops'
            ? 'not that one — keep going'
            : `Match (${N}-back)`}
      </button>
      <div className="nback-caption meta-dim">Tap when the lit square is the same as {N} steps ago.</div>
    </div>
  )
}
