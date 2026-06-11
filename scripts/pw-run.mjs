// Playwright driver — ⏱️ Focus timer (Pomodoro family). Exercises: the Focus
// tab, the 4 presets, current-quest binding, a fixed countdown ticking down, the
// Flowtime "Take a break" instant session-end, the sessions-today tally, preset
// persistence, and the feature toggle. (Coins were removed in v1.8.2 — no payout.)
// Isolated --user-data-dir (own db.json + lock) — safe to run anytime.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
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
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`

// Seed: one active quest in the current frame (so the Focus view binds to it).
const seed = {
  version: 1,
  quests: [
    {
      id: 'q-focus', title: 'Write the report', subTasks: [], difficulty: 'Medium',
      priority: 'High', skippability: 'Must do', timeEstimateMinutes: 30, dueAt: null,
      timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
      completedAt: null, sortOrder: 0
    }
  ],
  timeFrames: frames,
  player: { xp: 0, level: 3, currency: 100, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
    focusPreset: 'pomodoro'
  },
  lastSeenDate: ymd(d)
}

// Isolated --user-data-dir — never touches the real save file.
const isoDir = path.join(tmpdir(), 'questday-iso-focus')
mkdirSync(isoDir, { recursive: true })
const dbPath = path.join(isoDir, 'db.json')
writeFileSync(dbPath, JSON.stringify(seed, null, 2))

const readDb = () => JSON.parse(readFileSync(dbPath, 'utf-8'))
const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))

  // --- Open the Focus tool (Forge tab → Focus sub-tab, v1.8.1 nav) ---
  await main.getByRole('button', { name: 'Forge', exact: true }).click()
  await main.waitForTimeout(300)
  await main.locator('.subtab', { hasText: 'Focus' }).click()
  await main.waitForTimeout(400)

  // --- 4 presets render (the whole Pomodoro family) ---
  const presets = main.locator('.focus-preset')
  result('FOCUS_PRESETS_TEST', (await presets.count()) === 4, `${await presets.count()} presets (want 4)`)
  result('FOCUS_PRESET_NAMES_TEST',
    (await main.locator('.focus-preset', { hasText: 'Pomodoro' }).count()) === 1 &&
      (await main.locator('.focus-preset', { hasText: 'Flowtime' }).count()) === 1 &&
      (await main.locator('.focus-preset', { hasText: 'Deep work 90' }).count()) === 1,
    'Pomodoro + Flowtime + Deep work 90 present')

  // --- The view binds to the current quest ---
  result('FOCUS_QUEST_TEST',
    ((await main.locator('.fq-title').textContent()) ?? '').includes('Write the report'),
    `bound quest: "${((await main.locator('.fq-title').textContent()) ?? '').trim()}"`)
  await main.screenshot({ path: path.join(shots, 'focus-idle.png') })

  // --- Pomodoro countdown starts at 25:00 and ticks DOWN ---
  await main.getByRole('button', { name: 'Start focus' }).click()
  await main.waitForTimeout(150)
  const t0 = (await main.locator('.focus-time').textContent())?.trim()
  result('FOCUS_START_TEST', t0 === '25:00' || t0 === '24:59',
    `time just after start: "${t0}" (want 25:00)`)
  await main.waitForTimeout(1500)
  const t1 = (await main.locator('.focus-time').textContent())?.trim()
  result('FOCUS_TICK_TEST', t1 !== '25:00' && /^24:5\d$/.test(t1 ?? ''),
    `time after ~1.5s: "${t1}" (want 24:5x — counted down)`)
  result('FOCUS_PHASE_TEST',
    ((await main.locator('.focus-phase').textContent()) ?? '').toLowerCase().includes('focus'),
    'phase shows Focus')
  await main.screenshot({ path: path.join(shots, 'focus-running.png') })

  // Reset back to idle so we can switch presets.
  await main.getByRole('button', { name: 'Reset' }).click()
  await main.waitForTimeout(300)

  // --- Flowtime: counts UP, "Take a break" ends the session instantly ---
  await main.locator('.focus-preset', { hasText: 'Flowtime' }).click()
  await main.waitForTimeout(200)
  result('PRESET_PERSIST_TEST', readDb().settings.focusPreset === 'flowtime',
    `persisted preset: ${readDb().settings.focusPreset} (want flowtime)`)
  await main.getByRole('button', { name: 'Start focus' }).click()
  await main.waitForTimeout(1400)
  const up = (await main.locator('.focus-time').textContent())?.trim()
  result('FLOWTIME_COUNTUP_TEST', /^00:0[1-9]$/.test(up ?? ''),
    `flowtime elapsed after ~1.4s: "${up}" (want 00:0x — counted up)`)

  // End the session -> reward path fires.
  await main.getByRole('button', { name: 'Take a break' }).click()
  await main.waitForTimeout(600)

  // --- Completing a session counts toward today's tally (no coins since v1.8.2) ---
  result('FOCUS_TALLY_TEST',
    ((await main.locator('.focus-tally').textContent()) ?? '').includes('1 session'),
    `tally: "${((await main.locator('.focus-tally').textContent()) ?? '').trim()}"`)

  // --- Now on a break; ending it returns to idle (Ready) ---
  result('FOCUS_BREAK_PHASE_TEST',
    ((await main.locator('.focus-phase').textContent()) ?? '').toLowerCase().includes('break'),
    'phase shows Break after the session')
  await main.screenshot({ path: path.join(shots, 'focus-break.png') })
  await main.getByRole('button', { name: 'End break' }).click()
  await main.waitForTimeout(300)
  result('FOCUS_IDLE_TEST',
    ((await main.locator('.focus-phase').textContent()) ?? '').toLowerCase().includes('ready') &&
      (await main.getByRole('button', { name: 'Start focus' }).count()) === 1,
    'back to Ready/idle with Start focus available')

  // --- Feature toggle (Data → Productivity features) hides/shows the Focus sub-tab ---
  await main.getByRole('button', { name: 'Data' }).click()
  await main.waitForTimeout(400)
  const focusSwitch = main.locator('.feature-toggle', { hasText: 'Focus timer' }).locator('input')
  result('FEATURE_TOGGLE_PRESENT_TEST', (await focusSwitch.count()) === 1,
    'Focus toggle present in Productivity section')

  // Turn it off -> the Focus sub-tab disappears from Forge + persists as false.
  await focusSwitch.uncheck()
  await main.waitForTimeout(500)
  result('FEATURE_PERSIST_OFF_TEST', readDb().settings.enabledFeatures.focus === false,
    `persisted enabledFeatures.focus = ${readDb().settings.enabledFeatures.focus} (want false)`)
  await main.getByRole('button', { name: 'Forge', exact: true }).click()
  await main.waitForTimeout(300)
  result('FOCUS_SUBTAB_HIDDEN_TEST',
    (await main.locator('.subtab', { hasText: 'Focus' }).count()) === 0,
    'Focus sub-tab hidden after toggle off')
  await main.screenshot({ path: path.join(shots, 'features-off.png') })

  // Turn it back on -> the sub-tab returns.
  await main.getByRole('button', { name: 'Data' }).click()
  await main.waitForTimeout(300)
  await focusSwitch.check()
  await main.waitForTimeout(500)
  await main.getByRole('button', { name: 'Forge', exact: true }).click()
  await main.waitForTimeout(300)
  result('FOCUS_SUBTAB_RESTORED_TEST',
    (await main.locator('.subtab', { hasText: 'Focus' }).count()) === 1,
    'Focus sub-tab returns after toggle on')

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  if (app) await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
