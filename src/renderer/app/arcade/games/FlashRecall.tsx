import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { GameIcon } from '../gameIcons'
import { RoundTimer } from '../RoundTimer'
import { useScoreFlash } from '../ScoreFlash'

/**
 * 👁️ Flash Recall — Memory Matrix (redesigned 2026-06-29). A SET of cells lights up
 * across a grid all at once for a brief window, then everything hides. Tap every cell
 * that lit up, in ANY order. Clear them all and you climb a level: one more cell to
 * hold, a shorter flash, and the grid periodically grows. It trains parallel visual
 * memory — grabbing a whole pattern at a glance — which is what made the old single-dot
 * version too easy, and is distinct from Span Recall (serial / ordered Corsi).
 *
 * Tone-compliant difficulty (no lives / no game-over): a wrong tap flashes RED + shake
 * (the sanctioned arcade carve-out) and DROPS you a level — a gentle staircase down, the
 * same idea as Color Recreation. The round is bounded by the clock; score = your highest
 * level cleared (= the most cells you held). XP / streaks / tickets are never touched.
 */

const cfg = balance.arcade.games.flashrecall
// Read tiers via the STATIC key so the as-const union doesn't narrow the per-tier shape.
const TIERS = cfg.tiers
const MODE_LIST = [
  { key: 'easy', name: 'Easy' },
  { key: 'medium', name: 'Medium' },
  { key: 'hard', name: 'Hard' }
] as const
type Mode = (typeof MODE_LIST)[number]['key']
type Phase = 'setup' | 'countdown' | 'show' | 'recall'

interface Board {
  level: number
  gridDim: number
  setSize: number
  exposure: number
  lit: number[]
}

// Derive a level's board from the chosen tier (pure).
function makeBoard(level: number, mode: Mode): Board {
  const t = TIERS[mode]
  const setSize = t.setStart + (level - 1)
  const gridDim = Math.min(t.gridMax, t.grid + Math.floor((level - 1) / t.gridEvery))
  const exposure = Math.max(t.exposureFloor, t.exposureStart - (level - 1) * t.exposureStep)
  const cellCount = gridDim * gridDim
  // Pick `setSize` distinct cells (clamped so a small grid can't ask for more than it has).
  const n = Math.min(setSize, cellCount - 1)
  const pool = Array.from({ length: cellCount }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return { level, gridDim, setSize: n, exposure, lit: pool.slice(0, n) }
}

export function FlashRecall({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('medium')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [board, setBoard] = useState<Board>(() => makeBoard(1, 'medium'))
  const [found, setFound] = useState<number[]>([])
  const [best, setBest] = useState(0) // highest set size cleared = the score

  const modeRef = useRef<Mode>('medium')
  const bestRef = useRef(0)
  const foundRef = useRef<number[]>([])
  const done = useRef(false)
  const locked = useRef(false) // true between boards (during the clear/miss pause)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const juice = useScoreFlash()

  const pushTimer = (id: ReturnType<typeof setTimeout>) => timers.current.push(id)
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const finish = (score: number) => {
    if (done.current) return
    done.current = true
    clearTimers()
    onFinish(score)
  }

  // Difficulty is chosen during setup, then locked once the round starts.
  const pickMode = (m: Mode) => {
    if (phase !== 'setup') return
    setMode(m)
    modeRef.current = m
    setBoard(makeBoard(1, m))
  }

  const start = () => {
    if (phase !== 'setup') return
    setCount(3)
    setPhase('countdown')
  }

  // Begin a level: flash the set, then hand to recall after the exposure window.
  const beginLevel = (level: number) => {
    if (done.current) return
    const b = makeBoard(level, modeRef.current)
    foundRef.current = []
    setFound([])
    setBoard(b)
    locked.current = false
    setPhase('show')
    pushTimer(setTimeout(() => setPhase('recall'), b.exposure))
  }

  // "Get ready" countdown -> first level.
  useEffect(() => {
    if (phase !== 'countdown') return
    if (count <= 0) {
      beginLevel(1)
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  // Round clock.
  useEffect(() => {
    if (phase === 'setup' || phase === 'countdown') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0 && phase !== 'setup' && phase !== 'countdown') finish(bestRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  const tapCell = (idx: number) => {
    if (done.current || phase !== 'recall' || locked.current) return
    if (foundRef.current.includes(idx)) return // already found — ignore
    if (board.lit.includes(idx)) {
      // Correct cell — gold flash, mark it found.
      play('good')
      juice.fire('gain')
      const nf = [...foundRef.current, idx]
      foundRef.current = nf
      setFound(nf)
      if (nf.length >= board.setSize) {
        // Board cleared — bank the level, climb, brief pause, next level.
        locked.current = true
        if (board.setSize > bestRef.current) {
          bestRef.current = board.setSize
          setBest(board.setSize)
          play('best')
        }
        pushTimer(setTimeout(() => beginLevel(board.level + 1), 600))
      }
    } else {
      // Wrong cell — red flash + shake, drop a level (gentle staircase), reflash.
      play('bad')
      juice.fire('penalty')
      locked.current = true
      const nextLevel = Math.max(1, board.level - 1)
      pushTimer(setTimeout(() => beginLevel(nextLevel), 700))
    }
  }

  const endEarly = () => finish(bestRef.current)

  const playing = phase === 'show' || phase === 'recall'
  const caption =
    phase === 'show'
      ? 'Memorize the lit cells…'
      : phase === 'recall'
        ? locked.current
          ? found.length >= board.setSize
            ? 'Cleared! Level up ▲'
            : 'Not quite — dropping a level'
          : `Tap the ${board.setSize} cells that lit up`
        : ''

  return (
    <div className="game-shell" ref={juice.shellRef}>
      {juice.overlay}
      {playing && <RoundTimer timeLeft={timeLeft} total={cfg.seconds} />}
      <div className="game-hud">
        <span className={juice.scoreClass}>
          <GameIcon k="flashrecall" size={15} /> {playing ? `${found.length}/${board.setSize}` : 'Flash Recall'}
        </span>
        {playing && <span className="meta-dim">level {board.level} · best {best}</span>}
        {playing && (
          <button onClick={endEarly}>End round</button>
        )}
      </div>

      <div className="mm-field" data-phase={phase} data-lit={board.lit.join(',')}>
        {phase === 'setup' && (
          <div className="mm-setup">
            <p className="mm-lead">
              A set of cells flashes at once, then vanishes — tap them all back. Clear the board to climb a
              level; one more cell each time, a shorter flash. A wrong tap drops you a level. No game-over —
              race the clock for your best.
            </p>
            <div className="game-diff" role="group" aria-label="difficulty">
              {MODE_LIST.map((m) => (
                <button
                  key={m.key}
                  className={`game-diff-opt${mode === m.key ? ' on' : ''}`}
                  onClick={() => pickMode(m.key)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <button className="primary mm-start" onClick={start}>
              Start
            </button>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="mm-countdown">
            <span className="mm-cd-ready">Get ready…</span>
            <span className={`mm-cd-num${count <= 0 ? ' go' : ''}`}>{count > 0 ? count : 'Go!'}</span>
          </div>
        )}

        {playing && (
          <div
            className="mm-grid"
            style={{ gridTemplateColumns: `repeat(${board.gridDim}, 1fr)` }}
            data-dim={board.gridDim}
          >
            {Array.from({ length: board.gridDim * board.gridDim }, (_, i) => {
              const lit = phase === 'show' && board.lit.includes(i)
              const isFound = found.includes(i)
              return (
                <button
                  key={i}
                  className={`mm-cell${lit ? ' lit' : ''}${isFound ? ' found' : ''}`}
                  data-idx={i}
                  // pointerdown so a fast tap never drops between renders (matches the
                  // other arcade games' input model).
                  onPointerDown={(e) => {
                    if (e.button === 0) tapCell(i)
                  }}
                  aria-label={`cell ${i + 1}`}
                />
              )
            })}
          </div>
        )}

        {playing && <div className="mm-caption meta-dim">{caption}</div>}
      </div>
    </div>
  )
}
