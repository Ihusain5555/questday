// ---------------------------------------------------------------------------
// Offline share-card renderer. Draws a recap card onto an HTML canvas and returns
// a PNG data URL. ZERO new deps (Canvas 2D only) and ZERO IPC — the PNG is produced
// entirely in the renderer. Privacy rule (locked): counts/streak/level/best-day +
// realm art + brand ONLY — NEVER quest titles or notes.
//
// Two card kinds (discriminated union on `kind`):
//   • 'week'   — the weekly recap (mirrors mockups/share-card.html). Each stat is now
//                colour-coded + uniquely styled (quests=gold, streak=emerald,
//                level=sky, most-productive-day=plum) so they read as distinct.
//   • 'arcade' — a single arcade high-score card (game name + score + personal best),
//                tinted with the game's own accent colour (resolved to rgb by caller).
// ---------------------------------------------------------------------------

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

export type ShareCardData =
  | ({ kind: 'week' } & WeekShareData)
  | ({ kind: 'arcade' } & ArcadeShareData)

const W = 600
const H = 600
const SCALE = 2 // export at 2x for crisp sharing

const C = {
  ink: '#0d1411',
  ink2: '#14201a',
  brand: '#2fb380',
  brandDeep: '#1f8a60',
  brandBright: '#3fe0a8',
  gold: '#f5b938',
  goldBright: '#ffcf5c',
  goldDeep: '#c98a1e',
  sky: '#54c8f0',
  skyBright: '#8fdcf8',
  plum: '#b98fd9',
  plumBright: '#d3b1ee',
  text: '#eaf2ec',
  muted: '#93a89a',
  cottage: '#26402f',
  hall: '#2c4a38'
}

/** rgba() from either a hex (`#rrggbb`) or an `rgb(r, g, b)` string + an alpha. */
function withAlpha(color: string, a: number): string {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  const m = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})` : color
}

/** Render a share card and return a PNG data URL. Awaits the app fonts so the canvas
 *  text matches the live UI (falls back to system fonts if they're slow). */
export async function renderShareCardPng(data: ShareCardData): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.scale(SCALE, SCALE)

  try {
    await Promise.all([
      document.fonts.load("700 56px 'Clash Display'"),
      document.fonts.load("700 46px 'Clash Display'"),
      document.fonts.load("700 28px 'Clash Display'"),
      document.fonts.load("700 24px 'Clash Display'"),
      document.fonts.load("600 16px 'Satoshi'"),
      document.fonts.load("600 13px 'Satoshi'")
    ])
  } catch {
    /* keep going with whatever fonts are available */
  }

  if (data.kind === 'arcade') drawArcadeCard(ctx, data)
  else drawWeekCard(ctx, data)
  return canvas.toDataURL('image/png')
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Shared card chrome: background washes, realm vignette, gold inset frame. */
function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  const base = ctx.createLinearGradient(0, 0, W * 0.3, H)
  base.addColorStop(0, C.ink2)
  base.addColorStop(1, C.ink)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  const glowTop = ctx.createRadialGradient(W / 2, -90, 0, W / 2, -90, 420)
  glowTop.addColorStop(0, 'rgba(47,179,128,0.22)')
  glowTop.addColorStop(1, 'rgba(47,179,128,0)')
  ctx.fillStyle = glowTop
  ctx.fillRect(0, 0, W, H)

  const glowGold = ctx.createRadialGradient(W * 0.85, H * 1.05, 0, W * 0.85, H * 1.05, 360)
  glowGold.addColorStop(0, 'rgba(245,185,56,0.12)')
  glowGold.addColorStop(1, 'rgba(245,185,56,0)')
  ctx.fillStyle = glowGold
  ctx.fillRect(0, 0, W, H)

  drawRealm(ctx)

  ctx.strokeStyle = 'rgba(245,185,56,0.22)'
  ctx.lineWidth = 1
  roundRectPath(ctx, 14, 14, W - 28, H - 28, 18)
  ctx.stroke()
}

/** Crown + "QuestDay" wordmark, top-left. */
function drawBrand(ctx: CanvasRenderingContext2D): void {
  const bx = 40
  const by = 40
  drawCrown(ctx, bx, by, 24, 16, C.gold)
  ctx.textBaseline = 'alphabetic'
  ctx.font = "700 24px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.text
  ctx.fillText('Quest', bx + 34, by + 18)
  const questW = ctx.measureText('Quest').width
  ctx.fillStyle = C.brandBright
  ctx.fillText('Day', bx + 34 + questW, by + 18)
}

/** "Made with QuestDay" footer (with a small gold pip). */
function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.arc(44, 562, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = "600 13px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.muted
  ctx.fillText('Made with ', 54, 566)
  const madeW = ctx.measureText('Made with ').width
  ctx.fillStyle = C.text
  ctx.fillText('QuestDay', 54 + madeW, 566)
}

interface Chip {
  label: string
  val: string
  accent: string
  accentBright: string
}

/** A colour-coded stat chip: tinted border + bright accent bar + accent label, white value. */
function drawChip(ctx: CanvasRenderingContext2D, chip: Chip, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  ctx.strokeStyle = withAlpha(chip.accent, 0.32)
  ctx.lineWidth = 1
  roundRectPath(ctx, x, y, w, h, 16)
  ctx.fill()
  ctx.stroke()

  // bright accent bar down the left edge — the per-stat colour code
  ctx.fillStyle = chip.accentBright
  roundRectPath(ctx, x + 12, y + 14, 3, h - 28, 2)
  ctx.fill()

  ctx.letterSpacing = '0.6px'
  ctx.font = "600 11px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = chip.accentBright
  ctx.fillText(chip.label, x + 24, y + 24)
  ctx.letterSpacing = '0px'

  ctx.font = "700 22px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.text
  ctx.fillText(chip.val, x + 24, y + 50)
}

function drawWeekCard(ctx: CanvasRenderingContext2D, d: WeekShareData): void {
  ctx.save()
  roundRectPath(ctx, 0, 0, W, H, 28)
  ctx.clip()
  drawBackdrop(ctx)
  drawBrand(ctx)

  // ---- headline ----
  ctx.letterSpacing = '1.8px'
  ctx.font = "600 13px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.goldBright
  ctx.fillText('MY WEEK IN THE REALM', 40, 110)
  ctx.letterSpacing = '0px'

  ctx.font = "700 46px 'Clash Display', 'Segoe UI', sans-serif"
  const numStr = String(d.weekTotal)
  ctx.fillStyle = C.gold // quests = gold
  ctx.fillText(numStr, 40, 162)
  const numW = ctx.measureText(numStr).width
  ctx.fillStyle = C.text
  ctx.fillText(d.weekTotal === 1 ? ' quest' : ' quests', 40 + numW, 162)
  ctx.fillText('completed', 40, 210)

  // ---- colour-coded stat chips (each visually distinct) ----
  const shortDay = (name: string): string => name.slice(0, 3)
  const chips: Chip[] = [
    { label: 'STREAK', val: `${d.streak} ${d.streak === 1 ? 'day' : 'days'}`, accent: C.brand, accentBright: C.brandBright },
    { label: 'LEVEL', val: String(d.level), accent: C.sky, accentBright: C.skyBright },
    {
      // Was "BEST DAY" (best at WHAT?) — relabelled so it's self-explanatory.
      label: 'MOST PRODUCTIVE',
      val: d.bestDayName ? `${shortDay(d.bestDayName)} · ${d.bestDayCount}` : '—',
      accent: C.plum,
      accentBright: C.plumBright
    }
  ]
  const chipY = 244
  const chipH = 64
  const gap = 14
  const chipW = (W - 80 - gap * 2) / 3
  chips.forEach((chip, i) => drawChip(ctx, chip, 40 + i * (chipW + gap), chipY, chipW, chipH))

  drawFooter(ctx)
  ctx.restore()
}

function drawArcadeCard(ctx: CanvasRenderingContext2D, d: ArcadeShareData): void {
  ctx.save()
  roundRectPath(ctx, 0, 0, W, H, 28)
  ctx.clip()
  drawBackdrop(ctx)
  drawBrand(ctx)

  // medal, top-right
  drawMedal(ctx, W - 86, 104, 30, d.isBest)

  // ---- headline ----
  ctx.letterSpacing = '1.8px'
  ctx.font = "600 13px 'Satoshi', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.goldBright
  ctx.fillText('ARCADE HIGH SCORE', 40, 110)
  ctx.letterSpacing = '0px'

  // ---- hero score, in the game's accent colour ----
  ctx.font = "700 56px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillStyle = d.accent
  ctx.fillText(String(d.score), 40, 178)

  // ---- game name ----
  ctx.font = "700 28px 'Clash Display', 'Segoe UI', sans-serif"
  ctx.fillStyle = C.text
  ctx.fillText(d.gameName, 40, 218)

  // ---- two chips: personal best + result ----
  const chipY = 256
  const chipH = 64
  const gap = 14
  const chipW = (W - 80 - gap) / 2
  drawChip(
    ctx,
    { label: 'YOUR BEST', val: String(Math.max(d.best, d.score)), accent: C.gold, accentBright: C.goldBright },
    40,
    chipY,
    chipW,
    chipH
  )
  drawChip(
    ctx,
    d.isBest
      ? { label: 'RESULT', val: 'New best!', accent: C.gold, accentBright: C.goldBright }
      : { label: 'RESULT', val: 'Nice run', accent: C.brand, accentBright: C.brandBright },
    40 + chipW + gap,
    chipY,
    chipW,
    chipH
  )

  drawFooter(ctx)
  ctx.restore()
}

/** A small heraldic crown (5 points), filled. */
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

/** A filled N-pointed star centred at (cx, cy). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, points: number, outer: number, inner: number, fill: string
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

/** A gold medal with ribbon tails and a centre star (brighter when it's a new best). */
function drawMedal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, isBest: boolean): void {
  // ribbon tails
  ctx.fillStyle = isBest ? C.brandDeep : '#3a4a40'
  ctx.beginPath()
  ctx.moveTo(cx - 12, cy + r - 6)
  ctx.lineTo(cx - 4, cy + r + 22)
  ctx.lineTo(cx + 4, cy + r + 6)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 12, cy + r - 6)
  ctx.lineTo(cx + 4, cy + r + 22)
  ctx.lineTo(cx - 4, cy + r + 6)
  ctx.closePath()
  ctx.fill()

  // disc
  const g = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, r)
  g.addColorStop(0, C.goldBright)
  g.addColorStop(1, C.goldDeep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.goldDeep
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.strokeStyle = withAlpha(C.goldBright, 0.7)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2)
  ctx.stroke()

  drawStar(ctx, cx, cy, 5, r * 0.5, r * 0.22, C.ink2)
}

/** Inked emerald hills + a small gold-lit town + pines, pinned to the bottom. */
function drawRealm(ctx: CanvasRenderingContext2D): void {
  // back hill
  let g = ctx.createLinearGradient(0, H - 150, 0, H)
  g.addColorStop(0, 'rgba(31,138,96,0.5)')
  g.addColorStop(1, 'rgba(13,20,17,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, H - 80)
  ctx.quadraticCurveTo(W * 0.25, H - 125, W * 0.5, H - 95)
  ctx.quadraticCurveTo(W * 0.75, H - 65, W, H - 110)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  // front hill
  g = ctx.createLinearGradient(0, H - 95, 0, H)
  g.addColorStop(0, 'rgba(47,179,128,0.42)')
  g.addColorStop(1, 'rgba(13,20,17,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, H - 45)
  ctx.quadraticCurveTo(W * 0.27, H - 85, W * 0.55, H - 58)
  ctx.quadraticCurveTo(W * 0.8, H - 38, W, H - 62)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  // town cluster, centred
  ctx.save()
  ctx.translate(W / 2 - 68, H - 150)
  const ink = '#0d1411'
  // hall
  building(ctx, 8, 26, 44, 34, C.hall, C.brandDeep, ink, [[16, 38], [34, 38]])
  // tower
  ctx.fillStyle = '#26402f'
  rect(ctx, 58, 6, 26, 54, ink)
  roof(ctx, 55, 6, 71, -12, 87, 6, C.goldDeep, ink)
  window2(ctx, 66, 22, 10, 12, ink)
  // cottage
  building(ctx, 92, 34, 34, 26, C.cottage, C.brand, ink, [[103, 44]])
  ctx.restore()

  // a few pines
  pine(ctx, 150, H - 55, 10, 26)
  pine(ctx, 438, H - 59, 8, 22)
  pine(ctx, 470, H - 52, 9, 24)
}

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

function window2(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke: string): void {
  ctx.fillStyle = C.goldBright
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, w, h)
}

/** A house body (rect) + triangular roof + gold-lit windows. */
function building(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  body: string, roofColor: string, ink: string, windows: Array<[number, number]>
): void {
  ctx.fillStyle = body
  rect(ctx, x, y, w, h, ink)
  roof(ctx, x - 4, y, x + w / 2, y - 22, x + w + 4, y, roofColor, ink)
  for (const [wx, wy] of windows) window2(ctx, wx, wy, 9, 12, ink)
}

function pine(ctx: CanvasRenderingContext2D, x: number, baseY: number, halfW: number, h: number): void {
  ctx.fillStyle = '#1f8a60'
  ctx.beginPath()
  ctx.moveTo(x - halfW, baseY)
  ctx.lineTo(x, baseY - h)
  ctx.lineTo(x + halfW, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#0d1411'
  ctx.lineWidth = 1.5
  ctx.stroke()
}
