import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowCounterClockwise, PencilSimple, Check } from '@phosphor-icons/react'
import { BUILDING_SVG, type BuildingKind } from './townBuildings'
import { BIOME_GROUND, type BiomeKey } from './biomeDecor'
import type { PlotOverride, SwappableKind } from '@shared/types'

// ---------------------------------------------------------------------------
// QuestDay v1.10 — Level-1 TOWN view (zoom into a settled town). This is the
// SPINE build: a real isometric town rendered from PLACEHOLDER blocks. Real
// hand-drawn buildings drop into these exact grid slots once the art is chosen
// (see the civilization-redesign notes). The town is DERIVED from the world stage;
// an OPTIONAL saved arrangement (townLayouts overrides) is applied read-only on top
// and never affects the building COUNT, so ↩ Restore stays exact. Approved look:
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

// --- POLISH (v1.10 town look) -------------------------------------------------
// Lighten (amt>0) / darken (amt<0) a #rgb|#rrggbb hex toward white|black, so we can
// derive a richer 2-tone land + layered grass mottle from the SINGLE base/accent each
// biome ships — no new data, fully deterministic (keeps ↩ Restore exact).
function shade(hex: string, amt: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const num = parseInt(h, 16)
  let r = (num >> 16) & 255
  let g = (num >> 8) & 255
  let b = num & 255
  const target = amt < 0 ? 0 : 255
  const p = Math.abs(amt)
  r = Math.round(r + (target - r) * p)
  g = Math.round(g + (target - g) * p)
  b = Math.round(b + (target - b) * p)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Soft contact-shadow footprint per building kind (a touch larger than the baked core
// ellipse in townBuildings, drawn blurred UNDER the building so it sits on the land
// instead of floating). cx is local 0; cy/rx/ry are building-local units and scale
// with the building's own transform.
const SHADOW_FP: Record<BuildingKind, { cy: number; rx: number; ry: number }> = {
  hall: { cy: 9.2, rx: 56, ry: 27 },
  keep: { cy: 5.0, rx: 37, ry: 18 },
  tavern: { cy: 4.1, rx: 30, ry: 14.5 },
  house: { cy: 4.1, rx: 30, ry: 14.5 },
  cottage: { cy: 3.2, rx: 24, ry: 11.5 }
}

// The land diamond outline (iso corners), reused by the clip, the ground fill and the
// warm light wash so they line up exactly.
const DIAMOND_PTS: string = (() => {
  const c = (gx: number, gy: number): string => {
    const p = iso(gx, gy)
    return `${p.x},${p.y}`
  }
  return `${c(-3.5, -3.5)} ${c(3.5, -3.5)} ${c(3.5, 3.5)} ${c(-3.5, 3.5)}`
})()

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

// Inverse of iso(): map an SVG point back to the nearest grid cell's PLOTS index, or
// -1 if it falls outside the 7x7 grid. (u,v) undo the iso projection; round to a cell.
function nearestCell(x: number, y: number): number {
  const u = (x - OX) / (TILE_W / 2)
  const v = (y - OY) / (TILE_H / 2)
  const gx = Math.round((u + v) / 2)
  const gy = Math.round((v - u) / 2)
  if (gx < -3 || gx > 3 || gy < -3 || gy > 3) return -1
  return PLOTS.findIndex(([px, py]) => px === gx && py === gy)
}

// Faint tile outlines drawn in Edit mode so the player can see the grid (static). Each
// cell is a full iso diamond around its centre.
const GRID_CELLS: string[] = PLOTS.map(([gx, gy]) => {
  const c = iso(gx, gy)
  return `${c.x},${(c.y - TILE_H / 2).toFixed(1)} ${(c.x + TILE_W / 2).toFixed(1)},${c.y} ${c.x},${(c.y + TILE_H / 2).toFixed(1)} ${(c.x - TILE_W / 2).toFixed(1)},${c.y}`
})

// Honor the OS "reduce motion" setting (the spring-back becomes instant).
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Ease an SVG <g>'s transform from (fromX,fromY) back to (toX,toY) over ~170ms — used to
// gently return a building after an invalid drop. (CSS transitions can't animate the SVG
// transform ATTRIBUTE, so we hand-tween it via rAF; reduced-motion skips straight to the end.)
function springTransform(
  gEl: SVGGElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  sc: number
): void {
  const set = (x: number, y: number): void =>
    gEl.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${sc.toFixed(3)})`)
  if (prefersReducedMotion()) {
    set(toX, toY)
    return
  }
  const dur = 170
  const t0 = performance.now()
  const ease = (t: number): number => 1 - Math.pow(1 - t, 3)
  const step = (now: number): void => {
    const t = Math.min(1, (now - t0) / dur)
    const k = ease(t)
    set(fromX + (toX - fromX) * k, fromY + (toY - fromY) * k)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

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

/** Resolve which PLOTS cell each building index occupies, applying the player's
 *  saved MOVE overrides on top of the deterministic auto-layout. Returns
 *  { idx → cell } pairs (cell = a PLOTS index). Rules (spec §6.4):
 *   • The Hall (index 0) is pinned to cell 0 and is never moved.
 *   • A building with a valid `cell` override claims that cell (lower index wins
 *     on the rare collision; an invalid/already-taken target falls back to auto).
 *   • Every other building keeps its OWN default cell (index i) when free, else
 *     reflows to the next free center-out cell — so untouched buildings never
 *     shift, and new buildings flow around whatever the player placed.
 *  An override on an index ≥ count is naturally ignored (that building isn't drawn). */
function resolveLayout(
  count: number,
  overrides: Record<number, PlotOverride>
): Array<{ idx: number; cell: number }> {
  const cellOf = new Map<number, number>() // buildingIndex → cell (PLOTS index)
  const claimed = new Map<number, number>() // cell → buildingIndex
  const claim = (cell: number, i: number): void => {
    claimed.set(cell, i)
    cellOf.set(i, cell)
  }
  const validCell = (c: number): boolean => Number.isInteger(c) && c >= 1 && c < PLOTS.length

  claim(0, 0) // Hall: fixed landmark at the town centre.

  // Pass A — overridden buildings claim their target cell.
  for (let i = 1; i < count; i++) {
    const c = overrides[i]?.cell
    if (c != null && validCell(c) && !claimed.has(c)) claim(c, i)
  }
  // Pass B — every still-unplaced building takes its own cell if free, else the next
  // free center-out cell (covers no-override buildings AND overrides whose target was
  // invalid or already taken).
  const nextFree = (): number => {
    for (let c = 1; c < PLOTS.length; c++) if (!claimed.has(c)) return c
    return -1
  }
  for (let i = 1; i < count; i++) {
    if (cellOf.has(i)) continue
    const cell = !claimed.has(i) ? i : nextFree()
    if (cell >= 0) claim(cell, i)
  }
  return Array.from(cellOf, ([idx, cell]) => ({ idx, cell }))
}

// A placed thing on the town floor — either a building or a decoration — carrying
// its final screen position so buildings + decorations can be depth-sorted together.
type Placed =
  | { sort: number; x: number; y: number; sc: number; kind: 'bldg'; bk: BuildingKind; idx: number; filter: string; key: string }
  | { sort: number; x: number; y: number; sc: number; kind: 'deco'; svg: string; key: string }

/** Building placement on tile (gx,gy): organic jitter + size variation; the centre
 *  Hall stays anchored. Returns final position/scale (drawn around local origin) plus a
 *  subtle per-building weathering tint so the repeated kinds don't read as clones. */
function buildingAt(gx: number, gy: number, idx: number): Placed {
  const { x, y } = iso(gx, gy)
  const isHall = gx === 0 && gy === 0
  const jx = isHall ? 0 : (hash(gx, gy) * 2 - 1) * JITTER_X
  const jy = isHall ? 0 : (hash(gx * 7 + 1, gy * 13 + 5) * 2 - 1) * JITTER_Y
  const sc = isHall ? BUILDING_SCALE : BUILDING_SCALE * (0.9 + hash(gx * 3 + 2, gy * 5 + 9) * 0.2)
  // Per-building weathering: subtle deterministic brightness/saturation/hue shift so the
  // repeated kinds read as individual buildings. The centre Hall stays neutral (the
  // showpiece). Keyed on the plot → reproducible, ↩ Restore exact.
  const br = isHall ? 1 : 0.93 + hash(gx * 11 + 4, gy * 3 + 8) * 0.14
  const sat = isHall ? 1 : 0.92 + hash(gx * 5 + 7, gy * 17 + 2) * 0.18
  const hr = isHall ? 0 : (hash(gx * 13 + 6, gy * 7 + 9) * 2 - 1) * 6
  const filter = isHall ? 'none' : `brightness(${br.toFixed(3)}) saturate(${sat.toFixed(3)}) hue-rotate(${hr.toFixed(1)}deg)`
  return { sort: y + jy, x: x + jx, y: y + jy, sc, kind: 'bldg', bk: kindFor(idx), idx, filter, key: `b${gx},${gy}` }
}

// How densely each biome scatters ground cover. Lush landscapes (forest, meadow) fill
// in; arid/cold ones (desert, tundra) stay sparse — matching what each land should look
// like. Multiplies the base scatter (capped at 3). Deterministic → ↩ Restore exact.
const DENSITY_BY_BIOME: Record<BiomeKey, number> = {
  meadow: 1.15,
  forest: 1.35,
  moor: 1.0,
  marsh: 1.05,
  coast: 0.85,
  mountains: 0.8,
  desert: 0.55,
  tundra: 0.6
}

/** Scatter biome decorations on the town's EMPTY tiles (0..3 per tile, biome-scaled),
 *  themed by biome, deterministic (no Math.random) so it never reshuffles → ↩ Restore
 *  exact. Earlier decorations in the set (ground cover) are favoured over the bigger ones. */
function decorationsFor(biome: BiomeKey, occupied: Set<string>): Placed[] {
  const decos = BIOME_GROUND[biome].decorations
  const density = DENSITY_BY_BIOME[biome]
  const out: Placed[] = []
  for (let gx = -3; gx <= 3; gx++) {
    for (let gy = -3; gy <= 3; gy++) {
      if (occupied.has(`${gx},${gy}`)) continue
      const n = Math.min(3, Math.floor(hash(gx * 5 + 3, gy * 7 + 2) * 2.6 * density)) // biome-scaled 0..3
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

/** The town ground diamond: a 2-tone biome gradient (land form) + two layers of soft
 *  accent mottle + fine dapple specks + a blurred inner-rim shade (raised-land feel),
 *  all clipped to the diamond. Everything is deterministic so the land never reshuffles
 *  (↩ Restore exact). The scattered decorations + buildings sit on top of this. */
function Ground({ biome }: { biome: BiomeKey }): JSX.Element {
  const g = BIOME_GROUND[biome]
  const gradId = `town-ground-grad-${biome}`
  const light = shade(g.base, 0.1)
  const dark = shade(g.base, -0.12)
  const accentDark = shade(g.accent, -0.16)
  const border = shade(g.base, -0.3)

  // Mottled grass: a lit accent layer + a darker accent layer + fine dapple specks.
  const patches: JSX.Element[] = []
  for (let i = 0; i < 11; i++) {
    const r = hash(i * 11 + 1, i * 7 + 3)
    const px = OX + (r - 0.5) * TILE_W * 5.4
    const py = OY + (hash(i * 3 + 2, i * 5 + 1) - 0.5) * TILE_H * 5.4
    patches.push(<ellipse key={`pl${i}`} cx={px} cy={py} rx={26 + r * 46} ry={12 + r * 20} fill={g.accent} opacity={0.18 + r * 0.22} />)
  }
  for (let i = 0; i < 7; i++) {
    const r = hash(i * 17 + 5, i * 13 + 9)
    const px = OX + (r - 0.5) * TILE_W * 5.2
    const py = OY + (hash(i * 23 + 4, i * 3 + 7) - 0.5) * TILE_H * 5.0
    patches.push(<ellipse key={`pd${i}`} cx={px} cy={py} rx={18 + r * 30} ry={9 + r * 14} fill={accentDark} opacity={0.1 + r * 0.12} />)
  }
  const dapple: JSX.Element[] = []
  for (let i = 0; i < 26; i++) {
    const r = hash(i * 29 + 3, i * 19 + 11)
    const px = OX + (r - 0.5) * TILE_W * 6.2
    const py = OY + (hash(i * 7 + 13, i * 11 + 2) - 0.5) * TILE_H * 6.0
    dapple.push(<circle key={`dp${i}`} cx={px} cy={py} r={1.1 + r * 1.7} fill={i % 2 === 0 ? light : accentDark} opacity={0.24} />)
  }

  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="52%" stopColor={g.base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <polygon points={DIAMOND_PTS} fill={`url(#${gradId})`} stroke={border} strokeWidth={2} strokeLinejoin="round" />
      <g clipPath="url(#town-ground-clip)">
        {patches}
        {dapple}
        {/* inner-rim shade: the inset half of a blurred stroke reads as raised land */}
        <polygon points={DIAMOND_PTS} fill="none" stroke={dark} strokeWidth={11} opacity={0.45} filter="url(#town-shadow-soft)" />
      </g>
    </g>
  )
}

// The 4 building kinds the player may swap to (the Hall is never swappable).
const SWAP_KINDS: SwappableKind[] = ['keep', 'tavern', 'house', 'cottage']
const KIND_LABEL: Record<SwappableKind, string> = {
  keep: 'Keep',
  tavern: 'Tavern',
  house: 'House',
  cottage: 'Cottage'
}
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** The "Change type" popover (Edit mode). Drawn IN SVG near the tapped building so it
 *  scales crisply with the town and needs no pixel-coordinate conversion. The 4 kinds
 *  use the real building art as icons; the current kind is highlighted. */
function TownEditPopover({
  x,
  y,
  current,
  onPick
}: {
  x: number
  y: number
  current: BuildingKind
  onPick: (k: SwappableKind) => void
}): JSX.Element {
  const W = 178
  const H = 152
  // Flip to whichever side has room; clamp fully inside the 760x460 canvas.
  const px = clamp(x < 380 ? x + 46 : x - 46 - W, 6, 760 - W - 6)
  const py = clamp(y - H / 2, 6, 460 - H - 6)
  return (
    <g className="town-pop" transform={`translate(${px.toFixed(1)}, ${py.toFixed(1)})`}>
      <rect className="town-pop-bg" x={0} y={0} width={W} height={H} rx={13} />
      <text className="town-pop-title" x={14} y={23}>
        Change type
      </text>
      {SWAP_KINDS.map((k, i) => {
        const bx = 12 + (i % 2) * 81
        const by = 36 + Math.floor(i / 2) * 56
        return (
          <g
            key={k}
            className={`town-pop-btn${k === current ? ' on' : ''}`}
            onClick={() => onPick(k)}
          >
            <rect className="town-pop-cell" x={bx} y={by} width={77} height={50} rx={9} />
            <g
              transform={`translate(${bx + 38.5}, ${by + 31}) scale(0.22)`}
              dangerouslySetInnerHTML={{ __html: BUILDING_SVG[k] }}
            />
            <text className="town-pop-label" x={bx + 38.5} y={by + 46} textAnchor="middle">
              {KIND_LABEL[k]}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * The town overlay: a back bar + an isometric town of placeholder buildings
 * whose count grows with all-time XP (effort-weighted), passed in as `buildingCount`
 * by the caller — a pure function of XP, so the town reflects real progress with
 * nothing stored. Esc or the back button returns to the map. An optional Edit mode
 * (when `onEditLayout` is wired) lets the player tap a building to swap its type.
 */
export function TownView({
  townName,
  stageName,
  buildingCount,
  overrides = {},
  onEditLayout,
  biome,
  onExit
}: {
  townName: string
  stageName: string
  /** How many buildings to render — derived from all-time XP by the caller. */
  buildingCount: number
  /** The player's saved arrangement for this town: a sparse map of building index
   *  → { cell?, kind? }. A SEALED layer applied read-only here — it NEVER affects the
   *  XP-derived count above, so ↩ Restore stays exact. Default {} = the auto-layout. */
  overrides?: Record<number, PlotOverride>
  /** Persist a new arrangement for this town. When provided, Edit mode is available
   *  (a tap-to-swap popover). Receives the FULL overrides map for the town. */
  onEditLayout?: (overrides: Record<number, PlotOverride>) => void
  biome: BiomeKey
  onExit: () => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const canEdit = !!onEditLayout
  const hasEdits = Object.keys(overrides).length > 0
  const reduce = useReducedMotion()

  // Esc steps back out one level at a time: close the confirm, then the picker, then
  // leave Edit mode, then exit the town.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (confirming) setConfirming(false)
      else if (picker) setPicker(null)
      else if (editing) setEditing(false)
      else onExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit, editing, picker, confirming])

  const openPicker = (idx: number, x: number, y: number): void => {
    if (idx === 0) return // the Hall is the fixed landmark — never swappable
    setPicker({ idx, x, y })
  }
  const swap = (idx: number, kind: SwappableKind): void => {
    // Write only this building's kind override; everything else is preserved.
    onEditLayout?.({ ...overrides, [idx]: { ...overrides[idx], kind } })
    setPicker(null)
  }
  const toggleEdit = (): void => {
    setPicker(null)
    setConfirming(false)
    setEditing((e) => !e)
  }
  const resetLayout = (): void => {
    onEditLayout?.({}) // empty map → the town's entry is removed → back to the auto-layout
    setConfirming(false)
  }

  // --- Drag-to-move (pointer events; imperative during the drag for smoothness) ------
  const svgRef = useRef<SVGSVGElement>(null)
  const hiRef = useRef<SVGPolygonElement>(null)
  const dragRef = useRef<{
    idx: number
    gEl: SVGGElement
    originX: number
    originY: number
    sc: number
    downX: number
    downY: number
    downSvgX: number
    downSvgY: number
    lastX: number
    lastY: number
    moved: boolean
  } | null>(null)

  // Map a screen (client) point into the SVG's coordinate space via its live CTM.
  const toSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }

  // The drop-target highlight diamond (driven imperatively so a drag never re-renders).
  const setHighlight = (cell: number, valid: boolean): void => {
    const hi = hiRef.current
    if (!hi) return
    if (cell < 1) {
      hi.setAttribute('points', '')
      hi.setAttribute('class', 'town-drop-hi')
      return
    }
    const [gx, gy] = PLOTS[cell]
    const c = iso(gx, gy)
    hi.setAttribute(
      'points',
      `${c.x},${c.y - TILE_H / 2} ${c.x + TILE_W / 2},${c.y} ${c.x},${c.y + TILE_H / 2} ${c.x - TILE_W / 2},${c.y}`
    )
    hi.setAttribute('class', `town-drop-hi ${valid ? 'ok' : 'no'}`)
  }

  // A drop is valid on an empty in-grid cell that isn't the Hall (cell 0). The dragged
  // building's own current cell counts as free.
  const isValidDrop = (cell: number, idx: number): boolean =>
    cell >= 1 && !layout.some((l) => l.idx !== idx && l.cell === cell)

  const onBldgPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    idx: number,
    originX: number,
    originY: number,
    sc: number
  ): void => {
    if (!editing || idx === 0) return
    e.stopPropagation()
    const rect = e.currentTarget
    rect.setPointerCapture(e.pointerId)
    const p = toSvg(e.clientX, e.clientY)
    dragRef.current = {
      idx,
      gEl: rect.parentNode as SVGGElement,
      originX,
      originY,
      sc,
      downX: e.clientX,
      downY: e.clientY,
      downSvgX: p ? p.x : originX,
      downSvgY: p ? p.y : originY,
      lastX: originX,
      lastY: originY,
      moved: false
    }
  }

  const onBldgPointerMove = (e: ReactPointerEvent<SVGRectElement>): void => {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.downX, e.clientY - d.downY) < 6) return // tap, not drag
    d.moved = true
    const p = toSvg(e.clientX, e.clientY)
    if (!p) return
    const nx = d.originX + (p.x - d.downSvgX)
    const ny = d.originY + (p.y - d.downSvgY)
    d.lastX = nx
    d.lastY = ny
    d.gEl.setAttribute('transform', `translate(${nx.toFixed(1)}, ${ny.toFixed(1)}) scale(${d.sc.toFixed(3)})`)
    const cell = nearestCell(nx, ny)
    setHighlight(cell, isValidDrop(cell, d.idx))
  }

  const onBldgPointerUp = (
    e: ReactPointerEvent<SVGRectElement>,
    idx: number,
    ox: number,
    oy: number
  ): void => {
    const d = dragRef.current
    dragRef.current = null
    setHighlight(-1, false)
    if (!d) return
    if (!d.moved) {
      openPicker(idx, ox, oy) // a tap → the swap picker (step 4)
      return
    }
    const cell = nearestCell(d.lastX, d.lastY)
    if (isValidDrop(cell, d.idx)) {
      // Snap onto the cell immediately, then persist (the async re-render confirms it).
      const [gx, gy] = PLOTS[cell]
      const s = buildingAt(gx, gy, d.idx)
      d.gEl.setAttribute('transform', `translate(${s.x.toFixed(1)}, ${s.y.toFixed(1)}) scale(${d.sc.toFixed(3)})`)
      onEditLayout?.({ ...overrides, [d.idx]: { ...overrides[d.idx], cell } })
    } else {
      // Invalid drop → gently spring back to where it was (no override written).
      springTransform(d.gEl, d.lastX, d.lastY, d.originX, d.originY, d.sc)
    }
  }

  const count = buildingCount
  // Resolve each building's CELL from the auto-layout + the player's saved moves,
  // then build the occupied-cell set from where buildings ACTUALLY land (so a cell a
  // building was moved off of frees up for biome scenery automatically).
  const layout = resolveLayout(count, overrides)
  const occupied = new Set(
    layout.map(({ cell }) => {
      const [gx, gy] = PLOTS[cell]
      return `${gx},${gy}`
    })
  )
  // Buildings + biome decorations, merged and depth-sorted back-to-front by screen-y so
  // nearer things (lower on screen) paint over farther ones. Position + organic look come
  // from the resolved CELL (buildingAt seeds off gx,gy), so an untouched building is
  // pixel-identical; a saved TYPE swap re-skins it in place (the Hall never swaps).
  const items: Placed[] = [
    ...layout.map(({ idx, cell }) => {
      const [gx, gy] = PLOTS[cell]
      const placed = buildingAt(gx, gy, idx)
      if (placed.kind === 'bldg' && idx !== 0) {
        placed.bk = overrides[idx]?.kind ?? placed.bk
      }
      return placed
    }),
    ...decorationsFor(biome, occupied)
  ].sort((m, n) => m.sort - n.sort)

  return (
    <motion.div
      className="town-overlay"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: reduce ? 0 : 0.32, ease: 'easeOut' }}
    >
      <div className="town-topbar">
        <button className="town-back" onClick={onExit}>
          <ArrowLeft size={15} weight="bold" /> Back to map
        </button>
        <span className="town-name">{townName}</span>
        <span className="town-stage">{stageName}</span>
        {canEdit && editing && hasEdits && (
          <button className="town-reset-btn" onClick={() => setConfirming(true)}>
            <ArrowCounterClockwise size={14} weight="bold" /> Reset
          </button>
        )}
        {canEdit && (
          <button className={`town-edit-btn${editing ? ' on' : ''}`} onClick={toggleEdit}>
            {editing ? (
              <>
                <Check size={14} weight="bold" /> Done
              </>
            ) : (
              <>
                <PencilSimple size={14} weight="bold" /> Edit
              </>
            )}
          </button>
        )}
      </div>
      {editing && (
        <div className="town-edit-hint">Tap a building to change it · drag to move it</div>
      )}
      <svg
        ref={svgRef}
        className="town-canvas"
        viewBox="0 0 760 460"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${townName}, a ${stageName} — ${count} buildings`}
      >
        <defs>
          <clipPath id="town-ground-clip">
            <polygon points={DIAMOND_PTS} />
          </clipPath>
          {/* soft edge for the contact shadows + the inner land rim */}
          <filter id="town-shadow-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          {/* warm sunlight pooled toward the town centre */}
          <radialGradient id="town-warm-wash" cx="50%" cy="40%" r="62%">
            <stop offset="0%" stopColor="#fff4da" stopOpacity={0.34} />
            <stop offset="55%" stopColor="#ffe7bb" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#ffe7bb" stopOpacity={0} />
          </radialGradient>
          {/* gentle vignette to frame the scene + add depth */}
          <radialGradient id="town-vignette" cx="50%" cy="46%" r="70%">
            <stop offset="0%" stopColor="#2a2012" stopOpacity={0} />
            <stop offset="70%" stopColor="#2a2012" stopOpacity={0} />
            <stop offset="100%" stopColor="#2a2012" stopOpacity={0.18} />
          </radialGradient>
        </defs>
        <Ground biome={biome} />
        {/* warm light on the land, under the buildings */}
        <rect x={0} y={0} width={760} height={460} fill="url(#town-warm-wash)" clipPath="url(#town-ground-clip)" />
        {/* Edit mode: faint grid + the (initially empty) drop-target highlight, under buildings */}
        {editing && (
          <g className="town-grid">
            {GRID_CELLS.map((pts, i) => (
              <polygon key={i} points={pts} />
            ))}
          </g>
        )}
        {editing && <polygon ref={hiRef} className="town-drop-hi" points="" />}
        {items.map((it) =>
          it.kind === 'bldg' ? (
            <g key={it.key} transform={`translate(${it.x.toFixed(1)}, ${it.y.toFixed(1)}) scale(${it.sc.toFixed(3)})`}>
              <ellipse
                className="town-shadow"
                cx={0}
                cy={SHADOW_FP[it.bk].cy}
                rx={SHADOW_FP[it.bk].rx}
                ry={SHADOW_FP[it.bk].ry}
                fill="rgba(54,42,18,0.20)"
                filter="url(#town-shadow-soft)"
              />
              <g
                className="town-bldg"
                style={{ animationDelay: `${(it.idx * 0.04).toFixed(2)}s`, filter: it.filter }}
                dangerouslySetInnerHTML={{ __html: BUILDING_SVG[it.bk] }}
              />
              {editing && it.idx !== 0 && (
                <rect
                  className="town-edit-hit"
                  data-idx={it.idx}
                  x={-40}
                  y={-74}
                  width={80}
                  height={88}
                  fill="transparent"
                  onPointerDown={(e) => onBldgPointerDown(e, it.idx, it.x, it.y, it.sc)}
                  onPointerMove={onBldgPointerMove}
                  onPointerUp={(e) => onBldgPointerUp(e, it.idx, it.x, it.y)}
                />
              )}
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
        {/* frame + depth over everything */}
        <rect x={0} y={0} width={760} height={460} fill="url(#town-vignette)" pointerEvents="none" />
        {editing && picker && (
          <>
            {/* click-away catcher closes the popover; the popover itself sits on top */}
            <rect
              className="town-pop-catcher"
              x={0}
              y={0}
              width={760}
              height={460}
              fill="transparent"
              onClick={() => setPicker(null)}
            />
            <TownEditPopover
              x={picker.x}
              y={picker.y}
              current={overrides[picker.idx]?.kind ?? kindFor(picker.idx)}
              onPick={(k) => swap(picker.idx, k)}
            />
          </>
        )}
      </svg>
      {confirming && (
        <div className="town-confirm-backdrop" onClick={() => setConfirming(false)}>
          <div className="town-confirm" onClick={(e) => e.stopPropagation()}>
            <p className="town-confirm-title">Return this town to its natural layout?</p>
            <p className="town-confirm-sub">Your arrangement will be cleared — nothing else changes.</p>
            <div className="town-confirm-actions">
              <button className="town-confirm-keep" onClick={() => setConfirming(false)}>
                Keep my arrangement
              </button>
              <button className="town-confirm-reset" onClick={resetLayout}>
                Reset to natural layout
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
