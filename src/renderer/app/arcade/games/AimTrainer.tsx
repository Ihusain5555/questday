import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { GameIcon } from '../gameIcons'
import { RoundTimer } from '../RoundTimer'

/**
 * 🎯 Aim Trainer — click targets as fast as you can for `seconds`. Now with a MODE
 * picker (like Aim Lab's task list) chosen before the round, instead of Easy/Med/Hard:
 *   • Classic   — one target; hit it and it jumps somewhere new. The original.
 *   • Speed     — THREE targets at once; hit any and it respawns, so there are always
 *                 three on screen (the "2–3 dots, click as many as you can" request).
 *   • Precision — one SMALL target worth DOUBLE (so it isn't just a worse Classic).
 *   • Reflex    — one target that VANISHES if you're too slow, then a fresh one appears.
 * Misses are never punished (tone rule) — they just aren't hits. Mode params live in
 * balance.ts (arcade.games.aim.modes). A "Ready" countdown so the clock never starts cold.
 */

type ModeKey = 'classic' | 'speed' | 'precision' | 'reflex'
// Read via STATIC key so the per-mode fields survive the union-type narrowing.
const MODES = balance.arcade.games.aim.modes
const MODE_LIST: { key: ModeKey; name: string; blurb: string }[] = [
  { key: 'classic', name: 'Classic', blurb: 'One target — hit it and it jumps.' },
  { key: 'speed', name: 'Speed', blurb: 'Three at once — hit as many as you can!' },
  { key: 'precision', name: 'Precision', blurb: 'A small target — worth double.' },
  { key: 'reflex', name: 'Reflex', blurb: 'Hit it before it vanishes.' }
]

interface Target {
  id: number
  x: number // % of field
  y: number // % of field
}

// Min separation between target centres (% of field) so dots never overlap.
const MIN_GAP_PCT = 22

// A fresh spawn position kept clear of `others` (reject-and-retry) and inset so a
// centred target never clips the field edge.
function spawnPos(others: Target[]): { x: number; y: number } {
  for (let tries = 0; tries < 40; tries++) {
    const x = 10 + Math.random() * 80
    const y = 12 + Math.random() * 76
    if (others.every((o) => Math.hypot(o.x - x, o.y - y) >= MIN_GAP_PCT)) return { x, y }
  }
  return { x: 10 + Math.random() * 80, y: 12 + Math.random() * 76 }
}

export function AimTrainer({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.aim
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [mode, setMode] = useState<ModeKey>('speed') // default = the headline 3-dot mode
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [score, setScore] = useState(0)
  const [targets, setTargets] = useState<Target[]>([])
  const done = useRef(false)
  const idRef = useRef(0)
  const lifeTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const cur = MODES[mode]
  const size: number = cur.size
  const pts: number = cur.pts
  const lifeMs: number = cur.lifeMs

  const pickMode = (m: ModeKey) => {
    if (phase !== 'ready') return
    setMode(m)
  }

  const newTarget = (others: Target[]): Target => {
    const { x, y } = spawnPos(others)
    return { id: idRef.current++, x, y }
  }

  // Reflex only: if a target isn't hit in lifeMs it relocates (never a score penalty).
  const armLife = (t: Target) => {
    if (lifeMs <= 0) return
    const id = setTimeout(() => {
      if (done.current) return
      lifeTimers.current.delete(t.id)
      setTargets((ts) => {
        const others = ts.filter((x) => x.id !== t.id)
        const fresh = newTarget(others)
        armLife(fresh)
        return [...others, fresh]
      })
    }, lifeMs)
    lifeTimers.current.set(t.id, id)
  }

  const clearLifeTimers = () => {
    lifeTimers.current.forEach((id) => clearTimeout(id))
    lifeTimers.current.clear()
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

  // Spawn the initial target(s) + start the clock once play begins.
  useEffect(() => {
    if (phase !== 'playing') return
    const initial: Target[] = []
    for (let i = 0; i < cur.count; i++) initial.push(newTarget(initial))
    setTargets(initial)
    initial.forEach(armLife)
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      clearLifeTimers()
    }
    // spawn exactly once at play start — the mode is locked by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(score)
    }
  }, [timeLeft, score, onFinish])

  const hit = (t: Target) => {
    if (done.current || phase !== 'playing') return
    play('good')
    setScore((s) => s + pts)
    // Cancel this target's life timer and replace ONLY it (others stay put).
    const lid = lifeTimers.current.get(t.id)
    if (lid) {
      clearTimeout(lid)
      lifeTimers.current.delete(t.id)
    }
    setTargets((ts) => {
      const others = ts.filter((x) => x.id !== t.id)
      const fresh = newTarget(others)
      armLife(fresh)
      return [...others, fresh]
    })
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <RoundTimer timeLeft={timeLeft} total={cfg.seconds} />
      <div className="game-hud">
        <span><GameIcon k="aim" size={15} /> {score} {score === 1 ? 'hit' : 'hits'}</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className="aim-field">
        {phase === 'ready' ? (
          <div className="cc-ready">
            <div className="game-diff" role="group" aria-label="mode">
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
            <span className="cc-ready-label">{MODE_LIST.find((m) => m.key === mode)?.blurb}</span>
            <span className="cc-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          targets.map((t) => (
            <button
              key={t.id}
              className="aim-target"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `${size}px`,
                height: `${size}px`
              }}
              onClick={() => hit(t)}
              aria-label="target"
            >
              {/* Icon scales WITH the target and never eats the click (pointer-events:none
                  in CSS) so every tap inside the circle lands. */}
              <GameIcon k="aim" size={Math.min(34, Math.round(size * 0.7))} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
