import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

type Phase = 'ready' | 'waiting' | 'go' | 'between'

/**
 * ⚡ Reaction Time — wait for green, click. Best-of-`trials` average.
 * Clicking too soon just restarts that trial (never a penalty).
 * Score = max(0, 350 - average ms), so faster = more.
 */
export function ReactionTime({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.reaction
  const [phase, setPhase] = useState<Phase>('ready')
  const [times, setTimes] = useState<number[]>([])
  const [message, setMessage] = useState('Click to start')
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = useRef(false)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const arm = () => {
    setPhase('waiting')
    setMessage('Wait for green…')
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
      setMessage('CLICK!')
    }, 900 + Math.random() * 2200)
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
    if (all.length >= cfg.trials) return finish(all)
    setMessage(`${ms} ms — ${cfg.trials - all.length} to go. Click to continue.`)
    setPhase('between')
  }

  const avg = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>⚡ trial {Math.min(times.length + 1, cfg.trials)}/{cfg.trials}</span>
        {avg !== null && <span>avg {avg} ms</span>}
        <button onClick={() => times.length > 0 ? finish(times) : onFinish(0)}>End round</button>
      </div>
      <button className={`reaction-pad ${phase}`} onClick={click}>
        {message}
        {times.length > 0 && <div className="reaction-times">{times.join(' · ')} ms</div>}
      </button>
    </div>
  )
}
