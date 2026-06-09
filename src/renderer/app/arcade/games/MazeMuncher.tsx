import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

// Hand-authored little maze: # wall, . open. 13x11.
const MAZE = [
  '#############',
  '#...........#',
  '#.##.###.##.#',
  '#.#.......#.#',
  '#.#.##.##.#.#',
  '#......P....#',
  '#.#.##.##.#.#',
  '#.#.......#.#',
  '#.##.###.##.#',
  '#...........#',
  '#############'
]
const COLS = MAZE[0].length
const ROWS = MAZE.length
const CELL = 30
const GHOSTS = ['👻', '👹']

/**
 * 👾 Maze Muncher — the maze-chomping classic: eat every dot, dodge the
 * ghosts. Clearing the maze refills it (and the ghosts hurry up). A ghost
 * catching you ends the round with all your dots banked.
 */
export function MazeMuncher({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.maze
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

    const wall = (x: number, y: number) => MAZE[y]?.[x] === '#'
    const freshPellets = () => {
      const s = new Set<string>()
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) if (!wall(x, y) && MAZE[y][x] !== 'P') s.add(`${x},${y}`)
      return s
    }

    let player = { x: 6, y: 5 }
    let dir = { x: 0, y: 0 }
    let want = dir
    let pellets = freshPellets()
    let ghosts = [
      { x: 1, y: 1, emoji: GHOSTS[0] },
      { x: COLS - 2, y: ROWS - 2, emoji: GHOSTS[1] }
    ]
    let tickMs = 170
    let ghostSkip = false // ghosts move every other tick at first

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(scoreRef.current)
    }

    const step = () => {
      // Player: turn when possible, then move.
      if (!wall(player.x + want.x, player.y + want.y)) dir = want
      if (!wall(player.x + dir.x, player.y + dir.y)) {
        player = { x: player.x + dir.x, y: player.y + dir.y }
      }
      const key = `${player.x},${player.y}`
      if (pellets.has(key)) {
        pellets.delete(key)
        scoreRef.current += 1
        setScore(scoreRef.current)
        if (pellets.size === 0) {
          pellets = freshPellets()
          tickMs = Math.max(110, tickMs - 15)
          restart()
        }
      }

      // Ghosts: chase-biased random walk (never reverse unless dead end).
      ghostSkip = !ghostSkip
      if (!ghostSkip) {
        for (const g of ghosts) {
          const options = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
          ].filter((d) => !wall(g.x + d.x, g.y + d.y))
          const towards = options.filter(
            (d) =>
              Math.abs(g.x + d.x - player.x) + Math.abs(g.y + d.y - player.y) <
              Math.abs(g.x - player.x) + Math.abs(g.y - player.y)
          )
          const pick =
            (Math.random() < 0.65 && towards.length ? towards : options)[
              Math.floor(Math.random() * (Math.random() < 0.65 && towards.length ? towards.length : options.length))
            ] ?? options[0]
          g.x += pick.x
          g.y += pick.y
        }
      }
      if (ghosts.some((g) => g.x === player.x && g.y === player.y)) return end()

      draw()
    }

    let id = setInterval(step, tickMs)
    const restart = () => {
      clearInterval(id)
      id = setInterval(step, tickMs)
    }

    const draw = () => {
      ctx.fillStyle = '#0d0d18'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          if (wall(x, y)) {
            ctx.fillStyle = '#26264a'
            ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
          } else if (pellets.has(`${x},${y}`)) {
            ctx.fillStyle = '#f5c84b'
            ctx.beginPath()
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      ctx.font = '20px serif'
      for (const g of ghosts) ctx.fillText(g.emoji, g.x * CELL + 4, g.y * CELL + 22)
      ctx.fillText('😋', player.x * CELL + 4, player.y * CELL + 22)
    }

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const w =
        k === 'arrowup' || k === 'w' ? { x: 0, y: -1 }
        : k === 'arrowdown' || k === 's' ? { x: 0, y: 1 }
        : k === 'arrowleft' || k === 'a' ? { x: -1, y: 0 }
        : k === 'arrowright' || k === 'd' ? { x: 1, y: 0 }
        : null
      if (!w) return
      e.preventDefault()
      want = w
    }

    draw()
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
        <span>👾 {score} dots</span>
        <span>⏱ {Math.max(0, timeLeft)}s</span>
        <span className="meta-dim">arrows / WASD</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="game-canvas" />
    </div>
  )
}
