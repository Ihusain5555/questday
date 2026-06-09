import { useEffect, useRef, useState } from 'react'

const COLS = 11
const ROWS = 12
const CELL = 32
const CARS = ['🚗', '🚕', '🚙', '🚌', '🚚']

/**
 * 🐔 Road Hopper — the road-crossing classic: hop with arrows/WASD across
 * lanes of traffic. Each crossing banks points and the traffic speeds up.
 * Getting clipped ends the round with your crossings kept.
 */
export function RoadHopper({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const done = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Rows 1..ROWS-2 are roads; row 0 is the goal bank, ROWS-1 the start bank.
    let player = { x: Math.floor(COLS / 2), y: ROWS - 1 }
    let speedMult = 1
    interface Lane {
      y: number
      dir: 1 | -1
      speed: number
      cars: { x: number; emoji: string }[]
    }
    const lanes: Lane[] = []
    for (let y = 1; y < ROWS - 1; y++) {
      if (y % 4 === 0) continue // a calm median every few rows
      const dir = (y % 2 === 0 ? 1 : -1) as 1 | -1
      const cars = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, (_, i) => ({
        x: ((i * COLS) / 3 + Math.random() * 2) % COLS,
        emoji: CARS[Math.floor(Math.random() * CARS.length)]
      }))
      lanes.push({ y, dir, speed: 0.03 + Math.random() * 0.025, cars })
    }

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const tick = () => {
      for (const lane of lanes) {
        for (const car of lane.cars) {
          car.x = (car.x + lane.dir * lane.speed * speedMult + COLS) % COLS
          // Collision: same row, car covers the player's cell.
          if (lane.y === player.y && Math.abs(car.x - player.x) < 0.7) return end()
        }
      }

      ctx.fillStyle = '#141414'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
      // Banks + medians.
      ctx.fillStyle = '#1d2b1d'
      ctx.fillRect(0, 0, COLS * CELL, CELL)
      ctx.fillRect(0, (ROWS - 1) * CELL, COLS * CELL, CELL)
      for (let y = 1; y < ROWS - 1; y++)
        if (y % 4 === 0) {
          ctx.fillStyle = '#1d2b1d'
          ctx.fillRect(0, y * CELL, COLS * CELL, CELL)
        }
      ctx.font = '22px serif'
      for (const lane of lanes)
        for (const car of lane.cars)
          ctx.fillText(car.emoji, car.x * CELL + 3, lane.y * CELL + 24)
      ctx.fillText('🐔', player.x * CELL + 4, player.y * CELL + 24)
    }

    const hop = (dx: number, dy: number) => {
      player.x = Math.max(0, Math.min(COLS - 1, player.x + dx))
      player.y = Math.max(0, Math.min(ROWS - 1, player.y + dy))
      if (player.y === 0) {
        // Made it! Bank points, speed up, back to the start.
        scoreRef.current += 5
        setScore(scoreRef.current)
        speedMult = Math.min(2.4, speedMult + 0.18)
        player = { x: Math.floor(COLS / 2), y: ROWS - 1 }
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const move =
        k === 'arrowup' || k === 'w' ? [0, -1]
        : k === 'arrowdown' || k === 's' ? [0, 1]
        : k === 'arrowleft' || k === 'a' ? [-1, 0]
        : k === 'arrowright' || k === 'd' ? [1, 0]
        : null
      if (!move) return
      e.preventDefault()
      hop(move[0], move[1])
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
        <span>🐔 {score} pts</span>
        <span className="meta-dim">arrows / WASD — reach the far side (+5)</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="game-canvas" />
    </div>
  )
}
