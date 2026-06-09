import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

const COLS = 12
const ROWS = 14
const R = 15 // bubble radius; cells are 2R squares (orthogonal grid, kept simple)
const COLORS = ['#ef4444', '#3b82f6', '#4ade80', '#facc15']
const START_ROWS = 5

/**
 * 🫧 Bubble Pop — aim with the mouse, click to shoot. Landing in a group of
 * 3+ same-color bubbles pops it; bubbles left floating (not connected to the
 * top) drop too. Score = popped + dropped. Time-capped round.
 */
export function BubblePop({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.bubble
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
    const W = COLS * R * 2
    const H = ROWS * R * 2 + 40 // + cannon strip

    const grid: (string | null)[][] = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, () =>
        y < START_ROWS ? COLORS[Math.floor(Math.random() * COLORS.length)] : null
      )
    )
    const colorsLeft = () => {
      const present = new Set<string>()
      grid.forEach((row) => row.forEach((c) => c && present.add(c)))
      return present.size > 0 ? [...present] : COLORS
    }
    let current = COLORS[Math.floor(Math.random() * COLORS.length)]
    let aim = -Math.PI / 2
    let flying: { x: number; y: number; vx: number; vy: number; color: string } | null = null

    const cx = (x: number) => x * R * 2 + R
    const cy = (y: number) => y * R * 2 + R

    const draw = () => {
      ctx.fillStyle = '#0e1420'
      ctx.fillRect(0, 0, W, H)
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          const c = grid[y][x]
          if (!c) continue
          ctx.fillStyle = c
          ctx.beginPath()
          ctx.arc(cx(x), cy(y), R - 1, 0, Math.PI * 2)
          ctx.fill()
        }
      // Cannon + aim line.
      const gx = W / 2
      const gy = H - 20
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(gx + Math.cos(aim) * 130, gy + Math.sin(aim) * 130)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = current
      ctx.beginPath()
      ctx.arc(gx, gy, R - 1, 0, Math.PI * 2)
      ctx.fill()
      if (flying) {
        ctx.fillStyle = flying.color
        ctx.beginPath()
        ctx.arc(flying.x, flying.y, R - 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const neighbors = (x: number, y: number) =>
      [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(
        ([nx, ny]) => nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS
      ) as [number, number][]

    /** BFS the same-color cluster from a cell. */
    const cluster = (sx: number, sy: number) => {
      const color = grid[sy][sx]
      if (!color) return []
      const seen = new Set<string>([`${sx},${sy}`])
      const out: [number, number][] = [[sx, sy]]
      const queue: [number, number][] = [[sx, sy]]
      while (queue.length) {
        const [x, y] = queue.pop() as [number, number]
        for (const [nx, ny] of neighbors(x, y)) {
          const k = `${nx},${ny}`
          if (!seen.has(k) && grid[ny][nx] === color) {
            seen.add(k)
            out.push([nx, ny])
            queue.push([nx, ny])
          }
        }
      }
      return out
    }

    /** Anything not connected to the top row floats — and falls. */
    const dropFloaters = () => {
      const anchored = new Set<string>()
      const queue: [number, number][] = []
      for (let x = 0; x < COLS; x++)
        if (grid[0][x]) {
          anchored.add(`${x},0`)
          queue.push([x, 0])
        }
      while (queue.length) {
        const [x, y] = queue.pop() as [number, number]
        for (const [nx, ny] of neighbors(x, y)) {
          const k = `${nx},${ny}`
          if (!anchored.has(k) && grid[ny][nx]) {
            anchored.add(k)
            queue.push([nx, ny])
          }
        }
      }
      let dropped = 0
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (grid[y][x] && !anchored.has(`${x},${y}`)) {
            grid[y][x] = null
            dropped += 1
          }
      return dropped
    }

    const land = (fx: number, fy: number, color: string) => {
      // Snap to the nearest free cell.
      let bx = Math.max(0, Math.min(COLS - 1, Math.round((fx - R) / (R * 2))))
      let by = Math.max(0, Math.min(ROWS - 1, Math.round((fy - R) / (R * 2))))
      while (grid[by][bx] && by < ROWS - 1) by += 1
      if (grid[by][bx]) return end() // board full — cash out
      grid[by][bx] = color
      const group = cluster(bx, by)
      if (group.length >= 3) {
        for (const [x, y] of group) grid[y][x] = null
        const dropped = dropFloaters()
        scoreRef.current += group.length + dropped * 2 // floaters are the jackpot
        setScore(scoreRef.current)
      }
      const left = colorsLeft()
      current = left[Math.floor(Math.random() * left.length)]
      // Board cleared = bonus + fresh rows to keep playing.
      if (grid.every((row) => row.every((c) => !c))) {
        scoreRef.current += 20
        setScore(scoreRef.current)
        for (let y = 0; y < START_ROWS - 1; y++)
          for (let x = 0; x < COLS; x++)
            grid[y][x] = COLORS[Math.floor(Math.random() * COLORS.length)]
      }
    }

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const tick = () => {
      if (flying) {
        const SPEED = 11
        flying.x += flying.vx * SPEED
        flying.y += flying.vy * SPEED
        // Wall bounce.
        if (flying.x < R || flying.x > W - R) {
          flying.vx *= -1
          flying.x = Math.max(R, Math.min(W - R, flying.x))
        }
        // Stick on ceiling or on touching any bubble.
        let hit = flying.y <= R
        if (!hit) {
          outer: for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++) {
              if (!grid[y][x]) continue
              const dx = flying.x - cx(x)
              const dy = flying.y - cy(y)
              if (dx * dx + dy * dy <= (R * 2 - 2) ** 2) {
                hit = true
                break outer
              }
            }
        }
        if (hit) {
          land(flying.x, flying.y, flying.color)
          flying = null
        }
      }
      draw()
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      aim = Math.atan2(Math.min(my - (H - 20), -10), mx - W / 2)
    }
    const onClick = () => {
      if (flying || done.current) return
      flying = { x: W / 2, y: H - 20, vx: Math.cos(aim), vy: Math.sin(aim), color: current }
    }

    draw()
    const id = setInterval(tick, 16)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    return () => {
      clearInterval(id)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
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
        <span>🫧 {score} popped</span>
        <span>⏱ {Math.max(0, timeLeft)}s</span>
        <span className="meta-dim">aim with mouse · click to shoot</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * R * 2}
        height={ROWS * R * 2 + 40}
        className="game-canvas"
      />
    </div>
  )
}
