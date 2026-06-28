// Playwright driver — Appearance / theming (v1.14). Seeds a small board, launches the
// built app in an ISOLATED --user-data-dir (never touches the real db.json), then flips to
// the Daylight theme + an accent and screenshots each main tab so the light look can be
// eyeballed for unreadable text / broken surfaces.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const d = new Date()
const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]
const nowMin = d.getHours() * 60 + d.getMinutes()
const covers = (f) =>
  f.startMinute <= f.endMinute
    ? nowMin >= f.startMinute && nowMin < f.endMinute
    : nowMin >= f.startMinute || nowMin < f.endMinute
const activeFrame = frames.find(covers) ?? frames[0]
const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const mkQuest = (i, title, imp, urg, diff, mins, fid) => ({
  id: `q-${i}`, title, subTasks: [], difficulty: diff, importance: imp, urgency: urg,
  timeEstimateMinutes: mins, dueAt: null, timeFrameId: fid, status: 'active',
  createdAt: d.toISOString(), completedAt: null, sortOrder: i
})

const seed = {
  version: 1,
  quests: [
    mkQuest(0, 'Finish the aerospace lab report', 'High', 'High', 'Hard', 60, activeFrame.id),
    mkQuest(1, 'Prep the MSA weekly slides', 'Medium', 'Medium', 'Medium', 30, activeFrame.id),
    mkQuest(2, 'Order parts for the drone repair', 'Low', 'Low', 'Easy', 10, activeFrame.id),
    mkQuest(3, 'Read one chapter — aerodynamics', 'Medium', 'Low', 'Medium', 30, frames[1].id)
  ],
  timeFrames: frames,
  player: { xp: 148, level: 7, currency: 0, streakCount: 12, lastCompletionDate: null, arcadeTickets: 6 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 12 },
  arcade: { best: { colorrecall: 38, aim: 22 }, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5
  },
  lastSeenDate: ymd(d)
}

const isoDir = path.join(tmpdir(), 'questday-iso-theme')
mkdirSync(isoDir, { recursive: true })
writeFileSync(path.join(isoDir, 'db.json'), JSON.stringify(seed, null, 2))

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const tab = (name) => main.getByRole('button', { name, exact: true }).first().click()
  const shot = (name) => main.screenshot({ path: path.join(shots, name) })

  // Baseline dark
  await shot('theme-dusk-dashboard.png')

  // Flip to Daylight via the Appearance picker on the Data tab.
  await tab('Data')
  await main.waitForTimeout(300)
  const dayBtn = main.locator('.theme-seg-opt', { hasText: 'Daylight' })
  await dayBtn.click()
  await main.waitForTimeout(250)
  const theme = await main.evaluate(() => document.documentElement.dataset.theme)
  result('DAYLIGHT_APPLIED_TEST', theme === 'daylight', `data-theme="${theme}"`)
  await shot('theme-daylight-data.png')

  await tab('Dashboard')
  await main.waitForTimeout(300)
  await shot('theme-daylight-dashboard.png')

  await tab('Quests')
  await main.waitForTimeout(300)
  await shot('theme-daylight-quests.png')

  await tab('Forge')
  await main.waitForTimeout(300)
  await shot('theme-daylight-forge.png')

  await tab('Arcade')
  await main.waitForTimeout(300)
  await shot('theme-daylight-arcade.png')

  // Try an accent (Amethyst) on Daylight, back on the Dashboard.
  await tab('Data')
  await main.waitForTimeout(200)
  await main.locator('.accent-swatch', { hasText: 'Amethyst' }).click()
  await main.waitForTimeout(200)
  const accent = await main.evaluate(() => document.documentElement.dataset.accent)
  result('ACCENT_APPLIED_TEST', accent === 'amethyst', `data-accent="${accent}"`)
  await tab('Dashboard')
  await main.waitForTimeout(300)
  await shot('theme-daylight-amethyst-dashboard.png')

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  if (app) await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
