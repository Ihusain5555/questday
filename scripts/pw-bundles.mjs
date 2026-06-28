// Playwright driver — Quest Bundles (v2). Drives the REAL app (built out/) in an isolated
// --user-data-dir and verifies the feature end-to-end:
//   ISOLATION     — userData IS the temp dir (real db.json untouched).
//   DB_ACCEPTS    — a seeded bundle survives migrate()+validate() on launch.
//   UI_SHOWS      — the Bundles panel renders the seeded bundle (name + count).
//   SAVE_BUNDLE   — naming + saving snapshots the active quests into a new bundle.
//   APPLY_BUNDLE  — "Add to today" recreates a bundle's quests as fresh active quests.
//   DELETE_BUNDLE — deleting a bundle removes it but leaves existing quests untouched.
//   REWARDS_EXACT — none of this touches reward state (player.xp intact).
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const now = new Date()

const frames = [{ id: 'tf-morning', name: 'Morning', startMinute: 0, endMinute: 1439, order: 0 }]
const baseQ = {
  subTasks: [],
  difficulty: 'Easy',
  importance: 'Medium',
  urgency: 'Medium',
  timeEstimateMinutes: 10,
  dueAt: null,
  timeFrameId: 'tf-morning',
  status: 'active',
  createdAt: now.toISOString(),
  completedAt: null
}
const seed = {
  version: 1,
  quests: [
    { ...baseQ, id: 'q-alpha', title: 'Alpha', sortOrder: 0 },
    { ...baseQ, id: 'q-beta', title: 'Beta', sortOrder: 1 }
  ],
  timeFrames: frames,
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings: { enabledFeatures: { focus: true, matrix: true, questBundles: true } },
  townLayouts: {},
  questTemplates: [],
  questBundles: [
    {
      id: 'b-seed',
      name: 'Seeded kit',
      createdAt: '2020-01-01T00:00:00.000Z',
      quests: [
        { title: 'Gamma', subTasks: [], difficulty: 'Easy', importance: 'Medium', urgency: 'Medium', timeEstimateMinutes: 10, timeFrameId: 'tf-morning' }
      ]
    }
  ],
  dailyNotes: {},
  lastSeenDate: ymd(now)
}

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

const dir = path.join(tmpdir(), 'questday-iso-bundles')
mkdirSync(dir, { recursive: true })
const dbPath = path.join(dir, 'db.json')
const readDb = () => JSON.parse(readFileSync(dbPath, 'utf-8'))
writeFileSync(dbPath, JSON.stringify(seed, null, 2))

const launch = async () => {
  const a = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await a.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  return a
}

let app
try {
  app = await launch()
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  // DB_ACCEPTS — the seeded bundle survived migrate()+validate().
  const b0 = readDb().questBundles
  result('DB_ACCEPTS', Array.isArray(b0) && b0.length === 1 && b0[0].quests.length === 1, `bundles=${b0?.length}`)

  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.bundles-panel', { timeout: 5000 })
  await main.waitForTimeout(300)

  // UI_SHOWS — the seeded bundle renders with name + count.
  const seededRow = main.locator('.bundle-row', { hasText: 'Seeded kit' })
  const rowText = (await seededRow.textContent()) ?? ''
  result('UI_SHOWS', (await main.locator('.bundle-row').count()) === 1 && /1 quest/.test(rowText), `row="${rowText.trim()}"`)
  await main.locator('.bundles-panel').screenshot({ path: path.join(shots, 'bundles.png') })

  // SAVE_BUNDLE — name + save snapshots the 2 active quests.
  await main.locator('.bundles-name').fill('Morning kit')
  await main.locator('.bundles-save button.primary').click()
  await main.waitForTimeout(600)
  const afterSave = readDb().questBundles
  const made = afterSave.find((b) => b.name === 'Morning kit')
  result('SAVE_BUNDLE', afterSave.length === 2 && made && made.quests.length === 2,
    `bundles=${afterSave.length} newCount=${made?.quests.length}`)

  // APPLY_BUNDLE — add the seeded "Gamma" quest to today.
  const qBefore = readDb().quests.length
  await seededRow.getByRole('button', { name: /Add to today/ }).click()
  await main.waitForTimeout(600)
  const qsAfter = readDb().quests
  const gamma = qsAfter.find((q) => q.title === 'Gamma')
  result('APPLY_BUNDLE', qsAfter.length === qBefore + 1 && gamma && gamma.status === 'active' && gamma.dueAt === null,
    `quests ${qBefore}->${qsAfter.length} gamma=${!!gamma}`)

  // DELETE_BUNDLE — remove "Morning kit"; existing quests untouched.
  const qCount = readDb().quests.length
  await main.locator('.bundle-row', { hasText: 'Morning kit' }).locator('.bundle-del').click()
  await main.waitForTimeout(600)
  const db2 = readDb()
  result('DELETE_BUNDLE', db2.questBundles.length === 1 && db2.questBundles[0].name === 'Seeded kit' && db2.quests.length === qCount,
    `bundles=${db2.questBundles.length} quests=${db2.quests.length}`)

  // REWARDS_EXACT — nothing touched reward state.
  result('REWARDS_EXACT', db2.player.xp === 0, `xp=${db2.player.xp}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
