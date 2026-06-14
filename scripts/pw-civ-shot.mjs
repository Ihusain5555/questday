// Throwaway smoke + screenshot for the v1.10 step-1 civilization scaffold.
// Seeds an ISOLATED db (never touches the real one) with 12 completed quests so
// the new "Your Realm" panel shows real progress, then screenshots the Realm tab.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const isoDir = path.join(tmpdir(), 'questday-iso-civshot')
mkdirSync(isoDir, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`

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

// 12 completed quests => Settlement stage, 7/10 to Village; Greenhaven settled,
// Goldport "3 quests to settle", Frostpeak/Sun Reach "coming soon".
const done = Array.from({ length: 12 }, (_, i) => ({
  id: `done-${i}`, title: `Past quest ${i + 1}`, subTasks: [], difficulty: 'Easy',
  priority: 'Medium', skippability: 'Should do', timeEstimateMinutes: 10, dueAt: null,
  timeFrameId: frames[0].id, status: 'completed', createdAt: d.toISOString(),
  completedAt: d.toISOString(), sortOrder: i, completionAward: { xp: 10, currency: 0 }
}))
const current = {
  id: 'q-current', title: 'Build your realm', subTasks: [], difficulty: 'Medium',
  priority: 'High', skippability: 'Must do', timeEstimateMinutes: 20, dueAt: null,
  timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
  completedAt: null, sortOrder: 0
}

const seed = {
  version: 1,
  quests: [current, ...done],
  timeFrames: frames,
  player: { xp: 80, level: 4, currency: 0, streakCount: 3, lastCompletionDate: ymd(d), arcadeTickets: 2 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 3 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
    focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true }, realmChronicle: []
  },
  lastSeenDate: ymd(d)
}
writeFileSync(path.join(isoDir, 'db.json'), JSON.stringify(seed, null, 2))

const text = async (loc) => ((await loc.textContent()) ?? '').replace(/\s+/g, ' ').trim()

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  await main.getByRole('button', { name: 'Realm', exact: true }).click()
  await main.waitForTimeout(600)

  const body = await text(main.locator('.realm-view'))
  const ok = body.includes('Your Realm') && body.includes('Settlement') && body.includes('Greenhaven')
  console.log(`PANEL_RENDER_TEST: ${ok ? 'PASS' : 'FAIL'}`)
  console.log(`SAW_GOLDPORT: ${body.includes('Goldport') ? 'yes' : 'no'}`)
  console.log(`SAW_COMING_SOON: ${body.includes('coming soon') ? 'yes' : 'no'}`)

  await main.screenshot({ path: path.join(shots, 'civ-step1.png') })
  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  await app.close()
  process.exitCode = 1
}
