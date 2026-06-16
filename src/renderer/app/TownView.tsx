import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { BUILDING_SVG, type BuildingKind } from './townBuildings'

// ---------------------------------------------------------------------------
// QuestDay v1.10 — Level-1 TOWN view (zoom into a settled town). This is the
// SPINE build: a real isometric town rendered from PLACEHOLDER blocks. Real
// hand-drawn buildings drop into these exact grid slots once the art is chosen
// (see the civilization-redesign notes). Everything here is DERIVED from the
// world stage — nothing is persisted, so ↩ Restore stays exact. Approved look:
// mockups/town-view-mockup.html.
// ---------------------------------------------------------------------------

// isometric tile + grid origin inside the 760x460 viewBox (2:1 iso).
// Tile pitch is deliberately WIDER than a building's footprint so each building
// sits in its plot with breathing room (grass) around it, instead of packing
// shoulder-to-shoulder. Kept at the 2:1 iso ratio. The 7x7 town still fits the
// 760x460 canvas at the stages players actually reach.
const TILE_W = 100
const TILE_H = 50
// Each building is drawn slightly smaller than its plot so grass shows around it
// (buildings are ~tile-sized; without this they pack shoulder-to-shoulder).
const BUILDING_SCALE = 0.72
// Organic placement: nudge each building off its exact grid centre + vary its size
// a touch, so the town reads as a natural village, not a grid. Deterministic hash
// (no Math.random) keyed on the plot → reproducible, so ↩ Restore stays exact.
const JITTER_X = 16
const JITTER_Y = 9
const hash = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h >>> 0) % 10000) / 10000
}
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

// Which building stands on each plot. Plot 0 (the centre, the heart of the town)
// is always the grand Hall; the rest cycle through the village kinds
// deterministically — so the town is varied but fully reproducible, keeping
// ↩ Restore exact (nothing here is stored; it's a pure function of the index).
const KIND_CYCLE: BuildingKind[] = [
  'tavern', 'house', 'cottage', 'house', 'keep', 'cottage', 'house',
  'tavern', 'cottage', 'house', 'cottage', 'keep', 'house', 'cottage'
]
const kindFor = (i: number): BuildingKind =>
  i === 0 ? 'hall' : KIND_CYCLE[(i - 1) % KIND_CYCLE.length]

/** One real inked building (approved hand-authored SVG, drawn around its own
 *  local origin = tile centre) dropped onto tile (gx,gy). The SVG already carries
 *  its own iso footprint, shading and drop-shadow, so we just translate it into
 *  place; the caller depth-sorts so nearer buildings paint over farther ones.
 *  NOTE: positioning lives on the OUTER <g>; the rise animation lives on the inner
 *  `.town-bldg` <g>. They must be separate elements — the animation sets `transform`
 *  (translateY), and a CSS transform overrides an SVG transform attribute, so putting
 *  both on one element would wipe the positioning and stack every building at 0,0. */
function Building({ gx, gy, kind, idx }: { gx: number; gy: number; kind: BuildingKind; idx: number }): JSX.Element {
  const { x: cx, y: cy } = iso(gx, gy)
  const isHall = gx === 0 && gy === 0 // landmark stays anchored, dead centre
  const jx = isHall ? 0 : (hash(gx, gy) * 2 - 1) * JITTER_X
  const jy = isHall ? 0 : (hash(gx * 7 + 1, gy * 13 + 5) * 2 - 1) * JITTER_Y
  const sc = isHall ? BUILDING_SCALE : BUILDING_SCALE * (0.9 + hash(gx * 3 + 2, gy * 5 + 9) * 0.2)
  return (
    <g transform={`translate(${(cx + jx).toFixed(1)}, ${(cy + jy).toFixed(1)}) scale(${sc.toFixed(3)})`}>
      <g
        className="town-bldg"
        style={{ animationDelay: `${(idx * 0.04).toFixed(2)}s` }}
        dangerouslySetInnerHTML={{ __html: BUILDING_SVG[kind] }}
      />
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
  const shown = PLOTS.slice(0, count).map(([gx, gy], i) => ({ gx, gy, kind: kindFor(i), idx: i }))
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
        aria-label={`${townName}, a ${stageName} — ${count} buildings`}
      >
        <Ground />
        {shown.map((s) => (
          <Building key={`${s.gx},${s.gy}`} gx={s.gx} gy={s.gy} kind={s.kind} idx={s.idx} />
        ))}
      </svg>
    </motion.div>
  )
}
