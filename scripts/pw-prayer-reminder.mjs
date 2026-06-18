// Playwright driver — gentle full-screen PRAYER REMINDER (v1.13). Drives the built app
// in an isolated --user-data-dir and verifies the reminder window opens (via the
// settings "Preview"/test IPC), shows the prayer, and dismisses cleanly.
//   ISOLATION           — userData IS the temp dir.
//   PRAYER_WINDOW_OPENS — prayer.html window appears after the test trigger.
//   PRAYER_CONTENT      — the overlay shows the prayer name.
//   PRAYER_DISMISS      — clicking Dismiss hides the window.
//   (screenshots the overlay to pw-shots/prayer-reminder.png)
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const today = ymd(new Date())

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: {}, realmChronicle: [],
  prayerReminderEnabled: true,
  prayerTimes: { cityId: 'new-york', lat: 40.71, lon: -74.0, method: 'isna', asr: 'standard' }
}
const seed = {
  version: 1,
  quests: [],
  timeFrames: [],
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  dailyNotes: {},
  lastSeenDate: today
}

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const dir = path.join(tmpdir(), 'questday-iso-prayerrem')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed, null, 2))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await sleep(1800)
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  const main = app.windows().find((w) => w.url().includes('index.html'))
  if (!main) throw new Error('main window not found')

  // Trigger the sample reminder (the settings "Preview" button path).
  await main.evaluate(() => window.questday.prayer.test())

  // The prayer window is created lazily on first show — wait for it.
  let prayer = null
  for (let i = 0; i < 30; i++) {
    prayer = app.windows().find((w) => w.url().includes('prayer.html'))
    if (prayer) break
    await sleep(200)
  }
  result('PRAYER_WINDOW_OPENS', !!prayer, prayer ? 'found' : 'not found')
  if (!prayer) throw new Error('prayer window never opened')

  await prayer.waitForSelector('.prayer-overlay', { timeout: 5000 })
  await sleep(300)
  const txt = (await prayer.locator('.prayer-overlay').textContent()) ?? ''
  result('PRAYER_CONTENT', txt.includes('Maghrib'), `"${txt.replace(/\s+/g, ' ').trim().slice(0, 64)}"`)
  await prayer.locator('.prayer-overlay').screenshot({ path: path.join(shots, 'prayer-reminder.png') })

  // Dismiss -> the window hides.
  const winHandle = await app.browserWindow(prayer)
  await prayer.locator('.prayer-dismiss').click()
  await sleep(500)
  const hidden = !(await winHandle.evaluate((w) => w.isVisible()))
  result('PRAYER_DISMISS', hidden, `hidden=${hidden}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
