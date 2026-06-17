// Playwright driver — Salah & Qur'an checklist preset (opt-in faith feature).
// Drives the REAL app (built out/) in an isolated --user-data-dir (the real
// db.json is NEVER touched) and verifies the whole feature end-to-end.
//   ISOLATION       — userData IS the temp dir.
//   CARD_SHOWN      — feature ON → the .faith-card shows the "Add to my quests" state.
//   ADD_CREATES     — click Add → exactly 2 recurring quests (Salah + Qur'an) appear.
//   GENTLE_FIELDS   — Salah = 5 subtasks, Easy/Medium/Low, 10 min, recurs all 7 days;
//                     Qur'an recurs all 7 days (gains-only, never dominating).
//   CARD_FLIPS      — after adding, the card shows "Added." and the Add button is gone.
//   NO_DUP          — leave & return to the Quests tab → still exactly 2 quests (idempotent).
//   TOGGLE_OFF_KEEPS_DATA — Data-tab toggle OFF hides the card; the 2 quests REMAIN on
//                     disk and the flag is false (data never deleted — tone rule).
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

// MUST match the exported constants in src/renderer/state/store.ts.
const SALAH = 'Salah (daily prayers)'
const QURAN = 'Read Qur’an'

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
  focusPreset: 'pomodoro',
  // Library off (keep the screenshot clean), faith checklist ON for the test.
  enabledFeatures: { focus: true, matrix: true, world: true, questLibrary: false, faithChecklist: true },
  realmChronicle: []
}

const seed = () => ({
  version: 1,
  quests: [],
  timeFrames: frames,
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: ymd(d)
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-faith')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(), null, 2))
const readDb = () => JSON.parse(readFileSync(path.join(dir, 'db.json'), 'utf-8'))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  // Go to the Quests tab; the faith setup card must be present.
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.faith-card', { timeout: 5000 })
  await main.waitForTimeout(300)

  // --- CARD_SHOWN (add state) ---
  const addBtn = main.getByRole('button', { name: 'Add to my quests' })
  const addVisible = await addBtn.count()
  const cardText0 = (await main.locator('.faith-card').textContent()) ?? ''
  result('CARD_SHOWN', addVisible === 1 && !cardText0.includes('Added.'),
    `addBtn=${addVisible} hasAddedYet=${cardText0.includes('Added.')}`)
  await main.locator('.faith-card').screenshot({ path: path.join(shots, 'faith-card.png') })

  // --- ADD_CREATES ---
  await addBtn.click()
  await main.waitForTimeout(800)
  const after = readDb().quests
  const salah = after.find((q) => q.title === SALAH)
  const quran = after.find((q) => q.title === QURAN)
  result('ADD_CREATES', after.length === 2 && !!salah && !!quran,
    `quests=${after.length} salah=${!!salah} quran=${!!quran}`)

  // --- GENTLE_FIELDS ---
  const salahOk =
    !!salah &&
    salah.subTasks.length === 5 &&
    salah.subTasks.map((s) => s.title).join(',') === 'Fajr,Dhuhr,Asr,Maghrib,Isha' &&
    (salah.recurDays?.length ?? 0) === 7 &&
    salah.difficulty === 'Easy' &&
    salah.importance === 'Medium' &&
    salah.urgency === 'Low' &&
    salah.timeEstimateMinutes === 10
  const quranOk = !!quran && (quran.recurDays?.length ?? 0) === 7 && quran.subTasks.length === 0
  result('GENTLE_FIELDS', salahOk && quranOk,
    `salahOk=${salahOk} quranRecur=${quran?.recurDays?.length} quranSubs=${quran?.subTasks.length}`)

  // --- CARD_FLIPS (Added state, button gone) ---
  await main.waitForTimeout(300)
  const cardText1 = (await main.locator('.faith-card').textContent()) ?? ''
  const addGone = await main.getByRole('button', { name: 'Add to my quests' }).count()
  result('CARD_FLIPS', cardText1.includes('Added.') && addGone === 0,
    `added=${cardText1.includes('Added.')} addBtnGone=${addGone === 0}`)
  // Full-page shot (the .quests-main wrapper class only exists when the Library
  // rail is on, which this seed deliberately turns off).
  await main.screenshot({ path: path.join(shots, 'faith-added.png') })

  // --- NO_DUP (leave & return; still exactly 2) ---
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(300)
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  const stillTwo = readDb().quests.length
  const addStillGone = await main.getByRole('button', { name: 'Add to my quests' }).count()
  result('NO_DUP', stillTwo === 2 && addStillGone === 0, `quests=${stillTwo} addBtn=${addStillGone}`)

  // --- TOGGLE_OFF_KEEPS_DATA ---
  const questsBefore = readDb().quests.length
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(400)
  await main
    .locator('.feature-toggle', { hasText: 'Salah' })
    .locator('input[type="checkbox"]')
    .click()
  await main.waitForTimeout(700)
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  const cardHidden = await main.locator('.faith-card').count()
  const questsAfter = readDb().quests.length
  const flagOff = readDb().settings.enabledFeatures.faithChecklist === false
  result('TOGGLE_OFF_KEEPS_DATA', cardHidden === 0 && questsAfter === questsBefore && flagOff,
    `cardHidden=${cardHidden === 0} questsKept=${questsAfter === questsBefore} flagOff=${flagOff}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
