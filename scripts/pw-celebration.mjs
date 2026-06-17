// Playwright driver — 🏰 Civilization XP-driven town growth (v1.10).
// Buildings now grow with ALL-TIME XP (effort-weighted), not raw completion count.
// Verifies:
//   • DEFAULT-view CompletionCelebration: a "progress to your next building" line on a
//     non-milestone completion; a "your <stage> grew — a new building rose" line (with a
//     building badge) when a completion's XP crosses a per-building threshold; a SURGE
//     ("N new buildings rose") when one big quest's XP raises several at once; and that
//     the civ line is suppressed when the `world` feature is toggled OFF.
//   • TOWN RENDER: entering a town shows buildingsForXp(totalXp).count buildings — proving
//     the town render and the celebration read the SAME XP-derived count (no desync), and
//     that the count follows XP (not completions: 3 completions but 5 buildings).
// XP math (deterministic, streakCount=2 same-day → ×1.10):
//   small quest (Medium 1.5, Critical +20%, 20m) → questXP 7 → xpGained 8.
//   big   quest (Hard 2.5,  Critical +20%, 800m) → questXP 480 → xpGained 528.
//   buildingsForXp: count = min(30, 2 + floor(totalXp / 20)).
// Each behaviour gets its OWN fresh launch + a SINGLE action, so there is no store-sync
// race between completions. Isolated --user-data-dir — never touches the real save.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const iso = (msFromNow) => new Date(d.getTime() + msFromNow).toISOString()
const H = 3_600_000

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

const doneQuest = (i) => ({
  id: `done-${i}`, title: `Past quest ${i + 1}`, subTasks: [], difficulty: 'Easy',
  priority: 'Medium', skippability: 'Should do', timeEstimateMinutes: 10, dueAt: null,
  timeFrameId: frames[0].id, status: 'completed', createdAt: d.toISOString(),
  completedAt: d.toISOString(), sortOrder: i, completionAward: { xp: 10, currency: 5 }
})
// Small active quest → +8 XP. Big active quest (`big`) → +528 XP (surge several buildings).
const activeQuest = (big) =>
  big
    ? {
        id: 'qx', title: 'Slay the dragon', subTasks: [], difficulty: 'Hard',
        priority: 'Critical', skippability: 'Must do', timeEstimateMinutes: 800, dueAt: iso(2 * H),
        timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
        completedAt: null, sortOrder: 0
      }
    : {
        id: 'qx', title: 'Do the thing', subTasks: [], difficulty: 'Medium',
        priority: 'Critical', skippability: 'Must do', timeEstimateMinutes: 20, dueAt: iso(2 * H),
        timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
        completedAt: null, sortOrder: 0
      }

const baseSettings = (world, chronicle) => ({
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world },
  realmChronicle: chronicle
})

// `xp`/`level` set the player's ALL-TIME XP (totalXpEarned = baseCost*(level-1)*level/2 + xp;
// at level 1 that is simply `xp`). This — not completedCount — now drives the town.
const seedFor = (completedCount, world, opts = {}) => {
  const { xp = 50, level = 2, big = false, chronicle = [] } = opts
  return {
    version: 1,
    quests: [...Array.from({ length: completedCount }, (_, i) => doneQuest(i)), activeQuest(big)],
    timeFrames: frames,
    player: { xp, level, currency: 0, streakCount: 2, lastCompletionDate: ymd(d), arcadeTickets: 2 },
    garden: { theme: 'garden', items: [], visitors: [], bestStreak: 2 },
    arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
    focus: { sessionsRewardedOn: null, sessionsRewardedCount: 0 },
    settings: baseSettings(world, chronicle),
    lastSeenDate: ymd(d)
  }
}

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
const txt = async (loc) => ((await loc.textContent()) ?? '').replace(/\s+/g, ' ').trim()
const count = (main, sel) => main.locator(sel).count()

async function launch(dirName, seed) {
  const isoDir = path.join(tmpdir(), dirName)
  mkdirSync(isoDir, { recursive: true })
  writeFileSync(path.join(isoDir, 'db.json'), JSON.stringify(seed, null, 2))
  const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  return { app, main, isolated: userData.toLowerCase() === isoDir.toLowerCase() }
}

/** Fresh app, one completion, return the celebration line counts/texts. */
async function runOnce(dirName, completedCount, world, opts, shot) {
  const { app, main, isolated } = await launch(dirName, seedFor(completedCount, world, opts))
  try {
    await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await main.waitForTimeout(400)
    await main.locator('.cq-complete').first().click()
    await main.waitForSelector('.celebrate-card', { timeout: 6000 })
    await main.waitForTimeout(900) // let the staggered reward lines settle
    const grew = await count(main, '.celebrate-civ-grew')
    const prog = await count(main, '.celebrate-civ-progress')
    const full = await count(main, '.celebrate-civ-full')
    const out = {
      isolated,
      card: await count(main, '.celebrate-card'),
      grew, prog, full,
      sprite: await count(main, '.celebrate-building-sprite svg'),
      grewText: grew ? await txt(main.locator('.celebrate-civ-grew')) : '',
      progText: prog ? await txt(main.locator('.celebrate-civ-progress')) : '',
      fullText: full ? await txt(main.locator('.celebrate-civ-full')) : ''
    }
    if (shot) await main.screenshot({ path: path.join(shots, shot) })
    return out
  } finally {
    await app.close()
  }
}

/** Fresh app, enter a charted hero town, count the rendered buildings. */
async function runTown(dirName, completedCount, opts, shot) {
  const { app, main, isolated } = await launch(dirName, seedFor(completedCount, true, opts))
  try {
    await main.getByRole('button', { name: 'Realm', exact: true }).click()
    await main.waitForTimeout(500)
    await main.locator('.realm-enterable').first().click()
    await main.waitForSelector('.town-overlay', { timeout: 4000 })
    await main.waitForTimeout(500) // let the fade/scale settle before counting
    const bldgs = await count(main, '.town-overlay .town-bldg')
    if (shot) await main.locator('.realm-map-wrap').screenshot({ path: path.join(shots, shot) })
    return { isolated, bldgs }
  } finally {
    await app.close()
  }
}

const chronicleGreenhaven = [
  { region: 'embergreen', topic: 'cosmos', entry: 'venus-day-longer-than-year' }
]

try {
  // --- Progress: totalXp 5, +8 → 13 → still 2 buildings → progress line ---
  const p = await runOnce('questday-iso-celeb-prog', 3, true, { xp: 5, level: 1 }, 'celeb-progress.png')
  result('ISOLATION_TEST', p.isolated)
  result('PROGRESS_LINE_TEST', p.prog === 1 && p.grew === 0 && /to your next building/i.test(p.progText),
    `prog=${p.prog} grew=${p.grew} text="${p.progText}"`)

  // --- Milestone: totalXp 15, +8 → 23 → 2→3 buildings → "a new building rose" ---
  const m = await runOnce('questday-iso-celeb-mile', 4, true, { xp: 15, level: 1 }, 'celeb-milestone.png')
  result('MILESTONE_LINE_TEST',
    m.grew === 1 && /a new building rose/i.test(m.grewText) && m.sprite === 1,
    `grew=${m.grew} sprite=${m.sprite} text="${m.grewText}"`)

  // --- Surge: totalXp 0, big quest +528 → 2→28 buildings → "26 new buildings rose" ---
  const s = await runOnce('questday-iso-celeb-surge', 2, true, { xp: 0, level: 1, big: true }, 'celeb-surge.png')
  result('SURGE_LINE_TEST',
    s.grew === 1 && /26 new buildings rose/i.test(s.grewText) && s.sprite === 1,
    `grew=${s.grew} sprite=${s.sprite} text="${s.grewText}"`)

  // --- Capped: totalXp 600 (town full at 30), +8 → still 30 → "full glory" line (NOT silent).
  //     This reproduces a long-time save (the bug: a maxed town used to show no civ line). ---
  const c = await runOnce('questday-iso-celeb-cap', 5, true, { xp: 600, level: 1 }, 'celeb-capped.png')
  result('CAPPED_LINE_TEST',
    c.full === 1 && /full glory/i.test(c.fullText) && c.grew === 0 && c.prog === 0 && c.sprite === 1,
    `full=${c.full} grew=${c.grew} prog=${c.prog} text="${c.fullText}"`)

  // --- Toggle OFF: milestone XP, but world is off → no civ line ---
  const o = await runOnce('questday-iso-celeb-off', 4, false, { xp: 15, level: 1 }, null)
  result('TOGGLE_OFF_TEST', o.card === 1 && o.grew === 0 && o.prog === 0,
    `card=${o.card} grew=${o.grew} prog=${o.prog}`)

  // --- Town render: totalXp 65 → 5 buildings (NOT 2 from 3 completions) → XP drives it ---
  const t = await runTown('questday-iso-celeb-town', 3, { xp: 65, level: 1, chronicle: chronicleGreenhaven },
    'celeb-town.png')
  result('TOWN_RENDER_XP_TEST', t.bldgs === 5,
    `${t.bldgs} buildings (want 5 = buildingsForXp(65); completion-count would be 2)`)
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  process.exitCode = 1
}
console.log('closed')
