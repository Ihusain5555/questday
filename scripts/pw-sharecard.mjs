// Playwright driver — offline share-card export. Drives the REAL app (built out/)
// in an isolated --user-data-dir and verifies the Weekly Review "Share my week"
// button renders a PNG entirely in the renderer (canvas, zero deps, no IPC).
//   ISOLATION    — userData IS the temp dir.
//   SHARE_BUTTON — "Share my week" shows on the Weekly Review card (week has wins).
//   PNG_RENDERED — clicking opens the preview and the <img> src is a real PNG
//                  data URL of substantial size (the card was rasterized).
//   (screenshots the in-app modal to pw-shots/share-card-inapp.png for review)
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const dayKey = (offset) => {
  const x = new Date()
  x.setDate(x.getDate() - offset)
  return ymd(x)
}
const today = dayKey(0)
const yest = dayKey(1)
const two = dayKey(2)

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

const recur = (id, frameId, dates) => ({
  id, title: `Daily ${id}`, subTasks: [],
  difficulty: 'Easy', importance: 'Medium', urgency: 'Low', timeEstimateMinutes: 10,
  dueAt: null, timeFrameId: frameId, status: 'active',
  createdAt: new Date().toISOString(), completedAt: null, sortOrder: 0,
  recurDays: [0, 1, 2, 3, 4, 5, 6], completionDates: dates
})

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true }, realmChronicle: []
}

const seed = () => ({
  version: 1,
  quests: [
    recur('a', 'tf-morning', [two, yest, today]),
    recur('b', 'tf-morning', [yest, today]),
    recur('c', 'tf-evening', [yest])
  ],
  timeFrames: frames,
  player: { xp: 120, level: 7, currency: 0, streakCount: 12, lastCompletionDate: today, arcadeTickets: 5 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 14 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: today
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-sharecard')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(), null, 2))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForSelector('.weekly-review', { timeout: 5000 })
  await main.waitForTimeout(300)

  // --- SHARE_BUTTON ---
  const shareBtn = main.getByRole('button', { name: 'Share my week' })
  const shareShown = await shareBtn.count()
  result('SHARE_BUTTON', shareShown === 1, `count=${shareShown}`)

  // --- PNG_RENDERED ---
  await shareBtn.click()
  await main.waitForSelector('.share-modal', { timeout: 4000 })
  await main.waitForSelector('[data-share-img]', { timeout: 8000 })
  await main.waitForTimeout(400)
  const src = (await main.locator('[data-share-img]').getAttribute('src')) ?? ''
  const isPng = src.startsWith('data:image/png')
  const big = src.length > 10000 // a 1200x1200 PNG is well over this
  result('PNG_RENDERED', isPng && big, `isPng=${isPng} len=${src.length}`)

  await main.locator('.share-modal').screenshot({ path: path.join(shots, 'share-card-inapp.png') })

  // close the week modal
  await main.locator('.share-close').click()
  await main.waitForTimeout(200)

  // --- ARCADE_SHARE --- play a quick Flash Recall round (it has an End round button),
  // then share the score card.
  await main.getByRole('button', { name: 'Arcade', exact: true }).click()
  await main.waitForTimeout(400)
  await main.locator('.arcade-card', { hasText: 'Flash Recall' }).getByRole('button', { name: 'Play' }).click()
  await main.waitForTimeout(600)
  await main.getByRole('button', { name: 'End round' }).click()
  await main.waitForSelector('.arcade-result', { timeout: 5000 })
  await main.getByRole('button', { name: 'Share score' }).click()
  await main.waitForSelector('.share-modal', { timeout: 4000 })
  await main.waitForSelector('[data-share-img]', { timeout: 8000 })
  await main.waitForTimeout(400)
  const asrc = (await main.locator('[data-share-img]').getAttribute('src')) ?? ''
  const aPng = asrc.startsWith('data:image/png') && asrc.length > 10000
  result('ARCADE_SHARE', aPng, `isPng=${asrc.startsWith('data:image/png')} len=${asrc.length}`)
  await main.locator('.share-modal').screenshot({ path: path.join(shots, 'share-card-arcade.png') })
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
