// Playwright driver — Clay Fantasy main-window re-skin proof. Seeds a realistic
// day, launches, and screenshots the main window across tabs (Dashboard, Quests,
// World, Stats). Stashes/restores the real db.json.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'fs'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const yesterday = new Date(d.getTime() - 86_400_000)
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

const seed = {
  version: 1,
  quests: [
    {
      id: 'q-main', title: 'Forge the new design system', difficulty: 'Medium', priority: 'High',
      skippability: 'Must do', timeEstimateMinutes: 45, dueAt: null, timeFrameId: activeFrame.id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 0,
      subTasks: [{ id: 's1', title: 'Define the tokens', order: 0, done: false }]
    },
    {
      id: 'q-b', title: 'Reply to design feedback', subTasks: [], difficulty: 'Easy', priority: 'Medium',
      skippability: 'Nice to have', timeEstimateMinutes: 10, dueAt: null, timeFrameId: activeFrame.id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 1
    },
    {
      id: 'q-done', title: 'Morning stretch', difficulty: 'Easy', priority: 'Low',
      skippability: 'Nice to have', timeEstimateMinutes: 5, dueAt: null, timeFrameId: activeFrame.id,
      status: 'completed', createdAt: yesterday.toISOString(), completedAt: yesterday.toISOString(),
      sortOrder: 2, completionDates: [ymd(yesterday)], completionAward: { xp: 1, currency: 1 },
      subTasks: [{ id: 's1', title: 'Stretch', order: 0, done: true }]
    }
  ],
  timeFrames: frames,
  player: { xp: 55, level: 8, currency: 120, streakCount: 4, lastCompletionDate: ymd(yesterday) },
  garden: {
    theme: 'garden',
    items: [
      { id: 'g-daisy', theme: 'garden', species: 'daisy', x: 0, y: 0, stage: 2, plantedAt: yesterday.toISOString(), mutations: ['golden'], harvests: 0 },
      { id: 'g-tulip', theme: 'garden', species: 'tulip', x: 1, y: 0, stage: 1, plantedAt: yesterday.toISOString() }
    ],
    visitors: ['butterfly'], bestStreak: 6
  },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5
  },
  lastSeenDate: ymd(d)
}

// Private, throwaway data folder for this test run = a SEPARATE app instance with
// its own save file and its own single-instance lock. It never collides with the
// installed app or other terminals, and never touches the real %APPDATA%\questday.
const userData = path.join(root, '.pw-userdata')
rmSync(userData, { recursive: true, force: true })
mkdirSync(userData, { recursive: true })
const dbPath = path.join(userData, 'db.json')
writeFileSync(dbPath, JSON.stringify(seed, null, 2))

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

try {
  const app = await electron.launch({ args: [root, `--user-data-dir=${userData}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  await main.setViewportSize({ width: 940, height: 900 })
  await main.waitForTimeout(400)

  // Dashboard
  result('NAV_ICONS', (await main.locator('.tabs .tab svg').count()) >= 8,
    `${await main.locator('.tabs .tab svg').count()} tab icons (no emoji)`)
  result('DASH_HERO', ((await main.locator('.current-quest-card').textContent()) ?? '').includes('Forge the new design system'))
  await main.screenshot({ path: path.join(shots, 'main-1-dashboard.png') })

  // Quests
  await main.getByRole('button', { name: 'Quests' }).click()
  await main.waitForTimeout(400)
  await main.screenshot({ path: path.join(shots, 'main-2-quests.png') })

  // World
  await main.getByRole('button', { name: 'World' }).click()
  await main.waitForTimeout(500)
  await main.screenshot({ path: path.join(shots, 'main-3-world.png') })

  // Stats
  await main.getByRole('button', { name: 'Stats' }).click()
  await main.waitForTimeout(400)
  await main.screenshot({ path: path.join(shots, 'main-4-stats.png') })

  // Arcade
  await main.getByRole('button', { name: 'Arcade' }).click()
  await main.waitForTimeout(400)
  result('ARCADE_NO_EMOJI_HEADER', (await main.locator('.view-head h2 svg').count()) >= 1, 'header uses an icon')
  await main.screenshot({ path: path.join(shots, 'main-5-arcade.png') })

  // Data
  await main.getByRole('button', { name: 'Data' }).click()
  await main.waitForTimeout(400)
  await main.screenshot({ path: path.join(shots, 'main-6-data.png') })

  await app.close()
} finally {
  rmSync(userData, { recursive: true, force: true })
}
console.log('closed')
