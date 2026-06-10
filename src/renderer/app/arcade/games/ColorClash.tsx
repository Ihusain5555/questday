import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Timer, Fire } from '@phosphor-icons/react'
import { GameIcon } from '../gameIcons'

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

// Difficulty mode: how many swatches to choose among, and how often the word is
// incongruent with the ink (the harder it is to ignore the word). Easy/Medium/
// Hard — the consistent arcade difficulty system. Default = medium.
type Mode = 'easy' | 'medium' | 'hard'
const MODES: { key: Mode; name: string; count: number; incong: number }[] = [
  { key: 'easy', name: 'Easy', count: 4, incong: 0.6 },
  { key: 'medium', name: 'Medium', count: 5, incong: 0.8 },
  { key: 'hard', name: 'Hard', count: 6, incong: 0.9 }
]

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
  const [mode, setMode] = useState<Mode>('medium')
  const cur = MODES.find((m) => m.key === mode) ?? MODES[1]
  const [prompt, setPrompt] = useState<Prompt>(() => nextPrompt(MODES[1].count, MODES[1].incong))
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [pop, setPop] = useState(0) // bumps a floating "+1" on each correct tap

  // Difficulty is chosen during the "ready" countdown, then locked.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    const picked = MODES.find((x) => x.key === m) ?? MODES[1]
    setMode(m)
    setPrompt(nextPrompt(picked.count, picked.incong))
  }
  const done = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Within-round ramp: every +5 combo nudges incongruence up a touch (cap 0.95),
  // so a skilled player on any mode keeps getting pushed.
  const rampedIncong = (combo: number): number =>
    Math.min(0.95, cur.incong + Math.floor(combo / 5) * 0.02)

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
    let nextCombo = 0
    if (correct) {
      play('good')
      setScore((s) => s + 1)
      setPop((p) => p + 1)
      setCombo((c) => {
        nextCombo = c + 1
        setBestCombo((b) => Math.max(b, nextCombo))
        return nextCombo
      })
    } else {
      play('bad')
      setCombo(0)
    }
    setFlash(correct ? 'good' : 'bad')
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 180)
    // Mode sets the starting incongruence; the combo ramp nudges it up within the round.
    setPrompt(nextPrompt(cur.count, rampedIncong(nextCombo)))
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span><GameIcon k="colorclash" size={15} /> {score}</span>
        {combo >= 2 && <span className="cc-combo"><Fire size={14} weight="fill" color="var(--fire)" /> {combo}</span>}
        {bestCombo >= 2 && <span className="meta-dim">best {bestCombo}</span>}
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <div className={`cc-field ${flash ?? ''}`}>
        {phase === 'ready' ? (
          <div className="cc-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  className={`game-diff-opt${mode === m.key ? ' on' : ''}`}
                  onClick={() => pickMode(m.key)}
                >
                  {m.name}
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
