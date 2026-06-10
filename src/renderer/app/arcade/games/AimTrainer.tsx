import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'

/**
 * 🎯 Aim Trainer — click targets as fast as you can for `seconds`. One target
 * at a time; each hit respawns it somewhere new. Score = hits. Misses are not
 * punished (tone rule) — they just aren't hits.
 *
 * Feel: a "Ready" countdown so the timer never starts mid-orientation, plus an
 * Easy/Medium/Hard picker that sets target size (and, on Hard, a shorter
 * on-screen lifetime). Within a round targets shrink slightly as the score
 * climbs (floored) so skilled players keep getting pushed.
 */

// Difficulty: starting target size in px and on-screen lifetime in ms (0 = the
// target stays until hit). Medium is the default and is immediately playable
// after the countdown without touching the picker.
const DIFFS = [
  { key: 'easy', name: 'Easy', size: 64, lifeMs: 0 },
  { key: 'medium', name: 'Medium', size: 48, lifeMs: 0 },
  { key: 'hard', name: 'Hard', size: 34, lifeMs: 1100 }
] as const

type Mode = (typeof DIFFS)[number]['key']

// Within-round ramp: shrink the target ~2px for every 4 hits, never below the
// floor, so the challenge grows but stays clickable (tone rule — no punishment).
const SHRINK_FLOOR = 28
function sizeFor(mode: Mode, score: number): number {
  const base = (DIFFS.find((d) => d.key === mode) ?? DIFFS[1]).size
  const shrunk = base - Math.floor(score / 4) * 2
  return Math.max(SHRINK_FLOOR, shrunk)
}

export function AimTrainer({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.aim
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [mode, setMode] = useState<Mode>('medium')
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [score, setScore] = useState(0)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const done = useRef(false)
  const lifeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cur = DIFFS.find((d) => d.key === mode) ?? DIFFS[1]
  const size = sizeFor(mode, score)

  // Difficulty is chosen during the "ready" countdown, then locked.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    setMode(m)
  }

  // Move the target to a fresh spot and (on Hard) arm its lifetime: if it isn't
  // hit in time it relocates — never a score penalty, just a new chance.
  const respawn = () => {
    setPos({ x: 6 + Math.random() * 88, y: 8 + Math.random() * 84 })
    if (lifeTimer.current) clearTimeout(lifeTimer.current)
    if (cur.lifeMs > 0) {
      lifeTimer.current = setTimeout(() => {
        if (!done.current) respawn()
      }, cur.lifeMs)
    }
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

  // First spawn arms any lifetime timer once play begins.
  useEffect(() => {
    if (phase !== 'playing') return
    respawn()
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      if (lifeTimer.current) clearTimeout(lifeTimer.current)
    }
    // respawn intentionally not a dep — we arm exactly once at play start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(score)
    }
  }, [timeLeft, score, onFinish])

  const hit = () => {
    if (done.current || phase !== 'playing') return
    play('good')
    setScore((s) => s + 1)
    respawn()
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🎯 {score} hits</span>
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="aim-field">
        {phase === 'ready' ? (
          <div className="cc-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              {DIFFS.map((d) => (
                <button
                  key={d.key}
                  className={`game-diff-opt${mode === d.key ? ' on' : ''}`}
                  onClick={() => pickMode(d.key)}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <span className="cc-ready-label">Click the targets fast…</span>
            <span className="cc-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          <button
            className="aim-target"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${size}px`,
              height: `${size}px`,
              fontSize: `${Math.round(size * 0.55)}px`
            }}
            onClick={hit}
            aria-label="target"
          >
            🎯
          </button>
        )}
      </div>
    </div>
  )
}
