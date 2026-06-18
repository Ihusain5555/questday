// Playwright driver — first-run onboarding + one-keystroke quick-add (v1.13, task #8).
// Launches the built app with an EMPTY user-data-dir (NO db.json written), so the app
// seeds createDefaultDatabase() — which now includes the starter "day".
//   ISOLATION       — userData IS the temp dir.
//   ONBOARD_SEEDED  — a brand-new install lands on the starter quests.
//   QUICK_ADD       — typing a title + Enter creates a quest instantly.
//   QUICK_ADD_MORE  — "More options" opens the full form (prefilled).
import { _electron as electron } from 'playwright-core'
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Fresh, EMPTY data dir — deliberately do NOT write db.json, so the app must seed defaults.
const dir = path.join(tmpdir(), 'questday-iso-onboard')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await sleep(1800)
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  const main = app.windows().find((w) => w.url().includes('index.html'))
  if (!main) throw new Error('main window not found')

  // Go to the Quests tab.
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(500)

  // --- ONBOARD_SEEDED ---
  const body1 = (await main.locator('body').textContent()) ?? ''
  result('ONBOARD_SEEDED', body1.includes('Welcome to QuestDay'), 'starter quest present')
  await main.screenshot({ path: path.join(shots, 'onboard-starter.png') })

  // --- QUICK_ADD ---
  const input = main.locator('.quick-add-input')
  await input.fill('My quick test quest')
  await input.press('Enter')
  await main.waitForTimeout(500)
  const body2 = (await main.locator('body').textContent()) ?? ''
  const cleared = (await input.inputValue()) === ''
  result('QUICK_ADD', body2.includes('My quick test quest') && cleared, `inputCleared=${cleared}`)

  // --- QUICK_ADD_MORE ---
  await input.fill('Detailed quest plan')
  await main.getByRole('button', { name: 'More options' }).click()
  await main.waitForTimeout(400)
  const modalShown = (await main.locator('.modal').count()) > 0
  const titleField = main.getByPlaceholder('What needs doing?')
  const prefilled = (await titleField.count()) > 0 ? await titleField.inputValue() : ''
  result('QUICK_ADD_MORE', modalShown && prefilled.includes('Detailed quest plan'),
    `modal=${modalShown} prefilled="${prefilled}"`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
