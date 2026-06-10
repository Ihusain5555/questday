import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { GameIcon } from '../gameIcons'

/**
 * 🔢 N-Back — the classic working-memory workout. Cells light up one at a time;
 * press MATCH whenever the lit cell is the same as the one N steps back (Easy =
 * 1-back, Medium = 2-back, Hard = 3-back). You have to hold the last couple of
 * positions in mind and update them every step. Score = correct catches minus
 * false alarms (floored at 0) — a
 * wrong tap costs a point in the round but never the product (no streak/level
 * harm). Misses are quiet; the round just rolls on.
 *
 * Feel: a "Get ready" countdown so the sequence never starts cold, and each cell
 * lights then CLEARS before the next (a readable beat) so the n-back is trackable.
 */

const CELLS = 9 // 3x3 grid
const TOTAL = 24 // sequence length
const STEP_MS = 2400 // time per step (one cell)
const LIT_MS = 1650 // how long the cell stays lit within a step (rest is blank)
const MATCH_RATE = 0.32 // ~1/3 of eligible steps are forced matches

function buildSequence(n: number): number[] {
  const seq: number[] = []
  for (let i = 0; i < TOTAL; i++) {
    if (i >= n && Math.random() < MATCH_RATE) {
      seq.push(seq[i - n]) // forced match
    } else {
      let c = Math.floor(Math.random() * CELLS)
      // Avoid an accidental match when we didn't intend one.
      if (i >= n) while (c === seq[i - n]) c = Math.floor(Math.random() * CELLS)
      seq.push(c)
    }
  }
  return seq
}

type Mode = 'easy' | 'medium' | 'hard'
// Modes set the n-level: Easy = 1-back, Medium = 2-back, Hard = 3-back.
const MODE_N: Record<Mode, number> = { easy: 1, medium: 2, hard: 3 }

export function NBack({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [mode, setMode] = useState<Mode>('medium') // chosen during "ready"; default playable
  const nLevel = MODE_N[mode] // n-level derived from mode; everything downstream reads nLevel
  const seq = useRef<number[]>(buildSequence(MODE_N.medium))
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

  const isMatch = (i: number) => i >= nLevel && seq.current[i] === seq.current[i - nLevel]

  // Difficulty is locked once play starts; changing it rebuilds the sequence.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready' || m === mode) return
    setMode(m)
    seq.current = buildSequence(MODE_N[m])
  }

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
      play('good')
      setFeedback('hit')
    } else {
      play('bad')
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
        <span><GameIcon k="nback" size={15} /> {hits} caught</span>
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
            : `Match (${nLevel}-back)`}
      </button>
      <div className="nback-caption meta-dim">Tap when the lit square is the same as {nLevel} steps ago.</div>
    </div>
  )
}
