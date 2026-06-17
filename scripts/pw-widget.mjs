// Playwright driver — Cozy RPG widget redesign proof. Seeds a realistic day,
// launches the app, and screenshots the WIDGET window in three states:
// collapsed (current quest + step), "ready" (all steps done -> teal pulse),
// and expanded (full quest list). Stashes/restores the real db.json.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'fs'
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

const seed = {
  version: 1,
  quests: [
    {
      id: 'q-main', title: 'Ship the widget redesign', difficulty: 'Medium', importance: 'High',
      urgency: 'High', timeEstimateMinutes: 45, dueAt: null, timeFrameId: activeFrame.id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 0,
      subTasks: [
        { id: 's1', title: 'Polish the complete button', order: 0, done: false, timeEstimateMinutes: 15 },
        { id: 's2', title: 'Tune the colors', order: 1, done: false }
      ]
    },
    {
      id: 'q-b', title: 'Reply to design feedback', subTasks: [], difficulty: 'Easy', importance: 'Low',
      urgency: 'Medium', timeEstimateMinutes: 10, dueAt: null, timeFrameId: activeFrame.id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 1
    },
    {
      id: 'q-c', title: 'Take a walk', subTasks: [], difficulty: 'Easy', importance: 'Low',
      urgency: 'Low', timeEstimateMinutes: 20, dueAt: null, timeFrameId: frames[(activeFrame.order + 1) % 4].id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 0
    }
  ],
  timeFrames: frames,
  player: { xp: 55, level: 8, currency: 100, streakCount: 4, lastCompletionDate: null },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 6 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5
  },
  lastSeenDate: null
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

  const widget = app.windows().find((w) => w.url().includes('widget.html'))
  if (!widget) throw new Error('widget window not found')
  await widget.waitForSelector('.widget', { timeout: 5000 })

  // Make the widget a comfortable size for the shot.
  await widget.setViewportSize({ width: 320, height: 240 })
  await widget.waitForTimeout(300)

  // --- State 1: collapsed — current quest + immediate step + chunky button ---
  const titleTxt = (await widget.locator('.quest-title').textContent()) ?? ''
  result('WIDGET_CURRENT', titleTxt.includes('Ship the widget redesign'), `"${titleTxt.trim()}"`)
  result('WIDGET_STEP', ((await widget.locator('.subtask').first().textContent()) ?? '').length > 0)
  result('WIDGET_DEFER', (await widget.locator('.defer-btn').count()) === 1, 'defer button shown (2 steps)')
  await widget.locator('.widget').screenshot({ path: path.join(shots, 'widget-1-current.png') })

  // --- State 3: expanded — full list (capture before we tick steps off) ---
  await widget.evaluate(() => window.questday.widget.setExpanded(true))
  await widget.waitForTimeout(500)
  await widget.setViewportSize({ width: 320, height: 460 })
  await widget.waitForTimeout(300)
  result('WIDGET_LIST', (await widget.locator('.wlist-item').count()) >= 3,
    `${await widget.locator('.wlist-item').count()} rows`)
  await widget.locator('.widget').screenshot({ path: path.join(shots, 'widget-3-expanded.png') })

  // collapse again for the ready shot
  await widget.evaluate(() => window.questday.widget.setExpanded(false))
  await widget.waitForTimeout(400)
  await widget.setViewportSize({ width: 320, height: 240 })

  // --- State 2: ready — tick both steps -> teal pulsing complete button ---
  const checks = widget.locator('.subtask-check input')
  // ticking the first reveals the second; tick until none remain
  for (let i = 0; i < 4; i++) {
    const box = widget.locator('.subtask-check input').first()
    if ((await box.count()) === 0) break
    await box.click()
    await widget.waitForTimeout(350)
  }
  await widget.waitForTimeout(300)
  result('WIDGET_READY', (await widget.locator('.widget-complete.ready').count()) === 1,
    'complete button is in ready (teal) state')
  await widget.locator('.widget').screenshot({ path: path.join(shots, 'widget-2-ready.png') })

  await app.close()
} finally {
  rmSync(userData, { recursive: true, force: true })
}
console.log('closed')
