// Playwright driver — Quest Library v1. Drives the REAL app (built out/) in an
// isolated --user-data-dir (the real db.json is NEVER touched) and verifies the
// whole feature end-to-end: create template, save-as-template, tap-add, drag-add,
// edit, delete, collapse, and toggle-off (rail hidden but data persists).
//   ISOLATION         — userData IS the temp dir.
//   RAIL + CARDS      — rail renders with the 2 seeded templates.
//   SCHEDULING_HIDDEN — the template form hides Due/Time frame/Repeats; title "New template".
//   CREATE_TEMPLATE   — "+ New template" → fill → Create → questTemplates 2→3, 3 cards.
//   SAVE_AS_TEMPLATE  — quest-row "Save as template" → questTemplates 3→4 incl. the quest title.
//   TAP_ADD_TITLE     — "+ Add to today" opens the quest form titled "New quest" (isEdit fix).
//   TAP_ADD_CREATES   — Create quest from the prefill → quests 1→2 in the chosen frame.
//   DRAG_ADD          — drop a template on the Midday frame → a quest appears there, dueAt null.
//   EDIT_TEMPLATE     — edit a card's title → persisted.
//   DELETE_TEMPLATE   — delete a card → questTemplates count drops by 1.
//   COLLAPSE          — collapse toggles the .collapsed class both ways.
//   TOGGLE_PERSISTS   — Data-tab toggle OFF hides the rail; questTemplates remain on disk.
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
const MIME = 'application/x-questday-template'

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
  // questLibrary intentionally OMITTED — missing key = ON (also tests the default-on convention).
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true },
  realmChronicle: []
}

const sub = (id, i) => ({ id, title: `Step ${i + 1}`, order: i, done: false })
const tpl = (id, title, n, difficulty, importance, urgency, mins, ageMs) => ({
  id,
  title,
  subTasks: Array.from({ length: n }, (_, i) => sub(`${id}-s${i}`, i)),
  difficulty,
  importance,
  urgency,
  timeEstimateMinutes: mins,
  createdAt: new Date(Date.now() - ageMs).toISOString()
})

const seedQuest = {
  id: 'q-emails', title: 'Reply to client emails', subTasks: [],
  difficulty: 'Hard', importance: 'High', urgency: 'High', timeEstimateMinutes: 30,
  dueAt: null, timeFrameId: 'tf-morning', status: 'active',
  createdAt: d.toISOString(), completedAt: null, sortOrder: 0
}

const seed = () => ({
  version: 1,
  quests: [seedQuest],
  timeFrames: frames,
  player: { xp: 40, level: 1, currency: 0, streakCount: 0, lastCompletionDate: ymd(d), arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [
    tpl('tpl-work', 'Work day — startup', 3, 'Hard', 'High', 'High', 45, 20000),
    tpl('tpl-gym', 'Gym — push day', 5, 'Medium', 'Medium', 'Low', 60, 10000)
  ],
  lastSeenDate: ymd(d)
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-library')
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

  // Go to the Quests tab.
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.library-rail', { timeout: 5000 })
  await main.waitForTimeout(400)

  // --- RAIL + CARDS ---
  const railCount = await main.locator('.library-rail').count()
  const cards0 = await main.locator('.tpl-card').count()
  result('RAIL_AND_CARDS', railCount === 1 && cards0 === 2, `rail=${railCount} cards=${cards0}`)
  await main.locator('.quests-layout').screenshot({ path: path.join(shots, 'library-rail.png') })

  // --- CREATE_TEMPLATE ---
  await main.locator('.rail-newbtn').click()
  await main.waitForSelector('.modal', { timeout: 3000 })
  const tplTitle = (await main.locator('.modal h2').textContent())?.trim()
  const noFrame = await main.locator('.modal').getByText('Time frame').count()
  const noRepeats = await main.locator('.modal').getByText('Repeats').count()
  result('SCHEDULING_HIDDEN', tplTitle === 'New template' && noFrame === 0 && noRepeats === 0,
    `title="${tplTitle}" frameFields=${noFrame} repeatsFields=${noRepeats}`)
  await main.getByPlaceholder('What needs doing?').fill('Evening wind-down')
  await main.getByRole('button', { name: 'Create template' }).click()
  await main.waitForTimeout(700)
  const afterCreate = readDb().questTemplates.length
  const cards1 = await main.locator('.tpl-card').count()
  result('CREATE_TEMPLATE', afterCreate === 3 && cards1 === 3, `templates=${afterCreate} cards=${cards1}`)

  // --- SAVE_AS_TEMPLATE ---
  await main.getByRole('button', { name: 'Save as template' }).first().click()
  await main.waitForTimeout(700)
  const afterSave = readDb().questTemplates
  const savedQuest = afterSave.some((t) => t.title === 'Reply to client emails')
  result('SAVE_AS_TEMPLATE', afterSave.length === 4 && savedQuest,
    `templates=${afterSave.length} hasQuestTitle=${savedQuest}`)

  // --- TAP_ADD ---
  await main.locator('.tpl-add').first().click()
  await main.waitForSelector('.modal', { timeout: 3000 })
  const tapTitle = (await main.locator('.modal h2').textContent())?.trim()
  const hasFrameField = await main.locator('.modal').getByText('Time frame').count()
  result('TAP_ADD_TITLE', tapTitle === 'New quest' && hasFrameField === 1,
    `title="${tapTitle}" frameField=${hasFrameField}`)
  await main.getByRole('button', { name: 'Create quest' }).click()
  await main.waitForTimeout(700)
  const afterTap = readDb().quests.length
  result('TAP_ADD_CREATES', afterTap === 2, `quests=${afterTap}`)

  // --- DRAG_ADD (synthetic HTML5 drop carrying the template MIME onto the Midday frame) ---
  await main.evaluate(
    ({ mime, templateId, frameIndex }) => {
      const cards = [...document.querySelectorAll('.quests-main .card')]
      const target = cards[frameIndex]
      const dt = new DataTransfer()
      dt.setData(mime, templateId)
      const opts = { bubbles: true, cancelable: true, dataTransfer: dt }
      target.dispatchEvent(new DragEvent('dragenter', opts))
      target.dispatchEvent(new DragEvent('dragover', opts))
      target.dispatchEvent(new DragEvent('drop', opts))
    },
    { mime: MIME, templateId: 'tpl-gym', frameIndex: 1 }
  )
  await main.waitForTimeout(700)
  const dropped = readDb().quests.find((q) => q.timeFrameId === 'tf-midday' && q.title === 'Gym — push day')
  result('DRAG_ADD', !!dropped && dropped.dueAt === null,
    `found=${!!dropped} dueAt=${dropped ? dropped.dueAt : 'n/a'} quests=${readDb().quests.length}`)

  // --- EDIT_TEMPLATE (edit the first card) ---
  await main.locator('.tpl-card').first().hover()
  await main.locator('.tpl-card').first().getByRole('button', { name: 'Edit' }).click()
  await main.waitForSelector('.modal', { timeout: 3000 })
  const editTitle = (await main.locator('.modal h2').textContent())?.trim()
  await main.getByPlaceholder('What needs doing?').fill('EDITED TEMPLATE TITLE')
  await main.getByRole('button', { name: 'Save changes' }).click()
  await main.waitForTimeout(700)
  const edited = readDb().questTemplates.some((t) => t.title === 'EDITED TEMPLATE TITLE')
  result('EDIT_TEMPLATE', editTitle === 'Edit template' && edited,
    `title="${editTitle}" persisted=${edited}`)

  // --- DELETE_TEMPLATE (delete the first card) ---
  const beforeDel = readDb().questTemplates.length
  await main.locator('.tpl-card').first().hover()
  await main.locator('.tpl-card').first().getByRole('button', { name: 'Delete' }).click()
  await main.waitForTimeout(700)
  const afterDel = readDb().questTemplates.length
  result('DELETE_TEMPLATE', afterDel === beforeDel - 1, `before=${beforeDel} after=${afterDel}`)

  // --- COLLAPSE both ways ---
  await main.locator('.rail-collapse-btn').click()
  await main.waitForTimeout(400)
  const collapsed = await main.locator('.library-rail.collapsed').count()
  await main.locator('.rail-collapse-btn').click()
  await main.waitForTimeout(400)
  const expanded = await main.locator('.library-rail.collapsed').count()
  result('COLLAPSE', collapsed === 1 && expanded === 0, `collapsed=${collapsed} expandedAgain=${expanded}`)

  // --- TOGGLE OFF: hide the rail via the Data tab; data must persist ---
  const templatesBeforeToggle = readDb().questTemplates.length
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(400)
  await main
    .locator('.feature-toggle', { hasText: 'Quest Library' })
    .locator('input[type="checkbox"]')
    .click()
  await main.waitForTimeout(700)
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  const railAfterOff = await main.locator('.library-rail').count()
  const templatesAfterToggle = readDb().questTemplates.length
  const flagOff = readDb().settings.enabledFeatures.questLibrary === false
  result('TOGGLE_PERSISTS', railAfterOff === 0 && templatesAfterToggle === templatesBeforeToggle && flagOff,
    `railHidden=${railAfterOff === 0} templatesKept=${templatesAfterToggle === templatesBeforeToggle} flagOff=${flagOff}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
