import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Timer, Question } from '@phosphor-icons/react'
import { GameIcon, MemoryFace, MEMORY_FACE_COUNT } from '../gameIcons'

// Card faces are indices into the shared Phosphor face set (see gameIcons):
// distinct shapes, all drawn in one gold tone, so you recall by shape + position
// (not colour) — keeping the memory challenge honest.
const FACES = Array.from({ length: MEMORY_FACE_COUNT }, (_, i) => i)

interface Card {
  id: number
  face: number
}

// Difficulty: board size (pair count) and a time adjustment vs the base seconds.
// Easy = fewer pairs + extra time, Hard = more pairs + less time. The grid
// renders cleanly for each count (the CSS auto-fills the row). 'medium' is the
// default so Playwright can drive the round straight after the countdown.
type Mode = 'easy' | 'medium' | 'hard'
const DIFFS: Record<Mode, { pairs: number; timeDelta: number }> = {
  easy: { pairs: 6, timeDelta: 30 },
  medium: { pairs: 8, timeDelta: 0 },
  hard: { pairs: 10, timeDelta: -20 }
}

function buildDeck(pairs: number): Card[] {
  const pick = [...FACES].sort(() => Math.random() - 0.5).slice(0, pairs)
  return [...pick, ...pick]
    .sort(() => Math.random() - 0.5)
    .map((face, i) => ({ id: i, face }))
}

/**
 * 🧠 Memory Match — flip cards to find every pair before time runs out.
 * Board size + time scale with difficulty: Easy = 6 pairs (more time),
 * Medium = 8 pairs, Hard = 10 pairs (less time). Score = pairs found + a calm
 * time bonus. Running out of time just ends the round with what you found
 * (never a fail state — tone rule). A mismatch never costs a point; the cards
 * simply flip back with a gentle blip.
 */
export function MemoryMatch({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.memory
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [mode, setMode] = useState<Mode>('medium')
  const cur = DIFFS[mode]
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(DIFFS.medium.pairs))
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds + DIFFS.medium.timeDelta)
  const done = useRef(false)
  const flipBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pairCount = cur.pairs
  const pairs = matched.size / 2
  const score = pairs + Math.floor(Math.max(0, timeLeft) / 12)

  // Difficulty is chosen during the "ready" countdown, then locked. Picking a
  // mode rebuilds the board to its pair count and resets the (mode-scaled) clock.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    setMode(m)
    setDeck(buildDeck(DIFFS[m].pairs))
    setFlipped([])
    setMatched(new Set())
    setTimeLeft(cfg.seconds + DIFFS[m].timeDelta)
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

  // Cancel a pending mismatch flip-back if the round ends / the game unmounts
  // mid-wait, so the orphaned timer can't fire setState on a dead component.
  useEffect(
    () => () => {
      if (flipBackTimer.current) clearTimeout(flipBackTimer.current)
    },
    []
  )

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Finish on full clear or timeout — exactly once.
  useEffect(() => {
    if (done.current) return
    if (phase !== 'playing') return
    const cleared = matched.size === deck.length
    if (cleared || timeLeft <= 0) {
      done.current = true
      if (cleared) play('best')
      onFinish(score)
    }
  }, [phase, matched, timeLeft, deck.length, score, onFinish])

  const flip = (id: number) => {
    if (done.current || phase !== 'playing') return
    if (flipped.length === 2 || flipped.includes(id) || matched.has(id)) return
    const next = [...flipped, id]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next
      if (deck[a].face === deck[b].face) {
        play('good')
        setMatched((m) => new Set([...m, a, b]))
        setFlipped([])
      } else {
        // Tone rule: a wrong pair never punishes — no point lost, the cards just
        // flip back with a soft blip and you try again.
        play('bad')
        if (flipBackTimer.current) clearTimeout(flipBackTimer.current)
        flipBackTimer.current = setTimeout(() => setFlipped([]), 700)
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
        <span><GameIcon k="memory" size={15} /> {pairs}/{pairCount} pairs</span>
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      {phase === 'ready' ? (
        <div className="memory-grid memory-ready">
          <div className="game-diff" role="group" aria-label="difficulty">
            <button
              className={'game-diff-opt' + (mode === 'easy' ? ' on' : '')}
              onClick={() => pickMode('easy')}
            >
              Easy
            </button>
            <button
              className={'game-diff-opt' + (mode === 'medium' ? ' on' : '')}
              onClick={() => pickMode('medium')}
            >
              Medium
            </button>
            <button
              className={'game-diff-opt' + (mode === 'hard' ? ' on' : '')}
              onClick={() => pickMode('hard')}
            >
              Hard
            </button>
          </div>
          <span className="cc-ready-label">{pairCount} pairs — memorise the flips…</span>
          <span className="cc-ready-count">{count > 0 ? count : 'Go!'}</span>
        </div>
      ) : (
        <div className="memory-grid">
          {deck.map((card) => {
            const up = flipped.includes(card.id) || matched.has(card.id)
            return (
              <button
                key={card.id}
                className={`memory-card ${up ? 'up' : ''} ${matched.has(card.id) ? 'matched' : ''}`}
                onClick={() => flip(card.id)}
              >
                {up ? <MemoryFace face={card.face} size={30} /> : <Question size={26} weight="bold" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
