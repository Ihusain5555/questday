import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { play } from '../sound'
import { GameIcon } from '../gameIcons'

/**
 * 🎨 Color Recreation — a colour-perception & visual-memory drill (the dialed.gg
 * "colour" game). A target colour flashes for a moment, then hides; rebuild it from
 * memory with Hue / Saturation / Brightness sliders. Each round scores 0–10 from how
 * close you got (perceptual RGB distance); 5 rounds make a 0–50 run.
 *
 * Tone rule (NEVER punishing): no lives, no game-over, no point loss. A weak round
 * just scores low AND the NEXT reveal lingers a touch longer (a gentle staircase ease,
 * exactly like Flash Recall / Span Recall). You always finish all 5 rounds.
 *
 * Difficulty escalates ONE verb — "match the colour": Easy matches hue only (S/B given,
 * long look, a faint reference stays); Medium adds saturation (shorter, no reference);
 * Hard matches all three at a blink-long look. Tunables live in balance.ts
 * (arcade.games.colorrecall).
 */

const cfg = balance.arcade.games.colorrecall
const ROUNDS: number = cfg.rounds

type Mode = 'easy' | 'medium' | 'hard'
type Phase = 'setup' | 'countdown' | 'reveal' | 'guess' | 'result' | 'summary'
interface HSB {
  h: number
  s: number
  b: number
}

// Per-tier config (read via STATIC key so the as-const union doesn't narrow it away).
const TIERS = cfg.tiers
const MODE_LIST: { key: Mode; name: string; bar: string; desc: string }[] = [
  {
    key: 'easy',
    name: 'Easy',
    bar: 'linear-gradient(90deg,#e7556a,#e7a955,#7bd17b,#56b6e7,#9b7bd1)',
    desc: 'Match the hue only — saturation & brightness are given. Long look, a faint reference stays on screen, generous scoring.'
  },
  {
    key: 'medium',
    name: 'Medium',
    bar: 'linear-gradient(90deg,#7a3640,#c98a1e,#2f8a52,#2f6a8a)',
    desc: 'Match hue + saturation — brightness is given. Quicker look, no reference, tighter scoring.'
  },
  {
    key: 'hard',
    name: 'Hard',
    bar: 'linear-gradient(90deg,#2a1a30,#5a2f3a,#2f5a4a,#1a2a3a,#403050)',
    desc: 'Match all three — hue, saturation & brightness. A blink-long look, no help, tightest scoring.'
  }
]

// ---- colour math (pure) ---------------------------------------------------
function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  s /= 100
  b /= 100
  const k = (n: number): number => (n + h / 60) % 6
  const f = (n: number): number => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)))
  return [Math.round(255 * f(5)), Math.round(255 * f(3)), Math.round(255 * f(1))]
}
function hsbCss(h: number, s: number, b: number): string {
  const [r, g, bl] = hsbToRgb(h, s, b)
  return `rgb(${r}, ${g}, ${bl})`
}
// Perceptual-ish "redmean" distance between two RGB colours.
function rgbDist(c1: [number, number, number], c2: [number, number, number]): number {
  const rm = (c1[0] + c2[0]) / 2
  const dr = c1[0] - c2[0]
  const dg = c1[1] - c2[1]
  const db = c1[2] - c2[2]
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
}
function scoreGuess(target: HSB, guess: HSB, tol: number): number {
  const d = rgbDist(hsbToRgb(target.h, target.s, target.b), hsbToRgb(guess.h, guess.s, guess.b))
  return Math.round(Math.max(0, Math.min(10, 10 * (1 - d / tol))))
}
const randInt = (a: number, b: number): number => Math.floor(a + Math.random() * (b - a + 1))
function makeTarget(mode: Mode): HSB {
  const t = TIERS[mode]
  return { h: randInt(0, 359), s: randInt(t.sRange[0], t.sRange[1]), b: randInt(t.bRange[0], t.bRange[1]) }
}

function encourageLine(sc: number): string {
  if (sc >= 9) return 'Incredible eye — almost perfect!'
  if (sc >= 7) return 'Great match, really close.'
  if (sc >= 5) return "Nice — you're in the right family."
  if (sc >= 3) return "Good effort, the hue's coming through."
  return 'No worries — colour is tricky. The next one lingers a little longer.'
}
function summaryLine(t: number): string {
  if (t >= 45) return 'Master colourist — your eye is dialed in.'
  if (t >= 35) return 'Sharp eye for colour.'
  if (t >= 25) return 'Solid colour sense — keep sharpening it.'
  if (t >= 15) return 'Warming up — your eye is learning.'
  return 'Every round trains your eye. Come back and beat it!'
}

export function ColorRecreation({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('easy')
  const [count, setCount] = useState(3)
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState<HSB | null>(null)
  const [h, setH] = useState(180)
  const [s, setS] = useState(50)
  const [b, setB] = useState(60)
  const [scores, setScores] = useState<number[]>([])
  const [targets, setTargets] = useState<HSB[]>([])
  const [guesses, setGuesses] = useState<HSB[]>([])
  const [lastScore, setLastScore] = useState(0)
  const [eased, setEased] = useState(false) // show the "taking it slower" note

  const tier = TIERS[mode]
  const targetRef = useRef<HSB | null>(null) // latest target for timeout callbacks (no stale closure)
  const easeBoost = useRef(0) // ms added to the reveal after a weak round (tone rule)
  const done = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = (): void => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const finish = (total: number): void => {
    if (done.current) return
    done.current = true
    clearTimers()
    onFinish(total)
  }

  // Begin a round: pick a target, show it (reveal), then a reveal-effect hands to guess.
  const beginRound = (r: number): void => {
    const t = makeTarget(mode)
    targetRef.current = t
    setTarget(t)
    setRound(r)
    setEased(easeBoost.current > 0)
    setPhase('reveal')
  }

  // "Get ready" 3-2-1 countdown -> first round.
  useEffect(() => {
    if (phase !== 'countdown') return
    if (count <= 0) {
      beginRound(0)
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  // Reveal lasts the tier duration (+ any ease boost), then the colour hides and the
  // sliders appear: free channels start neutral, "given" channels are pre-set to target.
  useEffect(() => {
    if (phase !== 'reveal') return
    const revealMs = tier.revealMs + easeBoost.current
    const id = setTimeout(() => {
      const t = targetRef.current
      if (!t || done.current) return
      setH(tier.free.h ? 180 : t.h)
      setS(tier.free.s ? 50 : t.s)
      setB(tier.free.b ? 60 : t.b)
      setPhase('guess')
    }, revealMs)
    timers.current.push(id)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round])

  const start = (): void => {
    if (phase !== 'setup') return
    setCount(3)
    setPhase('countdown')
  }

  const submitGuess = (): void => {
    if (phase !== 'guess') return
    const t = targetRef.current
    if (!t) return
    const g: HSB = { h, s, b }
    const sc = scoreGuess(t, g, tier.tol)
    setScores((prev) => [...prev, sc])
    setTargets((prev) => [...prev, t])
    setGuesses((prev) => [...prev, g])
    setLastScore(sc)
    easeBoost.current = sc < 5 ? Math.min(1200, easeBoost.current + 400) : Math.max(0, easeBoost.current - 200)
    play(sc >= 5 ? 'good' : 'bad')
    setPhase('result')
  }

  const nextRound = (): void => {
    const nextR = round + 1
    if (nextR >= ROUNDS) {
      const total = scores.reduce((a, x) => a + x, 0)
      if (total >= ROUNDS * 7) play('best')
      setPhase('summary')
    } else {
      beginRound(nextR)
    }
  }

  const total = scores.reduce((a, x) => a + x, 0)
  const runningScore = total
  const revealMs = tier.revealMs + easeBoost.current
  const guessCss = hsbCss(h, s, b)

  // Hue track is a fixed rainbow; sat/bright tracks tint live to the current guess so the
  // sliders feel connected to the swatch.
  const satTrack = `linear-gradient(90deg, ${hsbCss(h, 0, b)}, ${hsbCss(h, 100, b)})`
  const briTrack = `linear-gradient(90deg, #0b0b0b, ${hsbCss(h, s, 100)})`
  const hueTrack = 'linear-gradient(90deg,#ff5d5d,#ffd25d,#7be07b,#5dd0ff,#7b9bff,#d27bff,#ff5d5d)'

  const RoundDots = ({ active }: { active: number }): JSX.Element => (
    <div className="cr-dots" aria-hidden="true">
      {Array.from({ length: ROUNDS }, (_, i) => (
        <i key={i} className={i < active ? 'done' : i === active ? 'cur' : ''} />
      ))}
    </div>
  )

  const sliderRow = (
    ch: 'h' | 's' | 'b',
    label: string,
    val: number,
    setVal: (v: number) => void,
    max: number,
    unit: string,
    free: boolean,
    track: string
  ): JSX.Element => (
    <div className={`cr-slider-row${free ? '' : ' locked'}`}>
      <div className="cr-slider-top">
        <span className="cr-slider-nm">
          {label}
          {!free && <span className="cr-lockpill">given</span>}
        </span>
        <span className="cr-slider-val">
          {Math.round(val)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={val}
        disabled={!free}
        aria-label={label}
        data-channel={ch}
        style={{ background: track }}
        onChange={(e) => setVal(Number(e.target.value))}
      />
    </div>
  )

  return (
    <div className="game-shell">
      {phase !== 'setup' && phase !== 'summary' && (
        <div className="game-hud">
          <span>
            <GameIcon k="colorrecall" size={15} /> {runningScore}/{ROUNDS * 10}
          </span>
          <span className="meta-dim">
            round {Math.min(round + 1, ROUNDS)}/{ROUNDS} · {mode}
          </span>
          <button onClick={() => finish(runningScore)}>End round</button>
        </div>
      )}

      <div
        className="cr-field"
        data-phase={phase}
        data-target={target ? `${target.h},${target.s},${target.b}` : ''}
        data-free={`${tier.free.h ? 'h' : ''}${tier.free.s ? 's' : ''}${tier.free.b ? 'b' : ''}`}
      >
        {/* ---- SETUP: difficulty tiers + Start ---- */}
        {phase === 'setup' && (
          <div className="cr-setup">
            <p className="cr-lead">
              A colour flashes, then vanishes. Rebuild it from memory with the sliders — the closer you get,
              the higher your round score. {ROUNDS} rounds, no penalties, ever.
            </p>
            <div className="cr-tiers" role="group" aria-label="difficulty">
              {MODE_LIST.map((m) => {
                const t = TIERS[m.key]
                return (
                  <button
                    key={m.key}
                    className={`cr-tier${mode === m.key ? ' sel' : ''}`}
                    onClick={() => setMode(m.key)}
                  >
                    <span className="cr-tier-name">{m.name}</span>
                    <span className="cr-swatchbar" style={{ background: m.bar }} />
                    <span className="cr-tier-desc">{m.desc}</span>
                    <span className="cr-tier-ch">
                      <span className={`cr-pip${t.free.h ? ' on' : ''}`}>Hue</span>
                      <span className={`cr-pip${t.free.s ? ' on' : ''}`}>Sat</span>
                      <span className={`cr-pip${t.free.b ? ' on' : ''}`}>Bright</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button className="primary cr-action" onClick={start}>
              Start · {ROUNDS} rounds
            </button>
            <div className="cr-tinynote">Trains visual memory & colour perception · no lives, no game-over ♥</div>
          </div>
        )}

        {/* ---- COUNTDOWN ---- */}
        {phase === 'countdown' && (
          <div className="cr-countdown">
            <span className="cr-cd-ready">Get ready…</span>
            <span className={`cr-cd-num${count <= 0 ? ' go' : ''}`}>{count > 0 ? count : 'Go!'}</span>
          </div>
        )}

        {/* ---- REVEAL ---- */}
        {phase === 'reveal' && (
          <div className="cr-stage">
            <RoundDots active={round} />
            <div className="cr-memo">Memorize this colour</div>
            <div
              className="cr-swatch"
              style={{ background: target ? hsbCss(target.h, target.s, target.b) : undefined }}
            />
            <div className="cr-reveal-bar">
              <i key={round} style={{ animationDuration: `${revealMs}ms` }} />
            </div>
            {eased && <div className="cr-ease-note">♥ Taking it a little slower this round</div>}
          </div>
        )}

        {/* ---- GUESS ---- */}
        {phase === 'guess' && (
          <div className="cr-stage">
            <RoundDots active={round} />
            <div className="cr-masked">
              <span className="cr-q">?</span>
              <span className="cr-q-sub">Now rebuild it from memory</span>
            </div>
            <div className="cr-guess-grid">
              <div className="cr-preview-col">
                <div className="cr-swatch-label">Your guess</div>
                <div className="cr-swatch sm" style={{ background: guessCss }} />
                {tier.reference && target && (
                  <div className="cr-refpatch">
                    <div className="cr-ref" style={{ background: hsbCss(target.h, target.s, target.b) }} />
                    <div className="cr-ref-l">faint reference (Easy)</div>
                  </div>
                )}
              </div>
              <div className="cr-sliders">
                {sliderRow('h', 'Hue', h, setH, 360, '°', tier.free.h, hueTrack)}
                {sliderRow('s', 'Saturation', s, setS, 100, '%', tier.free.s, satTrack)}
                {sliderRow('b', 'Brightness', b, setB, 100, '%', tier.free.b, briTrack)}
              </div>
            </div>
            <button className="primary cr-action" onClick={submitGuess}>
              Submit guess
            </button>
          </div>
        )}

        {/* ---- ROUND RESULT ---- */}
        {phase === 'result' && target && (
          <div className="cr-stage">
            <RoundDots active={round + 1} />
            <div className="cr-result-pair">
              <div className="cr-result-col">
                <div className="cr-swatch-label">Target</div>
                <div className="cr-swatch sm" style={{ background: hsbCss(target.h, target.s, target.b) }} />
              </div>
              <div className="cr-result-col">
                <div className="cr-swatch-label">Your guess</div>
                <div className="cr-swatch sm" style={{ background: guessCss }} />
              </div>
            </div>
            <div className="cr-scorebig">
              <span className="cr-score-n">{lastScore}</span>
              <span className="cr-score-d">/10</span>
            </div>
            <div className="cr-encourage">{encourageLine(lastScore)}</div>
            <button className="primary cr-action" onClick={nextRound}>
              {round + 1 >= ROUNDS ? 'See results' : 'Next round'}
            </button>
          </div>
        )}

        {/* ---- SUMMARY ---- */}
        {phase === 'summary' && (
          <div className="cr-stage">
            <div className="cr-swatch-label cr-run-done">Run complete</div>
            <div className="cr-sum-total">
              <span className="cr-sum-n">{total}</span>
              <span className="cr-sum-d">/{ROUNDS * 10}</span>
            </div>
            <div className="cr-sum-line">{summaryLine(total)}</div>
            <div className="cr-breakdown">
              {targets.map((t, i) => (
                <div className="cr-bd" key={i}>
                  <div className="cr-bd-swt" style={{ background: hsbCss(t.h, t.s, t.b) }} />
                  <div
                    className="cr-bd-swt sm"
                    style={{ background: hsbCss(guesses[i].h, guesses[i].s, guesses[i].b) }}
                  />
                  <div className="cr-bd-s">
                    {scores[i]}
                    <span className="cr-bd-d">/10</span>
                  </div>
                  <div className="cr-bd-l">R{i + 1}</div>
                </div>
              ))}
            </div>
            <button className="primary cr-action" onClick={() => finish(total)}>
              Collect score
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
