import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'
import { Timer } from '@phosphor-icons/react'

const W = 460
const H = 340
const FRUIT = ['🍉', '🍎', '🍊', '🍌', '🍓', '🥝', '🍑']

/**
 * 🍉 Fruit Slice — fruit arcs across the screen; hold the mouse button and
 * swipe through it to slice. Slicing a 💣 just ends the round — you keep
 * every point (a cash-out, not a punishment). Timed round.
 */
export function FruitSlice({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.fruit
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const done = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(scoreRef.current)
    }
  }, [timeLeft, onFinish])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    interface Flying {
      x: number
      y: number
      vx: number
      vy: number
      emoji: string
      bomb: boolean
      sliced: boolean
    }
    let items: Flying[] = []
    let slicing = false
    let trail: { x: number; y: number }[] = []
    let spawnGap = 0

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const tick = () => {
      spawnGap -= 1
      if (spawnGap <= 0) {
        const fromX = 60 + Math.random() * (W - 120)
        const bomb = Math.random() < 0.15
        items.push({
          x: fromX,
          y: H + 20,
          vx: (W / 2 - fromX) * 0.012 + (Math.random() - 0.5) * 2,
          vy: -(8.5 + Math.random() * 2.5),
          emoji: bomb ? '💣' : FRUIT[Math.floor(Math.random() * FRUIT.length)],
          bomb,
          sliced: false
        })
        spawnGap = 28 + Math.random() * 30
      }
      for (const f of items) {
        f.vy += 0.18
        f.x += f.vx
        f.y += f.vy
      }
      items = items.filter((f) => f.y < H + 60 && !f.sliced)

      ctx.fillStyle = '#161217'
      ctx.fillRect(0, 0, W, H)
      ctx.font = '30px serif'
      for (const f of items) ctx.fillText(f.emoji, f.x - 15, f.y)
      if (trail.length > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(trail[0].x, trail[0].y)
        for (const p of trail) ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      trail = trail.slice(-8)
    }

    const onDown = () => {
      slicing = true
      trail = []
    }
    const onUp = () => {
      slicing = false
      trail = []
    }
    const onMove = (e: MouseEvent) => {
      if (!slicing || done.current) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      trail.push({ x: mx, y: my })
      for (const f of items) {
        if (f.sliced) continue
        const dx = mx - (f.x - 0)
        const dy = my - (f.y - 12)
        if (dx * dx + dy * dy < 26 * 26) {
          f.sliced = true
          if (f.bomb) return end() // friendly cash-out
          scoreRef.current += 1
          setScore(scoreRef.current)
        }
      }
    }

    const id = setInterval(tick, 16)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('mousemove', onMove)
    return () => {
      clearInterval(id)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mousemove', onMove)
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
        <span>🍉 {score} sliced</span>
        <span className="hud-timer"><Timer size={14} weight="bold" /> {Math.max(0, timeLeft)}s</span>
        <span className="meta-dim">hold the mouse button and swipe — avoid 💣</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    </div>
  )
}
