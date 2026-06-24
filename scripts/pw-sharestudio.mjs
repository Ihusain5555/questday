// Playwright driver — share-card STUDIO. Drives the REAL built app (out/) in an isolated
// --user-data-dir and screenshots the "Share my journey" card across all 3 THEMES, the 3
// FORMATS, and the 4 EFFECTS, so the canvas output can be eyeballed. Also checks each combo
// renders a real PNG. Screenshots -> pw-shots/studio-*.png.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const days = (n) => {
  const out = []
  for (let i = 0; i < n; i++) {
    const x = new Date()
    x.setDate(x.getDate() - i)
    out.push(ymd(x))
  }
  return out
}
const today = ymd(new Date())

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
  quests: [recur('a', 'tf-morning', days(40)), recur('b', 'tf-midday', days(30)), recur('c', 'tf-evening', days(20))],
  timeFrames: frames,
  player: { xp: 540, level: 12, currency: 0, streakCount: 12, lastCompletionDate: today, arcadeTickets: 5 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 28 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: today
})

const result = (name, pass, extra = '') => console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-sharestudio')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(), null, 2))

const themes = ['Journey', 'Night Watch', 'Festival']
const formats = ['Square', 'Portrait', 'Story']
const effects = ['None', 'Snowfall', 'Confetti', 'Sparkle']
const slug = (s) => s.toLowerCase().replace(/\s+/g, '')

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))

  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForTimeout(300)

  // open the journey studio
  await main.getByRole('button', { name: 'Share my journey' }).click()
  await main.waitForSelector('.share-modal', { timeout: 4000 })
  await main.waitForSelector('[data-share-img]', { timeout: 8000 })
  await main.waitForTimeout(500)
  result('STUDIO_OPENS', (await main.locator('.share-picker').count()) === 1)

  const frame = main.locator('.share-preview-frame')

  // 1) all 3 themes at square, no effect (clean look)
  await main.getByRole('button', { name: 'Square', exact: true }).click()
  await main.getByRole('button', { name: 'None', exact: true }).click()
  await main.waitForTimeout(300)
  for (const t of themes) {
    await main.getByRole('button', { name: t, exact: true }).click()
    await main.waitForTimeout(800)
    const src = (await main.locator('[data-share-img]').getAttribute('src')) ?? ''
    result(`THEME_${slug(t)}`, src.startsWith('data:image/png') && src.length > 10000, `len=${src.length}`)
    await frame.screenshot({ path: path.join(shots, `studio-theme-${slug(t)}.png`) })
  }

  // 2) every theme across every format (the responsive-layout check)
  await main.getByRole('button', { name: 'None', exact: true }).click()
  for (const t of themes) {
    await main.getByRole('button', { name: t, exact: true }).click()
    for (const f of formats) {
      await main.getByRole('button', { name: f, exact: true }).click()
      await main.waitForTimeout(700)
      await frame.screenshot({ path: path.join(shots, `studio-${slug(t)}-${slug(f)}.png`) })
    }
  }
  await main.getByRole('button', { name: 'Square', exact: true }).click()

  // 3) Festival (square) with each effect (frozen, in the exported PNG)
  await main.getByRole('button', { name: 'Square', exact: true }).click()
  await main.getByRole('button', { name: 'Festival', exact: true }).click()
  await main.waitForTimeout(400)
  for (const e of effects) {
    await main.getByRole('button', { name: e, exact: true }).click()
    await main.waitForTimeout(800)
    await frame.screenshot({ path: path.join(shots, `studio-effect-${slug(e)}.png`) })
  }

  // 4) the whole picker UI
  await main.locator('.share-modal').screenshot({ path: path.join(shots, 'studio-modal.png') })
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
