import { useEffect, useMemo, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { Timer } from '@phosphor-icons/react'

const POOL = ['🌷', '🏰', '🌽', '🚀', '🐉', '⛲', '🍉', '🛰️', '🌻', '👑', '🎃', '🔭']

/**
 * 🧠 Memory Match — flip cards to find the 8 pairs before time runs out.
 * Score = pairs found + a calm time bonus. Running out of time just ends the
 * round with what you found (never a fail state).
 */
export function MemoryMatch({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.memory
  const deck = useMemo(() => {
    const pick = [...POOL].sort(() => Math.random() - 0.5).slice(0, 8)
    return [...pick, ...pick]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji }))
  }, [])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const done = useRef(false)

  const pairs = matched.size / 2
  const score = pairs + Math.floor(Math.max(0, timeLeft) / 12)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Finish on full clear or timeout — exactly once.
  useEffect(() => {
    if (done.current) return
    if (matched.size === deck.length || timeLeft <= 0) {
      done.current = true
      onFinish(score)
    }
  }, [matched, timeLeft, deck.length, score, onFinish])

  const flip = (id: number) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.has(id)) return
    const next = [...flipped, id]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next
      if (deck[a].emoji === deck[b].emoji) {
        setMatched((m) => new Set([...m, a, b]))
        setFlipped([])
      } else {
        setTimeout(() => setFlipped([]), 700)
      }
    }
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🧠 {pairs}/8 pairs</span>
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="memory-grid">
        {deck.map((card) => {
          const up = flipped.includes(card.id) || matched.has(card.id)
          return (
            <button
              key={card.id}
              className={`memory-card ${up ? 'up' : ''} ${matched.has(card.id) ? 'matched' : ''}`}
              onClick={() => flip(card.id)}
            >
              {up ? card.emoji : '❔'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
