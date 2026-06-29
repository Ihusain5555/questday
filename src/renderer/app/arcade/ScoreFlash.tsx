import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { balance } from '@shared/config/balance'

/**
 * 🔴🟡 Shared arcade score-flash juice (DECIDED 2026-06-29 — the ONE sanctioned arcade
 * carve-out to the tone rule). Drop into any game:
 *
 *   const flash = useScoreFlash()
 *   <div className="game-shell" ref={flash.shellRef}> … {flash.overlay} … </div>
 *   <span className={'…hud… ' + flash.scoreClass}>{score}</span>   // optional HUD bump
 *   flash.fire('penalty', -balance.arcade.feedback.penalty.points)  // wrong action
 *   flash.fire('gain', +pointsScored)                               // point gained
 *
 * Red flash + shake + "−2" on a penalty; gold flash + "+N" on a gain. Colour / vignette
 * style / duration / opacity / shake all come from balance.arcade.feedback (tuned in the
 * approved mockup). The heavy overlay is THROTTLED (feedback.throttleMs) so a rapid-fire
 * game (e.g. Aim Speed) shows the floating +N without strobing; a PENALTY always flashes
 * (it's the signal that matters) and resets the throttle.
 *
 * HARD boundary: this only animates the round score the GAME already tracks — it never
 * reads or writes XP / streaks / tickets / ↩Restore. That gains-only wall lives in the
 * store + ArcadeView (round score never feeds ticket/XP awards; `best` only ever rises).
 */

const fb = balance.arcade.feedback

type Kind = 'gain' | 'penalty'
interface Pulse {
  kind: Kind
  n: number | null // signed delta to show in the popup (e.g. -2 or +1); null = flash only, no number
  key: number // bumps so the keyed children re-mount and re-animate every fire
  overlay: boolean // false when a rapid gain was throttled (popup still shows)
}

export interface ScoreFlash {
  // n omitted = flash (+ shake on penalty) with NO number popup — for games whose score
  // isn't a running tally (e.g. Reaction Time, scored by reaction ms).
  fire: (kind: Kind, n?: number) => void
  overlay: JSX.Element
  shellRef: React.RefObject<HTMLDivElement>
  scoreClass: string
}

export function useScoreFlash(): ScoreFlash {
  const shellRef = useRef<HTMLDivElement>(null)
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [scoreClass, setScoreClass] = useState('')
  const keyRef = useRef(0)
  const lastOverlay = useRef(0)
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fire = useCallback((kind: Kind, n?: number) => {
    const now = performance.now()
    // Throttle the heavy overlay for gains; a penalty always plays and resets the gate.
    const overlay = kind === 'penalty' || now - lastOverlay.current >= fb.throttleMs
    if (overlay) lastOverlay.current = now

    keyRef.current += 1
    setPulse({ kind, n: n ?? null, key: keyRef.current, overlay })

    // Shake the whole game-shell on a penalty (the dramatic part of the approved feel).
    if (kind === 'penalty' && fb.penalty.shakePx > 0 && shellRef.current) {
      const el = shellRef.current
      el.style.setProperty('--shake-px', fb.penalty.shakePx + 'px')
      el.classList.remove('score-shake')
      void el.offsetWidth // reflow so the animation restarts on a back-to-back penalty
      el.classList.add('score-shake')
    }

    // Optional HUD score-colour bump (gold up / red down).
    if (fb.hudBump) {
      setScoreClass(kind === 'penalty' ? 'arc-score-down' : 'arc-score-up')
      if (bumpTimer.current) clearTimeout(bumpTimer.current)
      bumpTimer.current = setTimeout(() => setScoreClass(''), 420)
    }
  }, [])

  return { fire, overlay: <ScoreFlashLayer pulse={pulse} />, shellRef, scoreClass }
}

function ScoreFlashLayer({ pulse }: { pulse: Pulse | null }): JSX.Element | null {
  if (!pulse) return null
  const cfg = pulse.kind === 'penalty' ? fb.penalty : fb.gain
  const color = cfg.color
  const flashStyle = {
    '--flash-color': color,
    '--flash-ms': cfg.durationMs + 'ms',
    '--flash-peak': String(cfg.peakOpacity),
    '--flash-ease': fb.easing
  } as CSSProperties

  return (
    <div className="score-flash-root" aria-hidden="true">
      {pulse.overlay && <div key={'f' + pulse.key} className={`score-flash ${cfg.style}`} style={flashStyle} />}
      {fb.scorePopup && pulse.n != null && (
        <span key={'p' + pulse.key} className="score-flash-pop" style={{ color }}>
          {pulse.n > 0 ? '+' + pulse.n : String(pulse.n)}
        </span>
      )}
    </div>
  )
}
