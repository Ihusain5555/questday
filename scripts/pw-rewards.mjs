// Playwright driver — the HIGHEST-STAKES math: quest completion reward + the ↩
// Restore claw-back (exact inverse), plus the data-layer safety guards added in
// the data-safety pass (partial-settings deep-merge + invalid-patch rejection).
// Isolated --user-data-dir (own db.json + lock) — safe to run anytime.
//
// Deterministic seed (computed against balance.ts defaults):
//   quest: Hard(x2.5) / Critical(+20%) / 60 min  => baseXP 30, questXP 36
//   player starts level 1, xp 80, streak 0 (lastCompletionDate null => streak 1, x1.05)
//   base xpGained = round(36 * 1.05) = 38  -> xp 80+38=118 >= 100 => LEVEL UP to 2, xp 18
//   v1.13: a random treasure bonus ONLY ADDS to the award (folded into completionAward),
//   so the post-completion XP varies — the test recomputes the expected player state from
//   the ACTUAL stored award and still asserts an EXACT restore back to the seed (xp 80).
//   Restore subtracts the full stored award -> level 1, xp 80  (exact revert, bonus included)
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const isoDir = path.join(tmpdir(), 'questday-iso-rewards')
mkdirSync(isoDir, { recursive: true })
const dbFile = path.join(isoDir, 'db.json')

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const iso = (msFromNow) => new Date(d.getTime() + msFromNow).toISOString()
const H = 3_600_000
const today = ymd(d)

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

const seedBounds = { x: 111, y: 222, width: 320, height: 212 }
const quest = {
  id: 'q-reward', title: 'Reward math check', subTasks: [], difficulty: 'Hard',
  importance: 'High', urgency: 'High', timeEstimateMinutes: 60, dueAt: iso(2 * H),
  timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
  completedAt: null, sortOrder: 0
}
const seed = {
  version: 1,
  quests: [quest],
  timeFrames: frames,
  player: { xp: 80, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 2 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  focus: { sessionsRewardedOn: null, sessionsRewardedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: seedBounds, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
    focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true },
    realmChronicle: [
      { region: 'embergreen', topic: 'cosmos', entry: 'venus-day-longer-than-year' },
      { region: 'goldfield', topic: 'nature', entry: 'tardigrade-vacuum' },
      { region: 'sunmeadow', topic: 'history', entry: 'cleopatra-moon-landing' },
      { region: 'crownspire', topic: 'wisdom', entry: 'aurelius-obstacle-is-the-way' }
    ]
  },
  lastSeenDate: today
}
writeFileSync(dbFile, JSON.stringify(seed, null, 2))

const readDb = () => JSON.parse(readFileSync(dbFile, 'utf8'))
let failed = 0
const result = (name, pass, extra = '') => {
  if (!pass) failed++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await sleep(1500)
  const main = app.windows().find((w) => w.url().includes('index.html'))

  // --- Data-safety: partial settings DEEP-MERGE must not clobber siblings ----
  await main.evaluate(async () => {
    await window.questday.saveState({ settings: { launchOnLogin: true } })
    await window.questday.saveState({ settings: { widgetExpanded: true } })
  })
  await sleep(300)
  let db = readDb()
  result(
    'SETTINGS_MERGE_TEST',
    db.settings.launchOnLogin === true &&
      db.settings.widgetExpanded === true &&
      (db.settings.realmChronicle?.length ?? 0) === 4 &&
      db.settings.widgetBounds?.x === seedBounds.x &&
      db.settings.widgetBounds?.y === seedBounds.y,
    `launchOnLogin=${db.settings.launchOnLogin} widgetExpanded=${db.settings.widgetExpanded} ` +
      `chronicle=${db.settings.realmChronicle?.length} bounds.x=${db.settings.widgetBounds?.x}`
  )

  // --- Data-safety: an invalid patch must be REJECTED, not persisted ---------
  const rejected = await main.evaluate(async () => {
    try {
      await window.questday.saveState({ quests: null })
      return false
    } catch {
      return true
    }
  })
  db = readDb()
  result('VALIDATION_REJECT_TEST', rejected === true && Array.isArray(db.quests) && db.quests.length === 1,
    `rejected=${rejected} quests=${Array.isArray(db.quests) ? db.quests.length : typeof db.quests}`)

  // --- Complete the quest => exact reward + level up -------------------------
  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await sleep(400)
  await main.locator('.cq-complete').first().click()
  await main.waitForSelector('.celebrate-card', { timeout: 6000 })
  await sleep(300)
  db = readDb()
  const p = db.player
  const cq = db.quests.find((q) => q.id === 'q-reward')
  // Base award = round(36 * 1.05) = 38. v1.13 adds a random "treasure" bonus that ONLY
  // increases the award (gains-only) and is folded into completionAward.xp, so the test
  // verifies INVARIANTS (base floor + player-state consistency + exact restore), not a
  // frozen number. Expected player state is recomputed from the ACTUAL stored award.
  const award = cq?.completionAward?.xp ?? 0
  const bonus = award - 38
  let eLvl = 1
  let eXp = 80 + award
  while (eXp >= 100 * eLvl) {
    eXp -= 100 * eLvl
    eLvl += 1
  }
  result('REWARD_MATH_TEST',
    p.xp === eXp && p.level === eLvl && p.streakCount === 1 && p.currency === 0 && p.lastCompletionDate === today,
    `xp=${p.xp}/${eXp} level=${p.level}/${eLvl} bonus=${bonus} streak=${p.streakCount} last=${p.lastCompletionDate}`)
  result('LEVEL_UP_TEST', p.level === eLvl && eLvl >= 2, `level=${p.level}`)
  result('COMPLETION_AWARD_TEST',
    cq?.status === 'completed' && award >= 38 && bonus >= 0 && bonus <= 40,
    `status=${cq?.status} award.xp=${award} (base 38 + bonus ${bonus})`)
  await main.screenshot({ path: path.join(shots, 'rewards-complete.png') })

  // dismiss the celebration to reach the Quests tab
  await main.locator('.celebrate-backdrop').click({ timeout: 4000 }).catch(() => {})
  await sleep(400)

  // --- Restore => EXACT inverse: xp/level/currency back to the seed ----------
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await sleep(400)
  // Completed ONE-OFF quests are hidden until "Show completed" is toggled on.
  await main.getByRole('checkbox', { name: /show completed/i }).check().catch(async () => {
    await main.getByText(/show completed/i).click()
  })
  await sleep(300)
  await main.getByRole('button', { name: 'Restore' }).first().click()
  await sleep(500)
  db = readDb()
  const r = db.player
  const rq = db.quests.find((q) => q.id === 'q-reward')
  result('RESTORE_REVERSAL_TEST',
    r.xp === 80 && r.level === 1 && r.currency === 0,
    `xp=${r.xp} (want 80) level=${r.level} (want 1) currency=${r.currency} (want 0)`)
  result('RESTORE_QUEST_STATE_TEST',
    rq?.status === 'active' && (rq?.completionAward === undefined || rq?.completionAward === null) &&
      rq.subTasks.every((s) => s.done === false),
    `status=${rq?.status} award=${JSON.stringify(rq?.completionAward)}`)
  // Known gap (separate finding): streak/ticket are NOT reversed by Restore — log only.
  console.log(`NOTE_STREAK_NOT_REVERSED: streakCount=${r.streakCount} (expected to stay 1 — current behavior)`)
  await main.screenshot({ path: path.join(shots, 'rewards-restore.png') })

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  failed++
  await app.close()
}
console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILURE(S)'} (isolated dir: ${isoDir})`)
process.exitCode = failed === 0 ? 0 : 1
