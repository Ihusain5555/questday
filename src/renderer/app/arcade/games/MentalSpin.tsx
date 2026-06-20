import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { Fire } from '@phosphor-icons/react'
import { GameIcon } from '../gameIcons'
import { RoundTimer } from '../RoundTimer'

/**
 * 🌀 Mental Spin — mental rotation (the Shepard–Metzler paradigm). Two shapes
 * sit side by side: a REFERENCE (left) and a COMPARISON (right). The comparison
 * is the SAME shape, either purely ROTATED (answer "same") or MIRRORED then
 * rotated (answer "mirror"). Tap "Same" or "Mirror". Trains spatial reasoning.
 *
 * Made juicier (was "kind of boring"): a combo meter, a SPEED bonus for quick
 * correct calls, a brief verdict REVEAL after each answer (turns a miss into a
 * teaching moment, not a scold), and per-trial colour. The rotation still ramps
 * from clean 90° steps to arbitrary angles as the score climbs. A wrong call is
 * never punished — no point, combo resets, the reveal shows what it was (tone rule).
 */

const DURATION_S: number = balance.arcade.games.mentalspin.seconds
const REVEAL_MS: number = balance.arcade.games.mentalspin.revealMs
const FAST_MS: number = balance.arcade.games.mentalspin.fastMs

// Asymmetric (chiral) pentominoes — asymmetry is what makes a mirror tell-apart-able
// from a plain rotation; a symmetric shape would be ambiguous.
const SHAPES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], // L
  [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]], // P
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], // W / staircase
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] // skewed (offset T)
]

// Per-trial colour (both shapes share it, so colour is never a same/mirror cue —
// just visual variety, the bug-list "give the games more colour").
const MS_COLORS = ['#2fb380', '#f5b938', '#4a90e2', '#b566d6', '#ff7a45', '#3fe0a8']

type Answer = 'same' | 'mirror'
type Mode = 'easy' | 'medium' | 'hard'

interface Trial {
  shape: ReadonlyArray<readonly [number, number]>
  answer: Answer
  angle: number // degrees the comparison is rotated about its centre
  mirror: boolean // comparison flipped horizontally before rotating
  color: string
}

// The mode sets the angle GRANULARITY + ramp speed; the within-round staircase still
// pushes skilled players further.
function angleFor(score: number, mode: Mode): number {
  if (mode === 'easy') return Math.floor(Math.random() * 4) * 90 // 0/90/180/270, always
  if (mode === 'hard') {
    if (score < 2) return Math.floor(Math.random() * 8) * 45
    return Math.floor(Math.random() * 24) * 15
  }
  if (score < 4) return Math.floor(Math.random() * 4) * 90
  if (score < 9) return Math.floor(Math.random() * 8) * 45
  return Math.floor(Math.random() * 24) * 15
}

const COMPLEX_SHAPES = [2, 3]
function pickShape(mode: Mode): ReadonlyArray<readonly [number, number]> {
  if (mode === 'hard' && Math.random() < 0.65) {
    return SHAPES[COMPLEX_SHAPES[Math.floor(Math.random() * COMPLEX_SHAPES.length)]]
  }
  return SHAPES[Math.floor(Math.random() * SHAPES.length)]
}

function nextTrial(score: number, mode: Mode): Trial {
  const shape = pickShape(mode)
  const mirror = Math.random() < 0.5
  return {
    shape,
    answer: mirror ? 'mirror' : 'same',
    angle: angleFor(score, mode),
    mirror,
    color: MS_COLORS[Math.floor(Math.random() * MS_COLORS.length)]
  }
}

const CELL = 22
const BOX = 4
// Pad the viewBox so a shape rotated about its centre at ANY angle stays fully
// visible. A side-S square rotated about its centre needs a box of side S·√2, so pad
// each edge by (√2-1)/2·S. Width/height grow to match (1 unit = 1px), so the visible
// shape keeps its size — only transparent margin is added. (Closed-form; no getBBox.)
const SIZE = BOX * CELL // 88
const PAD = Math.ceil(((Math.SQRT2 - 1) / 2) * SIZE) // ≈19

function Shape({ cells, angle, flip, fill }: {
  cells: ReadonlyArray<readonly [number, number]>
  angle?: number
  flip?: boolean
  fill: string
}): JSX.Element {
  const c = SIZE / 2 // rotate about the ORIGINAL content-box centre, not the padded box
  const transform = `rotate(${angle ?? 0} ${c} ${c})${flip ? ` translate(${SIZE} 0) scale(-1 1)` : ''}`
  return (
    <svg
      className="ms-shape"
      width={SIZE + 2 * PAD}
      height={SIZE + 2 * PAD}
      viewBox={`${-PAD} ${-PAD} ${SIZE + 2 * PAD} ${SIZE + 2 * PAD}`}
    >
      <g transform={transform}>
        {cells.map(([x, y], i) => (
          <rect
            key={i}
            x={x * CELL + 1}
            y={y * CELL + 1}
            width={CELL - 2}
            height={CELL - 2}
            rx={3}
            fill={fill}
            stroke="#0e2a20"
            strokeWidth={2}
          />
        ))}
      </g>
    </svg>
  )
}

export function MentalSpin({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<'ready' | 'playing'>('ready')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [mode, setMode] = useState<Mode>('medium')
  const [trial, setTrial] = useState<Trial>(() => nextTrial(0, 'medium'))
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [verdict, setVerdict] = useState<{ correct: boolean; answer: Answer; fast: boolean } | null>(null)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const bestComboRef = useRef(0)
  const modeRef = useRef<Mode>('medium')
  const done = useRef(false)
  const answering = useRef(false) // locked during the reveal pause
  const trialAt = useRef(0) // when the current trial was shown (for the speed bonus)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pickMode = (m: Mode): void => {
    if (phase !== 'ready') return
    setMode(m)
    modeRef.current = m
    setTrial(nextTrial(0, m))
  }

  const finish = (): void => {
    if (done.current) return
    done.current = true
    if (flashTimer.current) clearTimeout(flashTimer.current)
    if (revealTimer.current) clearTimeout(revealTimer.current)
    onFinish(scoreRef.current)
  }

  // "Ready" countdown -> start play.
  useEffect(() => {
    if (phase !== 'ready') return
    if (count <= 0) {
      setPhase('playing')
      trialAt.current = performance.now()
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
  }, [phase, count])

  // The round clock.
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => {
      clearInterval(id)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (revealTimer.current) clearTimeout(revealTimer.current)
    }
  }, [phase])

  useEffect(() => {
    if (timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const answer = (choice: Answer): void => {
    if (done.current || phase !== 'playing' || answering.current) return
    answering.current = true
    const correct = choice === trial.answer
    const fast = correct && performance.now() - trialAt.current <= FAST_MS
    if (correct) {
      scoreRef.current += 1 + (fast ? 1 : 0) // a quick call is worth an extra point
      setScore(scoreRef.current)
      comboRef.current += 1
      setCombo(comboRef.current)
      if (comboRef.current > bestComboRef.current) {
        bestComboRef.current = comboRef.current
        setBestCombo(comboRef.current)
        play('best') // a little personal-best lift each new high this round
      } else {
        play('good')
      }
    } else {
      comboRef.current = 0
      setCombo(0)
      play('bad') // gentle blip — no point, no penalty (tone rule)
    }
    setFlash(correct ? 'good' : 'bad')
    setVerdict({ correct, answer: trial.answer, fast })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 220)
    // Brief reveal pause: shows what the answer WAS (teaches), then the next trial.
    if (revealTimer.current) clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => {
      if (done.current) return
      setVerdict(null)
      answering.current = false
      setTrial(nextTrial(scoreRef.current, modeRef.current))
      trialAt.current = performance.now()
    }, REVEAL_MS)
  }

  const endEarly = finish

  return (
    <div className="game-shell">
      <RoundTimer timeLeft={timeLeft} total={DURATION_S} />
      <div className="game-hud">
        <span><GameIcon k="mentalspin" size={15} /> {score}</span>
        {combo >= 2 && <span className="cc-combo"><Fire size={14} weight="fill" color="var(--fire)" /> {combo}</span>}
        {bestCombo >= 2 && <span className="meta-dim">best {bestCombo}</span>}
        <button onClick={endEarly}>End round</button>
      </div>
      <div className={`ms-field${flash === 'bad' ? ' ms-flash' : ''}`} data-answer={trial.answer}>
        {phase === 'ready' ? (
          <div className="ms-ready">
            <div className="game-diff" role="group" aria-label="difficulty">
              <button className={'game-diff-opt' + (mode === 'easy' ? ' on' : '')} onClick={() => pickMode('easy')}>
                Easy
              </button>
              <button className={'game-diff-opt' + (mode === 'medium' ? ' on' : '')} onClick={() => pickMode('medium')}>
                Medium
              </button>
              <button className={'game-diff-opt' + (mode === 'hard' ? ' on' : '')} onClick={() => pickMode('hard')}>
                Hard
              </button>
            </div>
            <span className="meta-dim">
              Left = the original shape. Right = the same shape turned — or its mirror image.
              Tap “Same” if it’s only rotated, “Mirror” if it’s flipped. Answer fast for a combo.
            </span>
            <span className="ms-ready-count">{count > 0 ? count : 'Go!'}</span>
          </div>
        ) : (
          <>
            <div className="ms-board">
              <Shape cells={trial.shape} fill={trial.color} />
              <Shape cells={trial.shape} angle={trial.angle} flip={trial.mirror} fill={trial.color} />
            </div>
            {verdict ? (
              <div className={`ms-verdict ${verdict.correct ? 'good' : 'bad'}`}>
                {verdict.correct ? (verdict.fast ? 'Fast! ' : 'Nice — ') : 'It was '}
                <strong>{verdict.answer === 'mirror' ? 'a mirror' : 'just rotated'}</strong>
              </div>
            ) : (
              <div className="ms-choices" role="group" aria-label="rotation or mirror">
                <button className="ms-choice ms-same primary" onClick={() => answer('same')} disabled={answering.current}>
                  Same
                </button>
                <button className="ms-choice ms-mirror primary" onClick={() => answer('mirror')} disabled={answering.current}>
                  Mirror
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
