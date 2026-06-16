import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'

// ---------------------------------------------------------------------------
// QuestDay v1.10 — Level-1 TOWN view (zoom into a settled town). This is the
// SPINE build: a real isometric town rendered from PLACEHOLDER blocks. Real
// hand-drawn buildings drop into these exact grid slots once the art is chosen
// (see the civilization-redesign notes). Everything here is DERIVED from the
// world stage — nothing is persisted, so ↩ Restore stays exact. Approved look:
// mockups/town-view-mockup.html.
// ---------------------------------------------------------------------------

// isometric tile + grid origin inside the 760x460 viewBox (2:1 iso).
const TILE_W = 70
const TILE_H = 35
const OX = 380
const OY = 210
const iso = (gx: number, gy: number): { x: number; y: number } => ({
  x: OX + (gx - gy) * (TILE_W / 2),
  y: OY + (gx + gy) * (TILE_H / 2)
})

// Placeholder building count per world-stage index (Camp..Empire). Mirrors the
// approved mockup; a pure function of the civ stage (NOT stored).
const COUNT_BY_STAGE = [2, 4, 7, 11, 16, 22, 30]

// Build plots: a 7x7 grid ordered center-out (Chebyshev ring, then distance,
// then angle) so the town grows organically from the middle. Deterministic (no
// randomness) → reproducible and ↩Restore-safe when wired to completions later.
const PLOTS: Array<[number, number]> = (() => {
  const cells: Array<[number, number]> = []
  for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) cells.push([gx, gy])
  const cheb = ([x, y]: [number, number]): number => Math.max(Math.abs(x), Math.abs(y))
  const euc = ([x, y]: [number, number]): number => x * x + y * y
  const ang = ([x, y]: [number, number]): number => Math.atan2(y, x)
  return cells.sort((a, b) => cheb(a) - cheb(b) || euc(a) - euc(b) || ang(a) - ang(b))
})()

type BType = 'small' | 'medium' | 'large'
const SIZE: Record<BType, { f: number; h: number }> = {
  small: { f: 0.52, h: 22 },
  medium: { f: 0.66, h: 38 },
  large: { f: 0.82, h: 58 }
}
// The centre plot is the landmark (large); the rest mix cottages + houses
// deterministically (previews "buildings scale by difficulty").
const typeFor = (i: number): BType =>
  i === 0 ? 'large' : [3, 6, 9, 12, 15, 19, 24].includes(i) ? 'medium' : 'small'

/** One placeholder cuboid sitting on tile (gx,gy): a shaded box (top + two
 *  sides) + a soft drop-shadow; the landmark also flies a little flag. */
function Building({ gx, gy, type, idx }: { gx: number; gy: number; type: BType; idx: number }): JSX.Element {
  const { x: cx, y: cy } = iso(gx, gy)
  const { f, h } = SIZE[type]
  const a = (TILE_W / 2) * f
  const b = (TILE_H / 2) * f
  const pts = (arr: Array<[number, number]>): string => arr.map((p) => p.join(',')).join(' ')
  const L: [number, number] = [cx - a, cy]
  const B: [number, number] = [cx, cy + b]
  const R: [number, number] = [cx + a, cy]
  const Lt: [number, number] = [cx - a, cy - h]
  const Bt: [number, number] = [cx, cy + b - h]
  const Rt: [number, number] = [cx + a, cy - h]
  const Tt: [number, number] = [cx, cy - b - h]
  return (
    <g className="town-bldg" style={{ animationDelay: `${(idx * 0.04).toFixed(2)}s` }}>
      <ellipse cx={cx} cy={cy + b * 0.35} rx={a * 1.18} ry={b * 1.18} fill="rgba(60,46,20,0.16)" />
      <polygon points={pts([L, B, Bt, Lt])} fill="#b6a67f" stroke="#5a4a2e" strokeWidth={1.3} />
      <polygon points={pts([B, R, Rt, Bt])} fill="#8d7d5d" stroke="#5a4a2e" strokeWidth={1.3} />
      <polygon points={pts([Tt, Rt, Bt, Lt])} fill="#d8ccab" stroke="#5a4a2e" strokeWidth={1.3} />
      {type === 'large' && (
        <>
          <line x1={cx} y1={cy - b - h} x2={cx} y2={cy - b - h - 22} stroke="#5a4a2e" strokeWidth={2} />
          <path
            d={`M${cx} ${cy - b - h - 22} L ${cx + 16} ${cy - b - h - 17} L ${cx} ${cy - b - h - 12} Z`}
            fill="#caa24a"
            stroke="#5a4a2e"
            strokeWidth={1}
          />
        </>
      )}
    </g>
  )
}

/** The soft town ground diamond + a faint tile grid, drawn once behind the buildings. */
function Ground(): JSX.Element {
  const c = (gx: number, gy: number): string => {
    const p = iso(gx, gy)
    return `${p.x},${p.y}`
  }
  const lines: JSX.Element[] = []
  for (let g = 0; g <= 7; g++) {
    const gi = g - 3.5
    const a1 = iso(gi, -3.5)
    const a2 = iso(gi, 3.5)
    const b1 = iso(-3.5, gi)
    const b2 = iso(3.5, gi)
    lines.push(<line key={`x${g}`} x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y} stroke="#bcc7a3" strokeWidth={1} opacity={0.5} />)
    lines.push(<line key={`y${g}`} x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke="#bcc7a3" strokeWidth={1} opacity={0.5} />)
  }
  return (
    <g>
      <polygon
        points={`${c(-3.5, -3.5)} ${c(3.5, -3.5)} ${c(3.5, 3.5)} ${c(-3.5, 3.5)}`}
        fill="#d9e3c4"
        stroke="#a9b88a"
        strokeWidth={2}
      />
      {lines}
    </g>
  )
}

/**
 * The town overlay: a back bar + an isometric town of placeholder buildings
 * whose count grows with the world stage. `stageIndex` (0=Camp .. 6=Empire) is
 * a pure function of all-time completions, so the town reflects real progress
 * with nothing stored. Esc or the back button returns to the map.
 */
export function TownView({
  townName,
  stageName,
  stageIndex,
  onExit
}: {
  townName: string
  stageName: string
  stageIndex: number
  onExit: () => void
}): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit])

  const count = COUNT_BY_STAGE[Math.max(0, Math.min(stageIndex, COUNT_BY_STAGE.length - 1))]
  // Reveal the first `count` plots (center-out), then depth-sort back-to-front
  // (by gx+gy) so nearer buildings correctly paint over farther ones. The
  // animation delay uses the center-out index so the town rises from the middle.
  const shown = PLOTS.slice(0, count).map(([gx, gy], i) => ({ gx, gy, type: typeFor(i), idx: i }))
  shown.sort((m, n) => m.gx + m.gy - (n.gx + n.gy) || m.gx - n.gx)

  return (
    <motion.div
      className="town-overlay"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <div className="town-topbar">
        <button className="town-back" onClick={onExit}>
          <ArrowLeft size={15} weight="bold" /> Back to map
        </button>
        <span className="town-name">{townName}</span>
        <span className="town-stage">{stageName}</span>
      </div>
      <svg
        className="town-canvas"
        viewBox="0 0 760 460"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${townName}, a ${stageName} — ${count} buildings (placeholder art)`}
      >
        <Ground />
        {shown.map((s) => (
          <Building key={`${s.gx},${s.gy}`} gx={s.gx} gy={s.gy} type={s.type} idx={s.idx} />
        ))}
      </svg>
      <div className="town-foot">Placeholder buildings — real hand-drawn art arrives next.</div>
    </motion.div>
  )
}
