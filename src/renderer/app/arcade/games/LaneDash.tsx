import { useEffect, useRef, useState } from 'react'

const LANES = 3
const W = 330
const H = 420
const LANE_W = W / LANES
const OBSTACLES = ['🚧', '🚃', '🛢️', '📦']

/**
 * 🏃 Lane Dash — endless-runner classic: three lanes, obstacles rush down,
 * ←/→ (or A/D) to dodge. Speed creeps up. A collision ends the round with
 * everything you dodged banked.
 */
export function LaneDash({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const done = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lane = 1
    let speed = 3.2
    let obstacles: { lane: number; y: number; emoji: string; passed: boolean }[] = []
    let spawnGap = 0

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const tick = () => {
      // Spawn with a guaranteed free lane (always dodgeable — fair, not cruel).
      spawnGap -= 1
      if (spawnGap <= 0) {
        const count = Math.random() < 0.3 ? 2 : 1
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count)
        for (const l of lanes)
          obstacles.push({ lane: l, y: -30, emoji: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)], passed: false })
        spawnGap = Math.max(26, 60 - scoreRef.current)
      }
      for (const o of obstacles) {
        o.y += speed
        if (!o.passed && o.y > H - 70) {
          o.passed = true
          scoreRef.current += 1
          setScore(scoreRef.current)
          speed = Math.min(9, speed + 0.06)
        }
        // Collision box: same lane, overlapping the runner's row.
        if (o.lane === lane && o.y > H - 92 && o.y < H - 40) return end()
      }
      obstacles = obstacles.filter((o) => o.y < H + 40)

      ctx.fillStyle = '#11151c'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      for (let i = 1; i < LANES; i++) {
        ctx.beginPath()
        ctx.moveTo(i * LANE_W, 0)
        ctx.lineTo(i * LANE_W, H)
        ctx.stroke()
      }
      ctx.font = '26px serif'
      for (const o of obstacles) ctx.fillText(o.emoji, o.lane * LANE_W + LANE_W / 2 - 13, o.y)
      ctx.font = '30px serif'
      ctx.fillText('🏃', lane * LANE_W + LANE_W / 2 - 15, H - 50)
    }

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault()
        lane = Math.max(0, lane - 1)
      }
      if (k === 'arrowright' || k === 'd') {
        e.preventDefault()
        lane = Math.min(LANES - 1, lane + 1)
      }
    }

    const id = setInterval(tick, 16)
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onKey)
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
        <span>🏃 {score} dodged</span>
        <span className="meta-dim">←/→ or A/D to switch lanes</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    </div>
  )
}
