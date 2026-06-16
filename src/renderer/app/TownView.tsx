import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { BUILDING_SVG, type BuildingKind } from './townBuildings'
import { BIOME_GROUND, type BiomeKey } from './biomeDecor'

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
// Ground decorations are drawn at preview size; this keeps even the tallest ones
// (trees/pines) safely UNDER the houses so they read as ground cover, not giants.
const DECORATION_SCALE = 0.45
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

// A placed thing on the town floor — either a building or a decoration — carrying
// its final screen position so buildings + decorations can be depth-sorted together.
type Placed =
  | { sort: number; x: number; y: number; sc: number; kind: 'bldg'; bk: BuildingKind; idx: number; key: string }
  | { sort: number; x: number; y: number; sc: number; kind: 'deco'; svg: string; key: string }

/** Building placement on tile (gx,gy): organic jitter + size variation; the centre
 *  Hall stays anchored. Returns final position/scale (drawn around local origin). */
function buildingAt(gx: number, gy: number, idx: number): Placed {
  const { x, y } = iso(gx, gy)
  const isHall = gx === 0 && gy === 0
  const jx = isHall ? 0 : (hash(gx, gy) * 2 - 1) * JITTER_X
  const jy = isHall ? 0 : (hash(gx * 7 + 1, gy * 13 + 5) * 2 - 1) * JITTER_Y
  const sc = isHall ? BUILDING_SCALE : BUILDING_SCALE * (0.9 + hash(gx * 3 + 2, gy * 5 + 9) * 0.2)
  return { sort: y + jy, x: x + jx, y: y + jy, sc, kind: 'bldg', bk: kindFor(idx), idx, key: `b${gx},${gy}` }
}

/** Scatter biome decorations on the town's EMPTY tiles (0..2 per tile), themed by
 *  biome, deterministic (no Math.random) so it never reshuffles → ↩ Restore exact.
 *  Earlier decorations in the set (ground cover) are favoured over the bigger ones. */
function decorationsFor(biome: BiomeKey, occupied: Set<string>): Placed[] {
  const decos = BIOME_GROUND[biome].decorations
  const out: Placed[] = []
  for (let gx = -3; gx <= 3; gx++) {
    for (let gy = -3; gy <= 3; gy++) {
      if (occupied.has(`${gx},${gy}`)) continue
      const n = Math.floor(hash(gx * 5 + 3, gy * 7 + 2) * 2.6) // 0..2
      const { x, y } = iso(gx, gy)
      for (let k = 0; k < n; k++) {
        const ox = (hash(gx * 3 + k, gy * 2 + k * 9) * 2 - 1) * 30
        const oy = (hash(gx * 9 + k * 3, gy * 4 + k) * 2 - 1) * 14
        const wi = Math.min(Math.floor(Math.pow(hash(gx + k * 13, gy + k * 7), 1.6) * decos.length), decos.length - 1)
        const sc = DECORATION_SCALE * (0.8 + hash(gx * 2 + k, gy * 3 + k) * 0.5)
        out.push({ sort: y + oy, x: x + ox, y: y + oy, sc, kind: 'deco', svg: decos[wi], key: `d${gx},${gy},${k}` })
      }
    }
  }
  return out
}

/** The town ground diamond, tinted to the biome + a few soft accent patches for
 *  texture (clipped to the diamond). The scattered decorations sit on top of this. */
function Ground({ biome }: { biome: BiomeKey }): JSX.Element {
  const g = BIOME_GROUND[biome]
  const c = (gx: number, gy: number): string => {
    const p = iso(gx, gy)
    return `${p.x},${p.y}`
  }
  const dpts = `${c(-3.5, -3.5)} ${c(3.5, -3.5)} ${c(3.5, 3.5)} ${c(-3.5, 3.5)}`
  const patches: JSX.Element[] = []
  for (let i = 0; i < 8; i++) {
    const r = hash(i * 11 + 1, i * 7 + 3)
    const px = OX + (r - 0.5) * TILE_W * 5
    const py = OY + (hash(i * 3 + 2, i * 5 + 1) - 0.5) * TILE_H * 5
    patches.push(<ellipse key={i} cx={px} cy={py} rx={30 + r * 40} ry={14 + r * 18} fill={g.accent} opacity={0.5} />)
  }
  return (
    <g>
      <defs>
        <clipPath id="town-ground-clip">
          <polygon points={dpts} />
        </clipPath>
      </defs>
      <polygon points={dpts} fill={g.base} stroke="#a9b88a" strokeWidth={2} />
      <g clipPath="url(#town-ground-clip)">{patches}</g>
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
  biome,
  onExit
}: {
  townName: string
  stageName: string
  stageIndex: number
  biome: BiomeKey
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
  const plots = PLOTS.slice(0, count)
  const occupied = new Set(plots.map(([gx, gy]) => `${gx},${gy}`))
  // Buildings + biome decorations, merged and depth-sorted back-to-front by screen-y
  // so nearer things (lower on screen) paint over farther ones.
  const items: Placed[] = [
    ...plots.map(([gx, gy], i) => buildingAt(gx, gy, i)),
    ...decorationsFor(biome, occupied)
  ].sort((m, n) => m.sort - n.sort)

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
        <Ground biome={biome} />
        {items.map((it) =>
          it.kind === 'bldg' ? (
            <g key={it.key} transform={`translate(${it.x.toFixed(1)}, ${it.y.toFixed(1)}) scale(${it.sc.toFixed(3)})`}>
              <g
                className="town-bldg"
                style={{ animationDelay: `${(it.idx * 0.04).toFixed(2)}s` }}
                dangerouslySetInnerHTML={{ __html: BUILDING_SVG[it.bk] }}
              />
            </g>
          ) : (
            <g
              key={it.key}
              className="town-deco"
              transform={`translate(${it.x.toFixed(1)}, ${it.y.toFixed(1)}) scale(${it.sc.toFixed(3)})`}
              dangerouslySetInnerHTML={{ __html: it.svg }}
            />
          )
        )}
      </svg>
    </motion.div>
  )
}
