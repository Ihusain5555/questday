import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

/**
 * 🎨 Color Clash — the Stroop task as a game. A colour WORD is painted in a
 * (usually different) ink colour; tap the swatch matching the INK, not the
 * word. Trains inhibitory control — overriding the automatic urge to read.
 * Timed; score = correct taps. A wrong tap isn't punished — it just isn't a
 * point, and the next prompt comes right up (tone rule).
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

function nextPrompt(): Prompt {
  const ink = Math.floor(Math.random() * COLORS.length)
  // 75% incongruent: the word names a different colour than the ink (the clash).
  let wordIdx = ink
  if (Math.random() < 0.75) {
    do {
      wordIdx = Math.floor(Math.random() * COLORS.length)
    } while (wordIdx === ink)
  }
  // 4 swatches: the ink plus 3 distinct distractors, shuffled.
  const opts = [ink]
  while (opts.length < 4) {
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
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const [score, setScore] = useState(0)
  const [prompt, setPrompt] = useState<Prompt>(() => nextPrompt())
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const done = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(score)
    }
  }, [timeLeft, score, onFinish])

  const pick = (idx: number) => {
    if (done.current) return
    const correct = idx === prompt.ink
    if (correct) setScore((s) => s + 1)
    setFlash(correct ? 'good' : 'bad')
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 180)
    setPrompt(nextPrompt())
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
        <span>⏱ {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className={`cc-field ${flash ?? ''}`}>
        <div className="cc-instruction meta-dim">Tap the colour it’s written in — ignore the word.</div>
        <div className="cc-word" style={{ color: COLORS[prompt.ink].css }}>
          {prompt.word}
        </div>
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
      </div>
    </div>
  )
}
