import { useEffect, useRef, useState } from 'react'
import { GameIcon } from '../gameIcons'

type Phase = 'ready' | 'waiting' | 'go' | 'between'
type Mode = 'easy' | 'medium' | 'hard'

// Difficulty maps to how many trials and how large/precise the green target is.
// Easy: a big easy-to-hit pad. Medium: the classic baseline. Hard: more trials
// and a smaller, more-precise target. The mode's trials override the config.
const MODES: Record<Mode, { trials: number; pad: number }> = {
  easy: { trials: 5, pad: 1.0 }, // large target (full width)
  medium: { trials: 5, pad: 0.78 }, // normal target
  hard: { trials: 8, pad: 0.5 } // smaller / more-precise target
}

/**
 * ⚡ Reaction Time — wait for green, click. Best-of-`trials` average.
 * Clicking too soon just restarts that trial (never a penalty).
 * Score = max(0, 350 - average ms), so faster = more.
 */
export function ReactionTime({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const [phase, setPhase] = useState<Phase>('ready')
  const [mode, setMode] = useState<Mode>('medium')
  const [times, setTimes] = useState<number[]>([])
  const [message, setMessage] = useState('Click to start')
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = useRef(false)

  // Mode sets the trial count (overriding the config) and the target precision.
  const trials = MODES[mode].trials

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Difficulty is chosen during the "ready" intro, then locked once play starts.
  const pickMode = (m: Mode) => {
    if (phase !== 'ready') return
    setMode(m)
  }

  const arm = () => {
    setPhase('waiting')
    setMessage('Wait for green…')
    // Random hold of 2-6s before the go-signal, so the wait is unpredictable every
    // trial (you can't time it) — the whole point of a reaction test.
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
      setMessage('CLICK!')
    }, 2000 + Math.random() * 4000)
  }

  const finish = (all: number[]) => {
    if (done.current) return
    done.current = true
    const avg = all.reduce((s, t) => s + t, 0) / all.length
    onFinish(Math.max(0, Math.round(350 - avg)))
  }

  const click = () => {
    if (phase === 'ready' || phase === 'between') return arm()
    if (phase === 'waiting') {
      // Too soon — no penalty, the trial just re-arms.
      if (timer.current) clearTimeout(timer.current)
      setMessage('A little early — no harm done. Again!')
      setPhase('between')
      return
    }
    // phase === 'go'
    const ms = Math.round(performance.now() - goAt.current)
    const all = [...times, ms]
    setTimes(all)
    if (all.length >= trials) return finish(all)
    setMessage(`${ms} ms — ${trials - all.length} to go. Click to continue.`)
    setPhase('between')
  }

  const avg = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span><GameIcon k="reaction" size={15} /> trial {Math.min(times.length + 1, trials)}/{trials}</span>
        {avg !== null && <span>avg {avg} ms</span>}
        <button onClick={() => times.length > 0 ? finish(times) : onFinish(0)}>End round</button>
      </div>
      {phase === 'ready' && (
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
      )}
      <button
        className={`reaction-pad ${phase}`}
        onClick={click}
        style={phase !== 'ready' ? { maxWidth: `${Math.round(MODES[mode].pad * 100)}%` } : undefined}
      >
        {message}
        {times.length > 0 && <div className="reaction-times">{times.join(' · ')} ms</div>}
      </button>
    </div>
  )
}
