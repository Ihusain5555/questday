// Playwright driver — Town Editing v1, BUILD STEP 3: render the townLayouts overrides.
// Differential test: render the SAME town twice (baseline = no edits, override = a hand-
// seeded arrangement) and compare, so assertions are robust against per-building jitter.
// No edit UI yet — overrides are seeded straight into an isolated db.json; the real save
// is NEVER touched (ISOLATION). Verifies, for the capital `embergreen` at xp 65 (=> 5 bldgs):
//   ISOLATION       — userData IS the temp dir.
//   COUNT_UNCHANGED — 5 buildings with overrides (hall-override doesn't dup; out-of-range ignored).
//   MOVE_APPLIED    — building 2 moved from cell 2 -> cell 9 (cell 2 freed, cell 9 filled).
//   HALL_FIXED      — an override on the Hall (idx 0) is IGNORED: still centered, art unchanged.
//   SWAP_APPLIED    — building 1 retyped tavern->cottage: same position, art changed, now matches
//                     the baseline cottage (cell 3) art.
//   UNTOUCHED_SAME  — buildings 3 & 4 are pixel-identical (position + art) to baseline (no reflow).
//   OUT_OF_RANGE    — an override on idx 8 (>= count 5) renders nothing, no crash.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true },
  // Chart ONLY the capital so it is the lone enterable town (.realm-enterable.first()).
  realmChronicle: [{ region: 'embergreen', topic: 'cosmos', entry: 'venus-day-longer-than-year' }]
}

const doneQuest = (i) => ({
  id: `done-${i}`, title: `Past ${i}`, subTasks: [], difficulty: 'Easy', priority: 'Medium',
  skippability: 'Should do', timeEstimateMinutes: 10, dueAt: null, timeFrameId: frames[0].id,
  status: 'completed', createdAt: d.toISOString(), completedAt: d.toISOString(), sortOrder: i,
  completionAward: { xp: 10, currency: 5 }
})

// xp drives building count: buildingsForXp(xp) = min(30, 2 + floor(xp/20)). 65 → 5; 600 → 30.
const seed = (townLayouts, xp = 65) => {
  const base = {
    version: 1,
    quests: Array.from({ length: 3 }, (_, i) => doneQuest(i)),
    timeFrames: frames,
    player: { xp, level: 1, currency: 0, streakCount: 0, lastCompletionDate: ymd(d), arcadeTickets: 0 },
    garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
    arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
    settings,
    lastSeenDate: ymd(d)
  }
  if (townLayouts) base.townLayouts = townLayouts
  return base
}

// The seeded arrangement for embergreen (indices: 0 hall, 1 tavern, 2 house, 3 cottage, 4 house):
//   MOVE building 2 -> cell 9 (empty) ; SWAP building 1 -> cottage ;
//   HALL override (idx 0) -> must be IGNORED ; OUT-OF-RANGE override (idx 8) -> must be IGNORED.
const LAYOUTS = {
  embergreen: {
    overrides: {
      0: { cell: 5, kind: 'house' }, // hall — ignored
      1: { kind: 'cottage' },        // swap tavern -> cottage
      2: { cell: 9 },                // move
      8: { cell: 3 }                 // out of range (count = 5)
    }
  }
}

// --- replicate TownView iso + PLOTS so we can map a rendered (x,y) back to its cell ---
const OX = 380, OY = 210, HW = 50, HH = 25
const isoOf = (gx, gy) => ({ x: OX + (gx - gy) * HW, y: OY + (gx + gy) * HH })
const PLOTS = (() => {
  const cells = []
  for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) cells.push([gx, gy])
  const cheb = ([x, y]) => Math.max(Math.abs(x), Math.abs(y))
  const euc = ([x, y]) => x * x + y * y
  const ang = ([x, y]) => Math.atan2(y, x)
  return cells.sort((a, b) => cheb(a) - cheb(b) || euc(a) - euc(b) || ang(a) - ang(b))
})()
const cellOf = (x, y) => {
  let best = -1, bd = 1e9
  for (let c = 0; c < PLOTS.length; c++) {
    const p = isoOf(PLOTS[c][0], PLOTS[c][1])
    const dist = Math.hypot(p.x - x, p.y - y)
    if (dist < bd) { bd = dist; best = c }
  }
  return bd <= 25 ? best : -1 // jitter max ~18 < 25 < half the ~56px cell spacing
}

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

async function launch(dirName, seedObj) {
  const dir = path.join(tmpdir(), dirName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seedObj, null, 2))
  const app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  return { app, main, dir, isolated: userData.toLowerCase() === dir.toLowerCase() }
}

// Enter the capital town and extract every rendered building's (x,y) + an art signature.
async function enterAndExtract(main, shot) {
  await main.getByRole('button', { name: 'Realm', exact: true }).click()
  await main.waitForTimeout(500)
  await main.locator('.realm-enterable').first().click()
  await main.waitForSelector('.town-overlay', { timeout: 4000 })
  await main.waitForTimeout(500)
  if (shot) await main.locator('.realm-map-wrap').screenshot({ path: path.join(shots, shot) })
  const bldgs = await main.evaluate(() =>
    [...document.querySelectorAll('.town-overlay .town-bldg')].map((inner) => {
      const t = inner.parentElement.getAttribute('transform') || ''
      const m = t.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)
      return {
        x: m ? parseFloat(m[1]) : NaN,
        y: m ? parseFloat(m[2]) : NaN,
        sig: inner.innerHTML.length + ':' + inner.innerHTML.slice(0, 64)
      }
    })
  )
  const decoCount = await main.locator('.town-overlay .town-deco').count()
  return { bldgs, decoCount }
}

// Map [{x,y,sig}] -> Map(cell -> {x,y,sig}).
const byCell = (bldgs) => {
  const m = new Map()
  for (const b of bldgs) {
    const c = cellOf(b.x, b.y)
    if (c >= 0) m.set(c, b)
  }
  return m
}
const samePos = (a, b) => a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

// Step 4 — drive the real Edit UI: enter Edit mode, tap a building, pick a type, and
// confirm the swap is WRITTEN to the isolated db.json (and the Hall has no tap target).
async function runEditSwap(dirName) {
  const { app, main, dir, isolated } = await launch(dirName, seed(null))
  try {
    await main.getByRole('button', { name: 'Realm', exact: true }).click()
    await main.waitForTimeout(500)
    await main.locator('.realm-enterable').first().click()
    await main.waitForSelector('.town-overlay', { timeout: 4000 })
    await main.waitForTimeout(500)
    await main.locator('.town-edit-btn').click() // enter Edit mode
    await main.waitForTimeout(300)
    const hitCount = await main.locator('.town-edit-hit').count() // hall excluded => count-1
    await main.locator('.town-edit-hit').first().click() // tap a building
    await main.waitForSelector('.town-pop', { timeout: 3000 })
    await main.locator('.realm-map-wrap').screenshot({ path: path.join(shots, 'townedit-popover.png') })
    const popBtns = await main.locator('.town-pop-btn').count()
    await main.locator('.town-pop-btn').filter({ hasText: 'Cottage' }).click() // pick Cottage
    await main.waitForTimeout(700) // let the save + re-render settle
    const onDisk = JSON.parse(readFileSync(path.join(dir, 'db.json'), 'utf-8'))
    const ov = onDisk.townLayouts?.embergreen?.overrides ?? {}
    const wroteCottage = Object.values(ov).some((o) => o && o.kind === 'cottage')
    const popGoneAfterPick = (await main.locator('.town-pop').count()) === 0
    return { isolated, hitCount, popBtns, wroteCottage, popGoneAfterPick, ov }
  } finally {
    await app.close()
  }
}

// Step 5 — drive a REAL pointer drag of the frontmost building to a given SVG target,
// and report which building moved + its resulting cell override (undefined = no write).
async function runDrag(dirName, tSvgX, tSvgY, shot, xp = 65) {
  const { app, main, dir } = await launch(dirName, seed(null, xp))
  try {
    await main.getByRole('button', { name: 'Realm', exact: true }).click()
    await main.waitForTimeout(500)
    await main.locator('.realm-enterable').first().click()
    await main.waitForSelector('.town-overlay', { timeout: 4000 })
    await main.waitForTimeout(500)
    await main.locator('.town-edit-btn').click()
    await main.waitForTimeout(300)
    const last = main.locator('.town-edit-hit').last() // frontmost building = reliably topmost
    const movedIdx = Number(await last.getAttribute('data-idx'))
    const box = await last.boundingBox()
    const start = { x: box.x + box.width / 2, y: box.y + box.height * 0.32 } // grab the upper body
    const tScreen = await main.evaluate((pt) => {
      const m = document.querySelector('.town-canvas').getScreenCTM()
      return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f }
    }, { x: tSvgX, y: tSvgY })
    await main.mouse.move(start.x, start.y)
    await main.mouse.down()
    await main.mouse.move((start.x + tScreen.x) / 2, (start.y + tScreen.y) / 2, { steps: 8 })
    await main.mouse.move(tScreen.x, tScreen.y, { steps: 8 })
    await main.mouse.up()
    await main.waitForTimeout(700)
    if (shot) await main.locator('.realm-map-wrap').screenshot({ path: path.join(shots, shot) })
    const onDisk = JSON.parse(readFileSync(path.join(dir, 'db.json'), 'utf-8'))
    const ov = onDisk.townLayouts?.embergreen?.overrides ?? {}
    const bldgs = await main.locator('.town-overlay .town-bldg').count()
    return { movedIdx, cell: ov[movedIdx]?.cell, bldgs, ov }
  } finally {
    await app.close()
  }
}

// Step 6 — Reset to auto-layout: seed an EDITED town, then Edit → Reset → confirm, and
// verify the town's entry is REMOVED from the save (back to the deterministic layout).
async function runReset(dirName, shot) {
  const seeded = seed({ embergreen: { overrides: { 1: { kind: 'cottage' }, 2: { cell: 12 } } } })
  const { app, main, dir } = await launch(dirName, seeded)
  try {
    await main.getByRole('button', { name: 'Realm', exact: true }).click()
    await main.waitForTimeout(500)
    await main.locator('.realm-enterable').first().click()
    await main.waitForSelector('.town-overlay', { timeout: 4000 })
    await main.waitForTimeout(500)
    await main.locator('.town-edit-btn').click()
    await main.waitForTimeout(300)
    const resetBtnVisible = (await main.locator('.town-reset-btn').count()) === 1
    await main.locator('.town-reset-btn').click()
    await main.waitForSelector('.town-confirm', { timeout: 3000 })
    const confirmShown = (await main.locator('.town-confirm').count()) === 1
    if (shot) await main.locator('.realm-map-wrap').screenshot({ path: path.join(shots, shot) })
    await main.locator('.town-confirm-reset').click()
    await main.waitForTimeout(600)
    const onDisk = JSON.parse(readFileSync(path.join(dir, 'db.json'), 'utf-8'))
    const townGone = !(onDisk.townLayouts && onDisk.townLayouts.embergreen)
    return { resetBtnVisible, confirmShown, townGone }
  } finally {
    await app.close()
  }
}

try {
  // ===== Baseline: same xp, NO overrides =====
  let { app, main, dir, isolated } = await launch('questday-iso-townedit-base', seed(null))
  result('ISOLATION', isolated, `dir=${dir}`)
  const base = await enterAndExtract(main, 'townedit-baseline.png')
  const baseC = byCell(base.bldgs)
  await app.close()

  // ===== Override: same xp, WITH the seeded arrangement =====
  ;({ app, main } = await launch('questday-iso-townedit-ov', seed(LAYOUTS)))
  const ov = await enterAndExtract(main, 'townedit-override.png')
  const ovC = byCell(ov.bldgs)
  await app.close()

  result('COUNT_UNCHANGED', base.bldgs.length === 5 && ov.bldgs.length === 5,
    `baseline=${base.bldgs.length} override=${ov.bldgs.length}`)

  result('MOVE_APPLIED', baseC.has(2) && !baseC.has(9) && ovC.has(9) && !ovC.has(2),
    `base{2:${baseC.has(2)},9:${baseC.has(9)}} ov{2:${ovC.has(2)},9:${ovC.has(9)}}`)

  const hallBase = baseC.get(0), hallOv = ovC.get(0)
  result('HALL_FIXED',
    !!hallOv && Math.abs(hallOv.x - OX) < 1 && Math.abs(hallOv.y - OY) < 1 &&
      !!hallBase && hallOv.sig === hallBase.sig,
    `centered=${hallOv && Math.abs(hallOv.x - OX) < 1 && Math.abs(hallOv.y - OY) < 1} artSame=${hallOv && hallBase && hallOv.sig === hallBase.sig}`)

  const swapBase1 = baseC.get(1), swapOv1 = ovC.get(1), baseCottage3 = baseC.get(3)
  result('SWAP_APPLIED',
    samePos(swapBase1, swapOv1) && swapOv1.sig !== swapBase1.sig &&
      !!baseCottage3 && swapOv1.sig === baseCottage3.sig,
    `posSame=${samePos(swapBase1, swapOv1)} artChanged=${swapOv1 && swapBase1 && swapOv1.sig !== swapBase1.sig} matchesCottage=${swapOv1 && baseCottage3 && swapOv1.sig === baseCottage3.sig}`)

  const untouched = [3, 4].every((c) => {
    const a = baseC.get(c), b = ovC.get(c)
    return a && b && samePos(a, b) && a.sig === b.sig
  })
  result('UNTOUCHED_SAME', untouched, `cells 3 & 4 identical position+art`)

  // OUT_OF_RANGE is proven by COUNT_UNCHANGED (idx 8 added no building); report deco info.
  result('OUT_OF_RANGE_IGNORED', base.bldgs.length === 5 && ov.bldgs.length === 5,
    `still 5 buildings; baseDeco=${base.decoCount} ovDeco=${ov.decoCount}`)

  // ===== Step 4: drive the Edit-mode swap UI =====
  const e = await runEditSwap('questday-iso-townedit-swap')
  result('POPOVER_OPENS', e.popBtns === 4, `popover buttons=${e.popBtns}`)
  result('HALL_NO_PICKER', e.hitCount === 4,
    `tap targets=${e.hitCount} (want 4 = 5 buildings minus the Hall)`)
  result('SWAP_WRITES_OVERRIDE', e.wroteCottage,
    `overrides=${JSON.stringify(e.ov)}`)
  result('POPOVER_CLOSES_ON_PICK', e.popGoneAfterPick, `popoverGone=${e.popGoneAfterPick}`)

  // ===== Step 5: drag-to-move =====
  // Valid: drag the frontmost building OUT to an empty outer cell (iso(2,2) = [2,2]).
  // Only cells 0-4 are occupied at this stage, so any valid landing has cell index >= 5.
  const dv = await runDrag('questday-iso-townedit-dragok', 380, 310, 'townedit-dragged.png')
  result('DRAG_MOVE_WRITES_CELL', dv.cell !== undefined && dv.cell >= 5 && dv.bldgs === 5,
    `idx=${dv.movedIdx} cell=${dv.cell} bldgs=${dv.bldgs}`)
  // Invalid: drag the frontmost building OFF the grid (top-left corner, far outside the
  // iso diamond) → nearestCell returns -1, so it must spring back and write NOTHING.
  const di = await runDrag('questday-iso-townedit-dragbad', 40, 40, null)
  result('INVALID_DROP_NO_WRITE', di.cell === undefined && di.bldgs === 5,
    `idx=${di.movedIdx} cell=${di.cell} bldgs=${di.bldgs}`)

  // ===== Step 6: Reset to auto-layout + Empire-stage (30-building) drag =====
  const r = await runReset('questday-iso-townedit-reset', 'townedit-confirm.png')
  result('RESET_REMOVES_OVERRIDES', r.resetBtnVisible && r.confirmShown && r.townGone,
    `resetBtn=${r.resetBtnVisible} confirm=${r.confirmShown} townGone=${r.townGone}`)
  // Empire (xp 600 → 30 buildings): the drag interaction must run at full scale without
  // breaking — all 30 still render afterwards. (Move correctness is proven at count 5.)
  const emp = await runDrag('questday-iso-townedit-empire', 380, 360, 'townedit-empire.png', 600)
  result('EMPIRE_DRAG_OK', emp.bldgs === 30, `bldgs=${emp.bldgs} movedIdx=${emp.movedIdx} cell=${emp.cell}`)
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  process.exitCode = 1
}
console.log('closed')
