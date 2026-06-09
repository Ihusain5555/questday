import { useEffect, useRef, useState } from 'react'
import { balance } from '@shared/config/balance'

const COLS = 10
const ROWS = 18
const CELL = 22

// The 7 classic tetrominoes as cell offsets + a color each.
const PIECES: { cells: [number, number][]; color: string }[] = [
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#38bdf8' }, // I
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#facc15' }, // O
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: '#a855f7' }, // T
  { cells: [[0, 1], [1, 1], [1, 0], [2, 0]], color: '#4ade80' }, // S
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#ef4444' }, // Z
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#3b82f6' }, // J
  { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#fb923c' }  // L
]

/**
 * 🧱 Block Drop — the falling-blocks classic. Arrows move/rotate, space hard-
 * drops. Round ends at the time cap or top-out, scoring lines cleared.
 */
export function BlockDrop({ onFinish }: { onFinish: (score: number) => void }): JSX.Element {
  const cfg = balance.arcade.games.blockdrop
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lines, setLines] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number>(cfg.seconds)
  const done = useRef(false)
  const linesRef = useRef(0)

  // Countdown (declarative; the canvas loop below is imperative).
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (timeLeft <= 0 && !done.current) {
      done.current = true
      onFinish(linesRef.current)
    }
  }, [timeLeft, onFinish])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const board: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    let piece = spawn()
    let dropMs = 600

    function spawn() {
      const p = PIECES[Math.floor(Math.random() * PIECES.length)]
      return { cells: p.cells.map(([x, y]) => [x, y] as [number, number]), color: p.color, x: 3, y: 0 }
    }

    const collides = (cells: [number, number][], px: number, py: number) =>
      cells.some(([cx, cy]) => {
        const x = px + cx
        const y = py + cy
        return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null)
      })

    const rotated = () => {
      const maxY = Math.max(...piece.cells.map(([, y]) => y))
      return piece.cells.map(([x, y]) => [maxY - y, x] as [number, number])
    }

    const lockPiece = () => {
      for (const [cx, cy] of piece.cells) {
        const y = piece.y + cy
        if (y < 0) return end() // topped out — round over, score kept
        board[y][piece.x + cx] = piece.color
      }
      // Clear full lines bottom-up.
      let cleared = 0
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every((c) => c !== null)) {
          board.splice(y, 1)
          board.unshift(Array(COLS).fill(null))
          cleared += 1
          y += 1
        }
      }
      if (cleared > 0) {
        linesRef.current += cleared
        setLines(linesRef.current)
        dropMs = Math.max(260, 600 - linesRef.current * 30) // gentle speed-up
      }
      piece = spawn()
      if (collides(piece.cells, piece.x, piece.y)) end()
    }

    const end = () => {
      if (done.current) return
      done.current = true
      onFinish(linesRef.current)
    }

    const step = () => {
      if (!collides(piece.cells, piece.x, piece.y + 1)) piece.y += 1
      else lockPiece()
      draw()
    }

    const draw = () => {
      ctx.fillStyle = '#101418'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (board[y][x]) {
            ctx.fillStyle = board[y][x] as string
            ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
          }
      ctx.fillStyle = piece.color
      for (const [cx, cy] of piece.cells)
        ctx.fillRect((piece.x + cx) * CELL + 1, (piece.y + cy) * CELL + 1, CELL - 2, CELL - 2)
    }

    const onKey = (e: KeyboardEvent) => {
      if (done.current) return
      const k = e.key
      if (!['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)) return
      e.preventDefault()
      if (k === 'ArrowLeft' && !collides(piece.cells, piece.x - 1, piece.y)) piece.x -= 1
      if (k === 'ArrowRight' && !collides(piece.cells, piece.x + 1, piece.y)) piece.x += 1
      if (k === 'ArrowDown') step()
      if (k === 'ArrowUp') {
        const r = rotated()
        if (!collides(r, piece.x, piece.y)) piece.cells = r
      }
      if (k === ' ') {
        while (!collides(piece.cells, piece.x, piece.y + 1)) piece.y += 1
        lockPiece()
      }
      draw()
    }

    draw()
    let id = setInterval(step, dropMs)
    // Re-arm the gravity timer when speed changes (cheap: re-check each tick).
    const speedWatch = setInterval(() => {
      clearInterval(id)
      id = setInterval(step, dropMs)
    }, 5000)
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      clearInterval(speedWatch)
      window.removeEventListener('keydown', onKey)
    }
  }, [onFinish])

  const endEarly = () => {
    if (done.current) return
    done.current = true
    onFinish(linesRef.current)
  }

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>🧱 {lines} lines</span>
        <span>⏱ {Math.max(0, timeLeft)}s</span>
        <span className="meta-dim">←→↓ move · ↑ rotate · space drop</span>
        <button onClick={endEarly}>End round</button>
      </div>
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="game-canvas" />
    </div>
  )
}
