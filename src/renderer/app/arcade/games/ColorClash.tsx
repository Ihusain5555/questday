import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Fire } from '@phosphor-icons/react'
import { GameIcon } from '../gameIcons'
import { RoundTimer } from '../RoundTimer'

/**
 * 🎨 Color Clash — the Stroop task as a game. A colour WORD is painted in a
 * (usually different) ink colour; tap the swatch matching the INK, not the word.
 * Trains inhibitory control — overriding the automatic urge to read.
 *
 * Modes escalate the SAME verb (tap a swatch matching a word's ink), only the number
 * of words-in-flight grows — a true difficulty ramp, not three different games:
 *   • Easy   — 1 word (the original).
 *   • Medium — 2 words; answer each ink LEFT→RIGHT.
 *   • Hard   — 4 words in a row; answer each ink LEFT→RIGHT.
 * All words stay visible the whole time and a glowing pointer marks the CURRENT word,
 * so the load is Stroop inhibition + serial order — never "memorise the words" (a memory
 * load would actually KILL the Stroop conflict; research note). Timed; +1 per correct ink
 * tap, plus a flawless-row bonus. A wrong tap isn't punished — no point, combo resets, and
 * you retry the same word (tone rule).
 */

const COLORS = [
  { name: 'RED', css: '#ef4444' },
  { name: 'GREEN', css: '#2fb380' },
  { name: 'BLUE', css: '#4a90e2' },
  { name: 'YELLOW', css: '#f5b938' },
  { name: 'PURPLE', css: '#b566d6' },
  { name: 'ORANGE', css: '#ff7a45' }
]

interface WordItem {
  word: string // the text shown (a colour name — the distractor)
  ink: number // index into COLORS — the correct answer for this word
}
interface Prompt {
  words: WordItem[] // a ROW of words, answered left→right
  options: number[] // ONE shared palette of swatch colour indices (includes every word's ink)
}

// Difficulty mode: number of words in a row + swatch count + how often the word is
// incongruent with the ink. Easy/Medium/Hard — default = medium.
type Mode = 'easy' | 'medium' | 'hard'
const MODES: { key: Mode; name: string; words: number; count: number; incong: number }[] = [
  { key: 'easy', name: 'Easy', words: 1, count: 4, incong: 0.6 },
  { key: 'medium', name: 'Medium', words: 2, count: 5, incong: 0.8 },
  { key: 'hard', name: 'Hard', words: 4, count: 6, incong: 0.9 }
]

function makeWord(incong: number): WordItem {
  const ink = Math.floor(Math.random() * COLORS.length)
  // Incongruent: the word names a different colour than the ink (the clash).
  let wordIdx = ink
  if (Math.random() < incong) {
    do {
      wordIdx = Math.floor(Math.random() * COLORS.length)
    } while (wordIdx === ink)
  }
  return { word: COLORS[wordIdx].name, ink }
}

// Build a row of `words` words + ONE shared palette of `count` swatches that always
// contains every word's ink (so each is answerable), plus distractors, shuffled.
function nextPrompt(words: number, count: number, incong: number): Prompt {
  const items: WordItem[] = []
  for (let i = 0; i < words; i++) items.push(makeWord(incong))
  const opts: number[] = []
  for (const w of items) if (!opts.includes(w.ink)) opts.push(w.ink)
  while (opts.length < count) {
    const c = Math.floor(Math.random() * COLORS.length)
    if (!opts.includes(c)) opts.push(c)
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return { words: items, options: opts }
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
  const [prompt, setPrompt] = useState<Prompt>(() => nextPrompt(MODES[1].words, MODES[1].count, MODES[1].incong))
  const [cursor, setCursor] = useState(0) // which word in the row is the current target
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [pop, setPop] = useState(0) // bumps a floating "+1" on each correct tap
  const rowClean = useRef(true) // no wrong tap this row → flawless-row bonus
  const done = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Difficulty is chosen during the "ready" countdown, then locked.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    const picked = MODES.find((x) => x.key === m) ?? MODES[1]
    setMode(m)
    setCursor(0)
    rowClean.current = true
    setPrompt(nextPrompt(picked.words, picked.count, picked.incong))
  }

  // Within-round ramp: every +5 combo nudges incongruence up a touch (cap 0.95).
  const rampedIncong = (c: number): number => Math.min(0.95, cur.incong + Math.floor(c / 5) * 0.02)

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

  const flashNow = (kind: 'good' | 'bad') => {
    setFlash(kind)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 180)
  }

  const pick = (idx: number) => {
    if (done.current || phase !== 'playing') return
    const targetWord = prompt.words[cursor]
    const correct = idx === targetWord.ink
    if (!correct) {
      // Wrong: no point, combo resets, retry the SAME word — never a penalty (tone rule).
      play('bad')
      setCombo(0)
      rowClean.current = false
      flashNow('bad')
      return
    }
    play('good')
    setPop((p) => p + 1)
    flashNow('good')
    let nextCombo = 0
    setCombo((c) => {
      nextCombo = c + 1
      setBestCombo((b) => Math.max(b, nextCombo))
      return nextCombo
    })
    const nextCursor = cursor + 1
    if (nextCursor < prompt.words.length) {
      // mid-row: bank the word, advance the pointer
      setScore((s) => s + 1)
      setCursor(nextCursor)
      return
    }
    // row complete: +1 for this word + a flawless-row bonus (= word count) if no slip.
    const bonus = rowClean.current && prompt.words.length > 1 ? prompt.words.length : 0
    if (bonus > 0) play('best')
    setScore((s) => s + 1 + bonus)
    rowClean.current = true
    setCursor(0)
    setPrompt(nextPrompt(cur.words, cur.count, rampedIncong(nextCombo)))
  }

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  const multi = prompt.words.length > 1

  return (
    <div className="game-shell">
      <RoundTimer timeLeft={timeLeft} total={cfg.seconds} />
      <div className="game-hud">
        <span><GameIcon k="colorclash" size={15} /> {score}</span>
        {combo >= 2 && <span className="cc-combo"><Fire size={14} weight="fill" color="var(--fire)" /> {combo}</span>}
        {bestCombo >= 2 && <span className="meta-dim">best {bestCombo}</span>}
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
            <div className="cc-instruction meta-dim">
              {multi
                ? 'Tap the ink colour of each word, left to right — ignore what they say.'
                : 'Tap the colour it’s written in — ignore the word.'}
            </div>
            <div className={`cc-words${multi ? '' : ' single'}`} data-cursor={cursor}>
              {prompt.words.map((w, i) => (
                <span
                  key={i}
                  className={`cc-word${i === cursor ? ' active' : ''}${i < cursor ? ' done' : ''}`}
                  style={{ color: COLORS[w.ink].css }}
                >
                  {w.word}
                  {i < cursor && <span className="cc-word-check">✓</span>}
                </span>
              ))}
            </div>
            {multi && (
              <div className="cc-progress" aria-hidden="true">
                {prompt.words.map((_, i) => (
                  <span key={i} className={`cc-dot${i < cursor ? ' filled' : ''}${i === cursor ? ' cur' : ''}`} />
                ))}
              </div>
            )}
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
