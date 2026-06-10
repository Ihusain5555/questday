import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { Timer } from '@phosphor-icons/react'

/**
 * 🎯 Aim Trainer — click targets as fast as you can for `seconds`. One target
 * at a time; each hit respawns it somewhere new. Score = hits. Misses are not
 * punished (tone rule) — they just aren't hits.
 */
export function AimTrainer({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.aim
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [score, setScore] = useState(0)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const done = useRef(false)

  // Countdown; finish exactly once.
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(score)
    }
  }, [timeLeft, score, onFinish])

  const hit = () => {
    setScore((s) => s + 1)
    setPos({ x: 6 + Math.random() * 88, y: 8 + Math.random() * 84 })
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
        <button
          className="aim-target"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          onClick={hit}
          aria-label="target"
        >
          🎯
        </button>
      </div>
    </div>
  )
}
