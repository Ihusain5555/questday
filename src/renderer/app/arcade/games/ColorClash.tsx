import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Timer } from '@phosphor-icons/react'

/**
 * 🎨 Color Clash — the Stroop task as a game. A colour WORD is painted in a
 * (usually different) ink colour; tap the swatch matching the INK, not the
 * word. Trains inhibitory control — overriding the automatic urge to read.
 * Timed; score = correct taps. A wrong tap isn't punished — it just isn't a
 * point and resets your combo, and the next prompt comes right up (tone rule).
 *
 * Feel: a "Ready" countdown so the timer never starts mid-orientation, and a
 * combo meter (current + best streak this round) for a little chase.
 */

const COLORS = [
  { name: 'RED', css: '#ef4444' },
  { name: 'GREEN', css: '#2fb380' },
  { name: 'BLUE', css: '#4a90e2' },
  { name: 'YELLOW', css: '#f5b938' },
  { name: 'PURPLE', css: '#b566d6' },
  { name: 'ORANGE', css: '#ff7a45' }
]

interface Prompt {
  word: string // the text shown (a colour name — the distractor)
  ink: number // index into COLORS — the correct answer
  options: number[] // shuffled colour indices to choose from (includes ink)
}

// Difficulty: how many swatches to choose among, and how often the word is
// incongruent with the ink (the harder it is to ignore the word).
const DIFFS = [
  { key: 'calm', name: 'Calm', count: 4, incong: 0.7 },
  { key: 'spicy', name: 'Spicy', count: 6, incong: 0.85 }
] as const

function nextPrompt(count: number, incong: number): Prompt {
  const ink = Math.floor(Math.random() * COLORS.length)
  // Incongruent: the word names a different colour than the ink (the clash).
  let wordIdx = ink
  if (Math.random() < incong) {
    do {
      wordIdx = Math.floor(Math.random() * COLORS.length)
    } while (wordIdx === ink)
  }
  // `count` swatches: the ink plus distinct distractors, shuffled.
  const opts = [ink]
  while (opts.length < count) {
    const c = Math.floor(Math.random() * COLORS.length)
    if (!opts.includes(c)) opts.push(c)
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return { word: COLORS[wordIdx].name, ink, options: opts }
}

export function ColorClash({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.colorclash
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [diff, setDiff] = useState<(typeof DIFFS)[number]['key']>('calm')
  const cur = DIFFS.find((d) => d.key === diff) ?? DIFFS[0]
  const [prompt, setPrompt] = useState<Prompt>(() => nextPrompt(DIFFS[0].count, DIFFS[0].incong))
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [pop, setPop] = useState(0) // bumps a floating "+1" on each correct tap

  // Difficulty is chosen during the "ready" countdown, then locked.
  const pickDiff = (d: (typeof DIFFS)[number]) => {
    if (phase !== 'ready') return
    setDiff(d.key)
    setPrompt(nextPrompt(d.count, d.incong))
  }
  const done = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(score)
    }
  }, [timeLeft, score, onFinish])

  const pick = (idx: number) => {
    if (done.current || phase !== 'playing') return
    const correct = idx === prompt.ink
    if (correct) {
      play('good')
      setScore((s) => s + 1)
      setPop((p) => p + 1)
      setCombo((c) => {
        const n = c + 1
        setBestCombo((b) => Math.max(b, n))
        return n
      })
    } else {
      play('bad')
      setCombo(0)
    }
    setFlash(correct ? 'good' : 'bad')
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 180)
    setPrompt(nextPrompt(cur.count, cur.incong))
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🎨 {score}</span>
        {combo >= 2 && <span className="cc-combo">🔥 {combo}</span>}
        {bestCombo >= 2 && <span className="meta-dim">best {bestCombo}</span>}
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className={`cc-field ${flash ?? ''}`}>
        {phase === 'ready' ? (
          <div className="cc-ready">
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
            <span className="cc-ready-label">Tap the colour, not the word…</span>
            <span className="cc-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          <>
            <div className="cc-instruction meta-dim">Tap the colour it’s written in — ignore the word.</div>
            <div className="cc-word" style={{ color: COLORS[prompt.ink].css }}>
              {prompt.word}
            </div>
            {pop > 0 && (
              <span key={pop} className="cc-pop">
                +1
              </span>
            )}
            <div className="cc-options">
              {prompt.options.map((c) => (
                <button
                  key={c}
                  className="cc-swatch"
                  style={{ background: COLORS[c].css }}
                  onClick={() => pick(c)}
                  aria-label={COLORS[c].name}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
