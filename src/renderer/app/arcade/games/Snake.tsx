import { useEffect, useRef, useState } from 'react'

const GRID = 16
const CELL = 21
const TICK_MS = 130

/**
 * 🐍 Snake — arrows/WASD. Eat to grow; running into yourself or a wall ends
 * the round with your score (never a "game over" scold). Score = food eaten.
 */
export function Snake({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let snake = [{ x: 8, y: 8 }]
    let dir = { x: 1, y: 0 }
    let nextDir = dir
    let food = { x: 12, y: 8 }
    let eaten = 0

    const placeFood = () => {
      do {
        food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
      } while (snake.some((s) => s.x === food.x && s.y === food.y))
    }

    const draw = () => {
      ctx.fillStyle = '#10160f'
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)
      ctx.fillStyle = '#f59e0b'
      ctx.font = '16px serif'
      ctx.fillText('🍎', food.x * CELL + 2, food.y * CELL + 17)
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#4cd9a0' : '#2f9d74'
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(eaten)
    }

    const tick = () => {
      dir = nextDir
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y)
      if (hitWall || hitSelf) return end()
      snake = [head, ...snake]
      if (head.x === food.x && head.y === food.y) {
        eaten += 1
        setScore(eaten)
        placeFood()
      } else {
        snake.pop()
      }
      draw()
    }

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const want =
        k === 'arrowup' || k === 'w' ? { x: 0, y: -1 }
        : k === 'arrowdown' || k === 's' ? { x: 0, y: 1 }
        : k === 'arrowleft' || k === 'a' ? { x: -1, y: 0 }
        : k === 'arrowright' || k === 'd' ? { x: 1, y: 0 }
        : null
      if (!want) return
      e.preventDefault()
      // No instant 180s — that would always end the round by accident.
      if (want.x !== -dir.x || want.y !== -dir.y) nextDir = want
    }

    draw()
    const id = setInterval(tick, TICK_MS)
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [onFinish])

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(score)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🐍 {score} eaten</span>
        <span className="meta-dim">arrows / WASD</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="game-canvas" />
    </div>
  )
}
