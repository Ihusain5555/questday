import { useEffect, useRef, useState } from 'react'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'

/**
 * 🌀 Mental Spin — mental rotation (the Shepard–Metzler paradigm). Two shapes
 * sit side by side: a REFERENCE (left) and a COMPARISON (right). The comparison
 * is the SAME shape, either purely ROTATED (answer "same") or MIRRORED then
 * rotated (answer "mirror"). Tap "Same" or "Mirror". Trains spatial reasoning —
 * holding a shape in mind and turning it.
 *
 * Timed; score = correct calls. A wrong call isn't punished — no point, a brief
 * red flash, and the next trial comes right up (tone rule). The rotation starts
 * at clean 90° steps and gets finer (45°, then arbitrary) as the score climbs,
 * so it ramps with skill rather than scolding mistakes.
 *
 * Feel: a "Ready" countdown so the clock never starts mid-glance.
 */

const DURATION_S = 45

// Asymmetric pentominoes (grid cells in a 4x4 box). Asymmetry is what makes a
// mirror tell-apart-able from a plain rotation — a symmetric shape would be
// ambiguous, so every shape here is chiral.
const SHAPES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], // L
  [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]], // P
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], // W / staircase
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] // skewed (offset T)
]

type Answer = 'same' | 'mirror'

interface Trial {
  shape: ReadonlyArray<readonly [number, number]>
  answer: Answer
  angle: number // degrees the comparison is rotated about its centre
  mirror: boolean // comparison flipped horizontally before rotating
}

// Finer rotation steps unlock as the player warms up.
function angleFor(score: number): number {
  if (score < 4) return Math.floor(Math.random() * 4) * 90 // 0/90/180/270
  if (score < 9) return Math.floor(Math.random() * 8) * 45 // +45° steps
  return Math.floor(Math.random() * 24) * 15 // arbitrary-ish
}

function nextTrial(score: number): Trial {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const mirror = Math.random() < 0.5 // 50/50 same vs mirror
  return { shape, answer: mirror ? 'mirror' : 'same', angle: angleFor(score), mirror }
}

const CELL = 22 // px per grid cell in the SVG
const BOX = 4 // shapes live in a 4x4 grid

// Render one shape's cells as emerald squares, optionally inside a <g> that
// rotates (and horizontally flips) about the centre of the box.
function Shape({ cells, angle, flip }: {
  cells: ReadonlyArray<readonly [number, number]>
  angle?: number
  flip?: boolean
}): JSX.Element {
  const size = BOX * CELL
  const c = size / 2
  const transform = `rotate(${angle ?? 0} ${c} ${c})${flip ? ` translate(${size} 0) scale(-1 1)` : ''}`
  return (
    <svg className="ms-shape" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={transform}>
        {cells.map(([x, y], i) => (
          <rect
            key={i}
            x={x * CELL + 1}
            y={y * CELL + 1}
            width={CELL - 2}
            height={CELL - 2}
            rx={3}
            fill="#2fb380"
            stroke="#0e2a20"
            strokeWidth={2}
          />
        ))}
      </g>
    </svg>
  )
}

export function MentalSpin({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0) // best score reached this round (for a 'best' chime)
  const [trial, setTrial] = useState<Trial>(() => nextTrial(0))
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const scoreRef = useRef(0)
  const done = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finish = (): void => {
    if (done.current) return
    done.current = true
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

  // The round clock (1s ticks). Reads from refs on teardown; finish is guarded.
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const answer = (choice: Answer): void => {
    if (done.current || phase !== 'playing') return
    const correct = choice === trial.answer
    if (correct) {
      const n = scoreRef.current + 1
      scoreRef.current = n
      setScore(n)
      if (n > best) {
        setBest(n)
        play('best') // a tiny personal-best lift each new high this round
      } else {
        play('good')
      }
    } else {
      play('bad') // gentle blip — no point, no penalty (tone rule)
    }
    setFlash(correct ? 'good' : 'bad')
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 200)
    setTrial(nextTrial(scoreRef.current))
  }

  const endEarly = finish

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🌀 {score}</span>
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className={`ms-field${flash === 'bad' ? ' ms-flash' : ''}`} data-answer={trial.answer}>
        {phase === 'ready' ? (
          <div className="ms-ready">
            <span className="meta-dim">Same shape — just rotated, or mirrored?</span>
            <span className="ms-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          <>
            <div className="ms-board">
              <Shape cells={trial.shape} />
              <Shape cells={trial.shape} angle={trial.angle} flip={trial.mirror} />
            </div>
            <div className="ms-choices" role="group" aria-label="rotation or mirror">
              <button className="ms-choice ms-same primary" onClick={() => answer('same')}>
                Same
              </button>
              <button className="ms-choice ms-mirror primary" onClick={() => answer('mirror')}>
                Mirror
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}