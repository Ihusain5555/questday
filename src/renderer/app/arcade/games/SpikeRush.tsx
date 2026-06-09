import { useEffect, useRef, useState } from 'react'

const W = 460
const H = 260
const GROUND = H - 40

/**
 * 🔺 Spike Rush — rhythm-runner classic: the cube auto-runs, you jump (click /
 * space / ↑) over spikes. Speed builds. Hitting one ends the round with every
 * spike you cleared banked.
 */
export function SpikeRush({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const done = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const px = 70 // player x (fixed)
    let py = GROUND // player bottom y
    let vy = 0
    let speed = 4
    let spikes: { x: number; passed: boolean }[] = []
    let gap = 30

    const jump = () => {
      if (py >= GROUND - 0.5) vy = -10.5
    }

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const tick = () => {
      // Physics.
      vy += 0.55
      py = Math.min(GROUND, py + vy)
      if (py === GROUND) vy = 0

      gap -= 1
      if (gap <= 0) {
        // Sometimes a double-spike; always jumpable at current speed.
        spikes.push({ x: W + 20, passed: false })
        if (Math.random() < 0.25) spikes.push({ x: W + 20 + 26, passed: false })
        gap = 55 + Math.random() * 60 - Math.min(25, scoreRef.current)
      }
      for (const s of spikes) {
        s.x -= speed
        if (!s.passed && s.x < px - 18) {
          s.passed = true
          scoreRef.current += 1
          setScore(scoreRef.current)
          speed = Math.min(8.5, speed + 0.05)
        }
        // Collision: spike triangle near player while player is low.
        if (Math.abs(s.x - px) < 16 && py > GROUND - 26) return end()
      }
      spikes = spikes.filter((s) => s.x > -30)

      // Draw.
      ctx.fillStyle = '#131320'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#222238'
      ctx.fillRect(0, GROUND + 18, W, H - GROUND)
      ctx.fillStyle = '#7c5cff'
      ctx.fillRect(px - 14, py - 10, 28, 28)
      ctx.fillStyle = '#ef4444'
      for (const s of spikes) {
        ctx.beginPath()
        ctx.moveTo(s.x - 13, GROUND + 18)
        ctx.lineTo(s.x, GROUND - 12)
        ctx.lineTo(s.x + 13, GROUND + 18)
        ctx.fill()
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault()
        jump()
      }
    }

    const id = setInterval(tick, 16)
    window.addEventListener('keydown', onKey)
    canvas.addEventListener('mousedown', jump)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('mousedown', jump)
    }
  }, [onFinish])

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(scoreRef.current)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🔺 {score} cleared</span>
        <span className="meta-dim">click / space / ↑ to jump</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    </div>
  )
}
