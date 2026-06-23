// ---------------------------------------------------------------------------
// Offline share-card STUDIO renderer. Draws a recap card onto an HTML canvas and
// returns a PNG data URL. ZERO new deps (Canvas 2D only) and ZERO IPC — the PNG is
// produced entirely in the renderer.
//
// Three axes the user can pick (a curated picker, NOT a freeform editor):
//   • THEME  — 'journey' (inked emerald/gold realm), 'nightwatch' (indigo night,
//              serif hero, constellation), 'festival' (flat bold, bunting, sunburst).
//   • FORMAT — 'square' 1080², 'portrait' 1080×1350, 'story' 1080×1920.
//   • EFFECT — 'none' | 'snow' | 'confetti' | 'sparkle' (drawn as a FROZEN still; the
//              live animation lives in the preview overlay, never in the PNG — a PNG
//              can't hold motion, and animated files don't paste into most chats).
//
// Content axis (what stats are shown) is separate from style: 'week' (last 7 days),
// 'arcade' (one game score), 'journey' (all-time). Every kind is normalised to a
// common { eyebrow, hero, chips, badge } shape so each theme lays it out once.
//
// Privacy rule (LOCKED): counts/streak/level + decorative art + brand ONLY —
// NEVER quest titles or notes. The data shapes below contain no title fields.
// ---------------------------------------------------------------------------

export type ShareTheme = 'journey' | 'nightwatch' | 'festival'
export type ShareFormat = 'square' | 'portrait' | 'story'
export type ShareEffect = 'none' | 'snow' | 'confetti' | 'sparkle'

export interface ShareStyle {
  theme: ShareTheme
  format: ShareFormat
  effect: ShareEffect
}

export const DEFAULT_STYLE: ShareStyle = { theme: 'journey', format: 'square', effect: 'none' }

export const SHARE_THEMES: { id: ShareTheme; name: string; blurb: string }[] = [
  { id: 'journey', name: 'Journey', blurb: 'Cozy inked realm — your little world.' },
  { id: 'nightwatch', name: 'Night Watch', blurb: 'Calm, premium night sky.' },
  { id: 'festival', name: 'Festival', blurb: 'Loud, celebratory banner.' }
]

export const SHARE_FORMATS: { id: ShareFormat; name: string; w: number; h: number }[] = [
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  { id: 'story', name: 'Story', w: 1080, h: 1920 }
]

export const SHARE_EFFECTS: { id: ShareEffect; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'snow', name: 'Snowfall' },
  { id: 'confetti', name: 'Confetti' },
  { id: 'sparkle', name: 'Sparkle' }
]

// ---- data (content) -------------------------------------------------------
export interface WeekShareData {
  weekTotal: number
  activeDays: number
  streak: number
  level: number
  /** Full weekday name of the most-productive day, or null when the week is empty. */
  bestDayName: string | null
  bestDayCount: number
}

export interface ArcadeShareData {
  gameName: string
  /** The game's accent colour as a concrete CSS colour (hex or rgb()) — caller resolves
   *  `var(--skill-*)` to rgb first, because canvas can't resolve CSS custom properties. */
  accent: string
  score: number
  best: number
  isBest: boolean
}

export interface JourneyShareData {
  completionsTotal: number
  level: number
  streak: number
  bestStreak: number
  daysActive: number
}

export type ShareCardData =
  | ({ kind: 'week' } & WeekShareData)
  | ({ kind: 'arcade' } & ArcadeShareData)
  | ({ kind: 'journey' } & JourneyShareData)

// ---- normalised content ---------------------------------------------------
type AccentKey = 'gold' | 'emerald' | 'sky' | 'plum'
interface ContentChip {
  label: string
  value: string
  accent: AccentKey
}
interface CardContent {
  eyebrow: string
  heroNum: string
  heroLabel: string
  heroSub?: string
  chips: ContentChip[]
  /** Draw a level shield (journey theme) / level pill (others) when set. */
  level?: number
  /** Arcade only — draw a medal; true when it's a personal best. */
  medalBest?: boolean
  /** Arcade game accent (concrete colour) — themes may use it as a hero tint. */
  tint?: string
}

const short3 = (s: string): string => s.slice(0, 3)

function toContent(d: ShareCardData): CardContent {
  if (d.kind === 'arcade') {
    return {
      eyebrow: 'Arcade high score',
      heroNum: String(d.score),
      heroLabel: d.gameName,
      chips: [
        { label: 'Your best', value: String(Math.max(d.best, d.score)), accent: 'gold' },
        { label: 'Result', value: d.isBest ? 'New best!' : 'Nice run', accent: d.isBest ? 'gold' : 'emerald' }
      ],
      medalBest: d.isBest,
      tint: d.accent
    }
  }
  if (d.kind === 'journey') {
    return {
      eyebrow: 'My journey so far',
      heroNum: String(d.completionsTotal),
      heroLabel: d.completionsTotal === 1 ? 'quest completed' : 'quests completed',
      heroSub: 'all-time · and counting',
      level: d.level,
      chips: [
        { label: 'Current streak', value: `${d.streak} ${d.streak === 1 ? 'day' : 'days'}`, accent: 'emerald' },
        { label: 'Best streak', value: `${d.bestStreak} ${d.bestStreak === 1 ? 'day' : 'days'}`, accent: 'gold' },
        { label: 'Days adventuring', value: String(d.daysActive), accent: 'plum' }
      ]
    }
  }
  // week
  return {
    eyebrow: 'My week in the realm',
    heroNum: String(d.weekTotal),
    heroLabel: d.weekTotal === 1 ? 'quest completed' : 'quests completed',
    chips: [
      { label: 'Streak', value: `${d.streak} ${d.streak === 1 ? 'day' : 'days'}`, accent: 'emerald' },
      { label: 'Level', value: String(d.level), accent: 'sky' },
      {
        label: 'Most productive',
        value: d.bestDayName ? `${short3(d.bestDayName)} · ${d.bestDayCount}` : '—',
        accent: 'plum'
      }
    ]
  }
}

// ---- palettes -------------------------------------------------------------
interface Palette {
  ink: string
  ink2: string
  text: string
  muted: string
  gold: string
  goldBright: string
  goldDeep: string
  emerald: string
  emeraldDeep: string
  emeraldBright: string
  sky: string
  skyBright: string
  plum: string
  plumBright: string
}

const JOURNEY_PAL: Palette = {
  ink: '#0d1411',
  ink2: '#14201a',
  text: '#eaf2ec',
  muted: '#93a89a',
  gold: '#f5b938',
  goldBright: '#ffcf5c',
  goldDeep: '#c98a1e',
  emerald: '#2fb380',
  emeraldDeep: '#1f8a60',
  emeraldBright: '#3fe0a8',
  sky: '#54c8f0',
  skyBright: '#8fdcf8',
  plum: '#b98fd9',
  plumBright: '#d3b1ee'
}

function accentColor(pal: Palette, a: AccentKey): { base: string; bright: string } {
  switch (a) {
    case 'gold':
      return { base: pal.gold, bright: pal.goldBright }
    case 'emerald':
      return { base: pal.emerald, bright: pal.emeraldBright }
    case 'sky':
      return { base: pal.sky, bright: pal.skyBright }
    case 'plum':
      return { base: pal.plum, bright: pal.plumBright }
  }
}

// ---- shared helpers -------------------------------------------------------
/** rgba() from a hex (`#rrggbb`) or `rgb(r,g,b)` string + an alpha. */
function withAlpha(color: string, a: number): string {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  const m = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})` : color
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Deterministic sunflower scatter inside an ellipse (no Math.random → stable across
 *  renders, mirrors mapEffects.tsx so frozen particles land in a pleasing arrangement). */
function scatter(n: number, rx: number, ry: number, seed = 0.5): { dx: number; dy: number }[] {
  const out: { dx: number; dy: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = i * 2.399963 + seed * 6.283
    const r = Math.sqrt((i + 0.5) / n)
    out.push({ dx: Math.cos(a) * r * rx, dy: Math.sin(a) * r * ry })
  }
  return out
}

/** A heraldic crown (5 points), filled. */
function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + h * 0.32)
  ctx.lineTo(x + w * 0.25, y + h * 0.62)
  ctx.lineTo(x + w * 0.5, y)
  ctx.lineTo(x + w * 0.75, y + h * 0.62)
  ctx.lineTo(x + w, y + h * 0.32)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()
}

/** N-pointed star centred at (cx,cy). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
  fill: string
): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const px = cx + r * Math.cos(a)
    const py = cy + r * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Crown + "QuestDay" wordmark. Returns nothing; positioned at (x, baseline y). */
function drawBrand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pal: Palette,
  dayColor: string,
  size = 40
): void {
  drawCrown(ctx, x, y - size * 0.66, size * 0.6, size * 0.4, pal.gold)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `700 ${size}px 'Clash Display', 'Segoe UI', sans-serif`
  ctx.fillStyle = pal.text
  const gap = size * 0.85
  ctx.fillText('Quest', x + gap, y)
  const qw = ctx.measureText('Quest').width
  ctx.fillStyle = dayColor
  ctx.fillText('Day', x + gap + qw, y)
}

/** "Made with QuestDay" footer, centred at cx on baseline y. */
function drawFooter(ctx: CanvasRenderingContext2D, cx: number, y: number, pal: Palette, dayColor: string): void {
  ctx.textAlign = 'center'
  ctx.font = "600 24px 'Satoshi', 'Segoe UI', sans-serif"
  const made = 'Made with '
  const brand = 'QuestDay'
  const mw = ctx.measureText(made).width
  const bw = ctx.measureText(brand).width
  const startX = cx - (mw + bw) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = pal.muted
  ctx.fillText(made, startX, y)
  ctx.fillStyle = dayColor
  ctx.fillText(brand, startX + mw, y)
  // gold pip
  ctx.fillStyle = pal.gold
  ctx.beginPath()
  ctx.arc(startX - 14, y - 7, 5, 0, Math.PI * 2)
  ctx.fill()
}

/** Heraldic level shield centred at (cx, cy). */
function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, pal: Palette, level: number): void {
  const h = w * 1.13
  const t = cy - h / 2
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, t)
  ctx.lineTo(cx + w / 2, t + h * 0.12)
  ctx.lineTo(cx + w / 2, t + h * 0.46)
  ctx.quadraticCurveTo(cx + w / 2, t + h * 0.86, cx, t + h)
  ctx.quadraticCurveTo(cx - w / 2, t + h * 0.86, cx - w / 2, t + h * 0.46)
  ctx.lineTo(cx - w / 2, t + h * 0.12)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, t, 0, t + h)
  g.addColorStop(0, '#26402f')
  g.addColorStop(1, '#16271d')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = pal.goldDeep
  ctx.lineWidth = 3.5
  ctx.stroke()
  // label + number
  ctx.textAlign = 'center'
  ctx.fillStyle = pal.goldBright
  ctx.font = "700 15px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.letterSpacing = '2px'
  ctx.fillText('LEVEL', cx, cy - h * 0.16)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = pal.text
  ctx.font = "700 46px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillText(String(level), cx, cy + h * 0.2)
  ctx.restore()
}

/** Gold medal with ribbon tails + a centre star (brighter on a new best). */
function drawMedal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, isBest: boolean, pal: Palette): void {
  ctx.fillStyle = isBest ? pal.emeraldDeep : '#3a4a40'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * 12, cy + r - 6)
    ctx.lineTo(cx + s * 4, cy + r + 22)
    ctx.lineTo(cx - s * 4, cy + r + 6)
    ctx.closePath()
    ctx.fill()
  }
  const g = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, r)
  g.addColorStop(0, pal.goldBright)
  g.addColorStop(1, pal.goldDeep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = pal.goldDeep
  ctx.lineWidth = 3
  ctx.stroke()
  drawStar(ctx, cx, cy, 5, r * 0.5, r * 0.22, pal.ink2)
}

// ---- JOURNEY theme --------------------------------------------------------
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke: string): void {
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)
}
function roof(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  fill: string, stroke: string
): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x3, y3)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()
}
function lit(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke: string, gold: string): void {
  ctx.fillStyle = gold
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, w, h)
}
function building(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  body: string, roofColor: string, ink: string, gold: string, windows: Array<[number, number]>
): void {
  ctx.fillStyle = body
  rect(ctx, x, y, w, h, ink)
  roof(ctx, x - 4, y, x + w / 2, y - 22, x + w + 4, y, roofColor, ink)
  for (const [wx, wy] of windows) lit(ctx, wx, wy, 9, 12, ink, gold)
}
function pine(ctx: CanvasRenderingContext2D, x: number, baseY: number, halfW: number, h: number, pal: Palette): void {
  ctx.fillStyle = pal.emeraldDeep
  ctx.beginPath()
  ctx.moveTo(x - halfW, baseY)
  ctx.lineTo(x, baseY - h)
  ctx.lineTo(x + halfW, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = pal.ink
  ctx.lineWidth = 1.5
  ctx.stroke()
}

/** Inked emerald hills + a small gold-lit town + pines, pinned to the bottom (scaled to W). */
function drawRealmScene(ctx: CanvasRenderingContext2D, W: number, H: number, pal: Palette): void {
  const k = W / 600 // realm art was authored in 600-wide space
  let g = ctx.createLinearGradient(0, H - 270 * k, 0, H)
  g.addColorStop(0, withAlpha(pal.emeraldDeep, 0.5))
  g.addColorStop(1, withAlpha(pal.ink, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, H - 144 * k)
  ctx.quadraticCurveTo(W * 0.25, H - 225 * k, W * 0.5, H - 171 * k)
  ctx.quadraticCurveTo(W * 0.75, H - 117 * k, W, H - 198 * k)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  g = ctx.createLinearGradient(0, H - 171 * k, 0, H)
  g.addColorStop(0, withAlpha(pal.emerald, 0.42))
  g.addColorStop(1, withAlpha(pal.ink, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, H - 81 * k)
  ctx.quadraticCurveTo(W * 0.27, H - 153 * k, W * 0.55, H - 104 * k)
  ctx.quadraticCurveTo(W * 0.8, H - 68 * k, W, H - 112 * k)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  // town cluster, centred
  ctx.save()
  ctx.translate(W / 2 - 122 * k, H - 270 * k)
  ctx.scale(k, k)
  const ink = pal.ink
  building(ctx, 8, 26, 44, 34, '#2c4a38', pal.emeraldDeep, ink, pal.goldBright, [[16, 38], [34, 38]])
  ctx.fillStyle = '#26402f'
  rect(ctx, 58, 6, 26, 54, ink)
  roof(ctx, 55, 6, 71, -12, 87, 6, pal.goldDeep, ink)
  lit(ctx, 66, 22, 10, 12, ink, pal.goldBright)
  building(ctx, 92, 34, 34, 26, '#26402f', pal.emerald, ink, pal.goldBright, [[103, 44]])
  ctx.restore()

  pine(ctx, W * 0.25, H - 99 * k, 10 * k, 26 * k, pal)
  pine(ctx, W * 0.73, H - 106 * k, 8 * k, 22 * k, pal)
  pine(ctx, W * 0.78, H - 94 * k, 9 * k, 24 * k, pal)
}

function drawJourney(ctx: CanvasRenderingContext2D, c: CardContent, W: number, H: number): void {
  const pal = JOURNEY_PAL
  // backdrop
  const base = ctx.createLinearGradient(0, 0, W * 0.3, H)
  base.addColorStop(0, pal.ink2)
  base.addColorStop(1, pal.ink)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  let glow = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, W * 0.75)
  glow.addColorStop(0, withAlpha(pal.emerald, 0.22))
  glow.addColorStop(1, withAlpha(pal.emerald, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  glow = ctx.createRadialGradient(W * 0.85, H * 1.05, 0, W * 0.85, H * 1.05, W * 0.65)
  glow.addColorStop(0, withAlpha(pal.gold, 0.12))
  glow.addColorStop(1, withAlpha(pal.gold, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  drawRealmScene(ctx, W, H, pal)

  // gold inset frame
  ctx.strokeStyle = withAlpha(pal.gold, 0.22)
  ctx.lineWidth = 1.5
  roundRectPath(ctx, 25, 25, W - 50, H - 50, 30)
  ctx.stroke()

  // tall formats (portrait/story): push the top block down into the vertical centre /
  // story safe-band so it isn't jammed against the very top edge (where phone UI sits).
  const oy = (H - 1080) * 0.4
  const M = 72
  drawBrand(ctx, M, 96 + oy, pal, pal.emeraldBright, 40)

  // badge top-right
  if (c.medalBest !== undefined) drawMedal(ctx, W - M - 30, 150 + oy, 52, c.medalBest, pal)
  else if (c.level !== undefined) drawShield(ctx, W - M - 36, 150 + oy, 92, pal, c.level)

  // headline
  ctx.textAlign = 'left'
  ctx.letterSpacing = '3px'
  ctx.font = "600 23px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = pal.goldBright
  ctx.fillText(c.eyebrow.toUpperCase(), M, 210 + oy)
  ctx.letterSpacing = '0px'

  ctx.font = "700 84px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillStyle = pal.gold
  ctx.fillText(c.heroNum, M, 300 + oy)
  const nw = ctx.measureText(c.heroNum).width
  ctx.fillStyle = pal.text
  ctx.font = "700 40px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillText(` ${c.heroLabel}`, M + nw, 300 + oy)
  if (c.heroSub) {
    ctx.fillStyle = pal.muted
    ctx.font = "600 25px 'Satoshi', 'Segoe UI', sans-serif"
    ctx.fillText(c.heroSub, M, 344 + oy)
  }

  // chip row
  const chipY = 392 + oy
  const chipH = 116
  const gap = 24
  const chipW = (W - 2 * M - gap * (c.chips.length - 1)) / c.chips.length
  c.chips.forEach((chip, i) => {
    const x = M + i * (chipW + gap)
    const ac = accentColor(pal, chip.accent)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.strokeStyle = withAlpha(ac.base, 0.32)
    ctx.lineWidth = 1.5
    roundRectPath(ctx, x, chipY, chipW, chipH, 24)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = ac.bright
    roundRectPath(ctx, x + 20, chipY + 24, 5, chipH - 48, 3)
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.letterSpacing = '1px'
    ctx.font = "700 18px 'Satoshi', 'Segoe UI', sans-serif"
    ctx.fillStyle = ac.bright
    ctx.fillText(chip.label.toUpperCase(), x + 40, chipY + 44)
    ctx.letterSpacing = '0px'
    ctx.font = "700 38px 'Clash Display', 'Segoe UI', sans-serif"
    ctx.fillStyle = pal.text
    ctx.fillText(chip.value, x + 40, chipY + 90)
  })

  drawFooter(ctx, W / 2, H - 54, pal, pal.emeraldBright)
}

// ---- NIGHT WATCH theme ----------------------------------------------------
const NIGHT_PAL: Palette = {
  ink: '#0c0f1c',
  ink2: '#1b2342',
  text: '#eaf0fb',
  muted: '#7e89a6',
  gold: '#e6d6a4',
  goldBright: '#f6ecc6',
  goldDeep: '#b9a877',
  emerald: '#3fe0a8',
  emeraldDeep: '#2a9c78',
  emeraldBright: '#6cf0c2',
  sky: '#c9d4e6',
  skyBright: '#eef3fb',
  plum: '#b7a7e0',
  plumBright: '#d6ccf2'
}

function drawNightWatch(ctx: CanvasRenderingContext2D, c: CardContent, W: number, H: number): void {
  const pal = NIGHT_PAL
  const cx = W / 2
  const base = ctx.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, pal.ink2)
  base.addColorStop(1, pal.ink)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  let glow = ctx.createRadialGradient(cx, 0, 0, cx, 0, W * 0.7)
  glow.addColorStop(0, 'rgba(120,140,210,0.20)')
  glow.addColorStop(1, 'rgba(120,140,210,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // star field (deterministic)
  ctx.fillStyle = '#dfe7f6'
  scatter(46, W * 0.46, H * 0.46, 0.17).forEach((p, i) => {
    ctx.globalAlpha = 0.3 + ((i * 37) % 50) / 110
    ctx.beginPath()
    ctx.arc(cx + p.dx, H * 0.46 + p.dy, 1.2 + (i % 3) * 0.5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // inset frame
  ctx.strokeStyle = withAlpha(pal.sky, 0.2)
  ctx.lineWidth = 1.5
  roundRectPath(ctx, 25, 25, W - 50, H - 50, 30)
  ctx.stroke()

  // brand centred at top (nudged down on tall formats for the story safe-band)
  const oy = (H - 1080) * 0.3
  ctx.font = "700 40px 'Clash Display', 'Segoe UI', sans-serif"
  const qw = ctx.measureText('Quest').width
  const dw = ctx.measureText('Day').width
  const bx = cx - (qw + dw) / 2
  drawCrown(ctx, bx - 34, 70 + oy, 24, 16, pal.gold)
  ctx.textAlign = 'left'
  ctx.fillStyle = pal.text
  ctx.fillText('Quest', bx, 96 + oy)
  ctx.fillStyle = pal.emeraldBright
  ctx.fillText('Day', bx + qw, 96 + oy)

  // crescent moon top-right
  const mx = W - 92
  const my = 96 + oy
  ctx.fillStyle = '#f1e6bd'
  ctx.beginPath()
  ctx.arc(mx, my, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.ink2
  ctx.beginPath()
  ctx.arc(mx + 9, my - 4, 23, 0, Math.PI * 2)
  ctx.fill()

  // centred hero (serif)
  const heroY = H * 0.4
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.font = "600 22px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = pal.goldBright
  ctx.fillText(c.eyebrow.toUpperCase(), cx, heroY - 96)
  ctx.letterSpacing = '0px'

  ctx.font = "700 188px Georgia, 'Times New Roman', serif"
  ctx.fillStyle = pal.skyBright
  ctx.shadowColor = 'rgba(180,200,240,0.35)'
  ctx.shadowBlur = 38
  ctx.fillText(c.heroNum, cx, heroY + 36)
  ctx.shadowBlur = 0
  ctx.font = "400 30px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = pal.sky
  ctx.fillText(c.heroLabel, cx, heroY + 86)
  if (c.heroSub) {
    ctx.letterSpacing = '3px'
    ctx.font = "600 21px 'Satoshi', 'Segoe UI', sans-serif"
    ctx.fillStyle = pal.muted
    ctx.fillText(c.heroSub.toUpperCase(), cx, heroY + 124)
    ctx.letterSpacing = '0px'
  }

  // supporting stats as a small constellation (3 points), with level appended if present
  const pts: { label: string; value: string }[] = c.chips.map((ch) => ({ label: ch.label, value: ch.value }))
  if (c.level !== undefined) pts.unshift({ label: 'Level', value: String(c.level) })
  const baseY = H - 200
  const slots = [
    { x: cx, y: baseY - 70 },
    { x: cx - W * 0.27, y: baseY },
    { x: cx + W * 0.27, y: baseY },
    { x: cx, y: baseY + 64 }
  ]
  const used = slots.slice(0, Math.min(pts.length, 4))
  // connecting lines from hero down to the points
  ctx.strokeStyle = withAlpha(pal.sky, 0.22)
  ctx.lineWidth = 1
  used.forEach((s) => {
    ctx.beginPath()
    ctx.moveTo(cx, heroY + 150)
    ctx.lineTo(s.x, s.y - 22)
    ctx.stroke()
  })
  pts.slice(0, 4).forEach((p, i) => {
    const s = used[i]
    ctx.fillStyle = pal.goldBright
    ctx.beginPath()
    ctx.arc(s.x, s.y - 30, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.font = "700 38px Georgia, serif"
    ctx.fillStyle = pal.text
    ctx.fillText(p.value, s.x, s.y + 8)
    ctx.letterSpacing = '1.5px'
    ctx.font = "600 16px 'Satoshi', 'Segoe UI', sans-serif"
    ctx.fillStyle = pal.muted
    ctx.fillText(p.label.toUpperCase(), s.x, s.y + 34)
    ctx.letterSpacing = '0px'
  })

  if (c.medalBest !== undefined) drawMedal(ctx, cx, heroY - 150, 40, c.medalBest, pal)

  drawFooter(ctx, cx, H - 54, pal, pal.skyBright)
}

// ---- FESTIVAL theme -------------------------------------------------------
const FEST = {
  emerald: '#1f8a60',
  emeraldDeep: '#156547',
  crimson: '#c5403a',
  gold: '#f3b73a',
  goldBright: '#ffd564',
  goldDeep: '#c98f1e',
  cream: '#fbf3df',
  ink: '#2a1c14'
}

function drawFestival(ctx: CanvasRenderingContext2D, c: CardContent, W: number, H: number): void {
  // flat emerald field
  ctx.fillStyle = FEST.emerald
  ctx.fillRect(0, 0, W, H)
  // gold frame
  ctx.strokeStyle = FEST.gold
  ctx.lineWidth = 5
  roundRectPath(ctx, 29, 29, W - 58, H - 58, 22)
  ctx.stroke()

  // bunting across the top
  const buntY = 56
  const flags = 12
  const fw = (W - 80) / flags
  const buntColors = [FEST.crimson, FEST.gold, FEST.cream]
  for (let i = 0; i < flags; i++) {
    const x = 40 + i * fw
    ctx.fillStyle = buntColors[i % 3]
    ctx.beginPath()
    ctx.moveTo(x, buntY)
    ctx.lineTo(x + fw, buntY)
    ctx.lineTo(x + fw / 2, buntY + 52)
    ctx.closePath()
    ctx.fill()
  }
  // string
  ctx.strokeStyle = withAlpha(FEST.ink, 0.4)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(40, buntY)
  ctx.lineTo(W - 40, buntY)
  ctx.stroke()

  const cx = W / 2
  const oy = (H - 1080) * 0.4
  // brand
  ctx.textAlign = 'center'
  ctx.font = "700 40px 'Clash Display', 'Segoe UI', sans-serif"
  const qw = ctx.measureText('Quest').width
  const dw = ctx.measureText('Day').width
  const bx = cx - (qw + dw) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = FEST.cream
  ctx.fillText('Quest', bx, 192 + oy)
  ctx.fillStyle = FEST.goldBright
  ctx.fillText('Day', bx + qw, 192 + oy)

  // eyebrow
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  ctx.font = "800 22px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = FEST.goldBright
  ctx.fillText(`★ ${c.eyebrow.toUpperCase()} ★`, cx, 236 + oy)
  ctx.letterSpacing = '0px'

  // sunburst behind the hero — CENTRED (H*0.5) + smaller so its top never reaches the
  // brand/eyebrow above it (the earlier H*0.4/290 overlapped and washed them out).
  const sy = H * 0.5
  const rays = 24
  const rOuter = 250
  ctx.save()
  ctx.translate(cx, sy)
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2
    const a1 = ((i + 0.5) / rays) * Math.PI * 2
    ctx.fillStyle = i % 2 === 0 ? FEST.goldBright : FEST.gold
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter)
    ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter)
    ctx.closePath()
    ctx.fill()
  }
  // fade the sunburst edge with a radial mask, then a dark disc for hero contrast
  const fade = ctx.createRadialGradient(0, 0, rOuter * 0.42, 0, 0, rOuter)
  fade.addColorStop(0, withAlpha(FEST.emerald, 0))
  fade.addColorStop(1, FEST.emerald)
  ctx.fillStyle = fade
  ctx.beginPath()
  ctx.arc(0, 0, rOuter, 0, Math.PI * 2)
  ctx.fill()
  const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, 150)
  disc.addColorStop(0, FEST.emeraldDeep)
  disc.addColorStop(0.62, FEST.emeraldDeep)
  disc.addColorStop(1, withAlpha(FEST.emeraldDeep, 0))
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // star on top of the sunburst
  drawStar(ctx, cx, sy - rOuter + 16, 5, 26, 11, FEST.goldBright)

  // hero number (heavy)
  ctx.textAlign = 'center'
  ctx.font = "900 168px 'Arial Black', 'Segoe UI', Impact, sans-serif"
  ctx.fillStyle = FEST.cream
  ctx.shadowColor = 'rgba(0,0,0,0.22)'
  ctx.shadowOffsetX = 4
  ctx.shadowOffsetY = 6
  ctx.fillText(c.heroNum, cx, sy + 56)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowColor = 'transparent'
  ctx.font = "800 26px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.letterSpacing = '2px'
  ctx.fillStyle = FEST.goldBright
  ctx.fillText(c.heroLabel.toUpperCase(), cx, sy + rOuter - 92)
  ctx.letterSpacing = '0px'

  // bold banner chips (+ level pill prepended if present)
  const pills: { label: string; value: string }[] = c.chips.map((ch) => ({ label: ch.label, value: ch.value }))
  if (c.level !== undefined) pills.push({ label: 'Level', value: String(c.level) })
  const show = pills.slice(0, 3)
  const M = 64
  const gap = 20
  const pw = (W - 2 * M - gap * (show.length - 1)) / show.length
  const py = H - 230
  const ph = 116
  const pillBg = [FEST.crimson, FEST.gold, FEST.cream]
  const pillFg = [FEST.cream, FEST.ink, FEST.ink]
  show.forEach((p, i) => {
    const x = M + i * (pw + gap)
    ctx.fillStyle = pillBg[i % 3]
    roundRectPath(ctx, x, py, pw, ph, 14)
    ctx.fill()
    ctx.strokeStyle = withAlpha(FEST.ink, 0.18)
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = withAlpha(pillFg[i % 3], 0.82)
    ctx.font = "800 17px 'Satoshi', 'Segoe UI', sans-serif"
    ctx.letterSpacing = '1px'
    ctx.fillText(p.label.toUpperCase(), x + pw / 2, py + 42)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = pillFg[i % 3]
    ctx.font = "900 40px 'Arial Black', 'Segoe UI', Impact, sans-serif"
    ctx.fillText(p.value, x + pw / 2, py + 88)
  })

  // footer
  ctx.textAlign = 'center'
  ctx.font = "700 24px 'Satoshi', 'Segoe UI', sans-serif"
  const made = 'Made with '
  const brand = 'QuestDay'
  const mw = ctx.measureText(made).width
  const bw = ctx.measureText(brand).width
  const sx = cx - (mw + bw) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = withAlpha(FEST.cream, 0.85)
  ctx.fillText(made, sx, H - 54)
  ctx.fillStyle = FEST.goldBright
  ctx.fillText(brand, sx + mw, H - 54)
}

// ---- frozen EFFECTS (overlay) ---------------------------------------------
function drawEffect(ctx: CanvasRenderingContext2D, effect: ShareEffect, W: number, H: number): void {
  if (effect === 'none') return
  ctx.save()
  if (effect === 'snow') {
    // settled drift along the bottom + scattered mid-air flakes
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    scatter(70, W * 0.52, H * 0.5, 0.22).forEach((p, i) => {
      const x = W / 2 + p.dx
      const y = H / 2 + p.dy
      ctx.globalAlpha = 0.5 + ((i * 53) % 50) / 110
      ctx.beginPath()
      ctx.arc(x, y, 2.4 + (i % 4) * 1.1, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    // frost drift along the very bottom
    const g = ctx.createLinearGradient(0, H - 70, 0, H)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,0.16)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, H)
    ctx.lineTo(0, H - 36)
    ctx.quadraticCurveTo(W * 0.3, H - 56, W * 0.55, H - 38)
    ctx.quadraticCurveTo(W * 0.8, H - 24, W, H - 44)
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
  } else if (effect === 'confetti') {
    const cols = ['#f5b938', '#3fe0a8', '#c5403a', '#54c8f0', '#ffcf5c', '#d3b1ee']
    scatter(64, W * 0.5, H * 0.46, 0.61).forEach((p, i) => {
      const x = W / 2 + p.dx
      const y = H / 2 + p.dy - H * 0.06
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((i * 2.39963) % (Math.PI * 2))
      ctx.fillStyle = cols[i % cols.length]
      ctx.globalAlpha = 0.85
      ctx.fillRect(-7, -4, 14, 8)
      ctx.restore()
    })
    ctx.globalAlpha = 1
  } else if (effect === 'sparkle') {
    scatter(34, W * 0.48, H * 0.46, 0.4).forEach((p, i) => {
      const x = W / 2 + p.dx
      const y = H / 2 + p.dy
      const r = 5 + (i % 4) * 4
      ctx.fillStyle = i % 3 === 0 ? '#f7e08a' : '#ffffff'
      ctx.globalAlpha = 0.55 + ((i * 41) % 40) / 100
      // 4-point sparkle
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.quadraticCurveTo(x, y, x, y + r)
      ctx.quadraticCurveTo(x, y, x - r, y)
      ctx.quadraticCurveTo(x, y, x, y - r)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
/** Render a share card and return a PNG data URL. Awaits the app fonts so the canvas
 *  text matches the live UI (falls back to system fonts if they're slow). */
export async function renderShareCardPng(data: ShareCardData, style: ShareStyle = DEFAULT_STYLE): Promise<string> {
  const fmt = SHARE_FORMATS.find((f) => f.id === style.format) ?? SHARE_FORMATS[0]
  const W = fmt.w
  const H = fmt.h
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  try {
    await Promise.all([
      document.fonts.load("700 84px 'Clash Display'"),
      document.fonts.load("700 46px 'Clash Display'"),
      document.fonts.load("700 40px 'Clash Display'"),
      document.fonts.load("600 24px 'Satoshi'"),
      document.fonts.load("700 18px 'Satoshi'")
    ])
  } catch {
    /* keep going with whatever fonts are available */
  }

  const content = toContent(data)

  ctx.save()
  roundRectPath(ctx, 0, 0, W, H, 36)
  ctx.clip()
  if (style.theme === 'nightwatch') drawNightWatch(ctx, content, W, H)
  else if (style.theme === 'festival') drawFestival(ctx, content, W, H)
  else drawJourney(ctx, content, W, H)
  drawEffect(ctx, style.effect, W, H)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

/** Decode a `data:<mime>;base64,<data>` URL to a Blob WITHOUT fetch(). The renderer's
 *  CSP sets no `connect-src`, so it falls back to `default-src 'self'` — which does NOT
 *  include the `data:` scheme — and `fetch(dataUrl)` is blocked. Decoding in-memory keeps
 *  the CSP tight and the clipboard copy working. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const head = dataUrl.slice(0, comma)
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const bin = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
