import { useEffect, useRef, useState } from 'react'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'

/**
 * 🔀 Track Switch — task-switching / cognitive flexibility (the Trail-Making B
 * paradigm). Scattered nodes are labelled with INTERLEAVED numbers and letters;
 * tap them in the alternating order 1 → A → 2 → B → 3 → C … The hard part is the
 * "switch": flipping between the number track and the letter track each tap.
 * Timed; score = total correct taps. A wrong tap isn't punished — the node just
 * shakes, the pointer doesn't advance, and you try again (tone rule).
 *
 * Feel: a "Ready" countdown so the clock never starts cold, and each completed
 * trail RESHUFFLES into a fresh layout so it never runs out within the round.
 */

const DURATION_S = 50

// The interleaved target sequence: 1 A 2 B 3 C 4 D 5 E 6 F (12 nodes).
const SEQUENCE = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F'] as const

interface Node {
  label: string
  top: number // %
  left: number // %
}

// Difficulty: how many nodes are on screen at once (a longer trail = more
// switches to track). Both still use the same interleaved number/letter rule.
const DIFFS = [
  { key: 'calm', name: 'Calm', count: 8 },
  { key: 'spicy', name: 'Spicy', count: 12 }
] as const

// Lay the nodes out as a jittered grid: split the field into enough slots,
// shuffle which slot each node takes, then jitter the node within its slot so
// the trail never looks like a tidy grid but never overlaps either.
function buildTrail(count: number): Node[] {
  const cols = count <= 8 ? 3 : 4
  const rows = Math.ceil(count / cols)
  const slots: number[] = []
  for (let i = 0; i < rows * cols; i++) slots.push(i)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  const cellW = 100 / cols
  const cellH = 100 / rows
  return SEQUENCE.slice(0, count).map((label, i) => {
    const slot = slots[i]
    const r = Math.floor(slot / cols)
    const c = slot % cols
    // Centre of the slot, then a small jitter that keeps the node inset.
    const jx = (Math.random() - 0.5) * cellW * 0.5
    const jy = (Math.random() - 0.5) * cellH * 0.5
    return {
      label,
      left: cellW * (c + 0.5) + jx,
      top: cellH * (r + 0.5) + jy
    }
  })
}

export function TrackSwitch({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [score, setScore] = useState(0)
  const [diff, setDiff] = useState<(typeof DIFFS)[number]['key']>('calm')
  const cur = DIFFS.find((d) => d.key === diff) ?? DIFFS[0]
  const [nodes, setNodes] = useState<Node[]>(() => buildTrail(DIFFS[0].count))
  const [ptr, setPtr] = useState(0) // index into the current trail's target order
  const [shake, setShake] = useState<string | null>(null) // label currently shaking

  const scoreRef = useRef(0)
  const done = useRef(false)
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The expected next label (drives data-next for the test hook).
  const nextLabel = ptr < nodes.length ? nodes[ptr].label : ''

  // Difficulty is chosen during the "ready" countdown, then locked.
  const pickDiff = (d: (typeof DIFFS)[number]) => {
    if (phase !== 'ready') return
    setDiff(d.key)
    setNodes(buildTrail(d.count))
    setPtr(0)
  }

  const finish = () => {
    if (done.current) return
    done.current = true
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    onFinish(scoreRef.current)
  }

  // "Ready" countdown -> start play (and the clock).
  useEffect(() => {
    if (phase !== 'ready') return
    if (count <= 0) {
      setPhase('playing')
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
  }, [phase, count])

  // The round clock — finish once when it hits 0.
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // Clear any pending shake timer on unmount.
  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    }
  }, [])

  const tap = (label: string) => {
    if (done.current || phase !== 'playing') return
    if (label === nextLabel) {
      // Correct next-tap: mark done (advance the pointer) and score.
      play('good')
      scoreRef.current += 1
      setScore(scoreRef.current)
      const next = ptr + 1
      if (next >= nodes.length) {
        // Whole trail complete — reshuffle a brand-new one and keep going.
        setNodes(buildTrail(cur.count))
        setPtr(0)
      } else {
        setPtr(next)
      }
    } else {
      // Wrong tap: gentle shake, no advance, no penalty (tone rule).
      play('bad')
      setShake(label)
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
      shakeTimer.current = setTimeout(() => setShake(null), 220)
    }
  }

  const endEarly = finish

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🔀 {score}</span>
        <span className="hud-timer">
          <Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s
        </span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="ts-field" data-next={nextLabel}>
        {phase === 'ready' ? (
          <div className="ts-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              {DIFFS.map((d) => (
                <button
                  key={d.key}
                  className={`game-diff-opt${diff === d.key ? ' on' : ''}`}
                  onClick={() => pickDiff(d)}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <span className="ts-ready-label">1 → A → 2 → B … number, letter, number…</span>
            <span className="ts-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          nodes.map((n, i) => {
            const isDone = i < ptr
            const isNext = i === ptr
            return (
              <button
                key={`${n.label}-${i}`}
                className={`ts-node${isDone ? ' ts-done' : ''}${isNext ? ' ts-next' : ''}${
                  shake === n.label ? ' ts-shake' : ''
                }`}
                data-label={n.label}
                style={{ top: `${n.top}%`, left: `${n.left}%` }}
                onClick={() => tap(n.label)}
                disabled={isDone}
              >
                {isDone ? '✓' : n.label}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}