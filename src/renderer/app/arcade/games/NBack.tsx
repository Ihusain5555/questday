import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

/**
 * 🔢 N-Back — the classic working-memory workout. Cells light up one at a time;
 * press MATCH whenever the lit cell is the same as the one N steps back (here
 * 2-back). You have to hold the last couple of positions in mind and update them
 * every step. Score = correct catches minus false alarms (floored at 0) — a
 * wrong tap costs a point in the round but never the product (no streak/level
 * harm). Misses are quiet; the round just rolls on.
 */

const N = 2
const CELLS = 9 // 3x3 grid
const TOTAL = 24 // sequence length
const STEP_MS = 2400 // time each cell is shown
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
  const [step, setStep] = useState(0)
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

  // Score the step that just ended, then advance (or finish).
  useEffect(() => {
    const id = setInterval(() => {
      const i = stepRef.current
      if (isMatch(i)) {
        if (pressed.current) {
          hitsRef.current++
          setHits(hitsRef.current)
        }
        // A missed match is silent — no penalty.
      }
      const next = i + 1
      if (next >= TOTAL) {
        clearInterval(id)
        finish()
        return
      }
      stepRef.current = next
      pressed.current = false
      setFeedback(null)
      setStep(next)
    }, STEP_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const match = () => {
    if (done.current || pressed.current) return
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
        <span>
          {Math.min(step + 1, TOTAL)}/{TOTAL}
        </span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="nback-grid">
        {Array.from({ length: CELLS }, (_, i) => (
          <div key={i} className={`nback-cell${i === current ? ' on' : ''}`} />
        ))}
      </div>
      <button
        className={`primary nback-btn ${feedback ?? ''}`}
        onClick={match}
        disabled={pressed.current && feedback !== null}
      >
        {feedback === 'hit' ? '✓ match!' : feedback === 'oops' ? 'not that one — keep going' : `Match (${N}-back)`}
      </button>
      <div className="nback-caption meta-dim">
        Tap when the lit square is the same as {N} steps ago.
      </div>
    </div>
  )
}
