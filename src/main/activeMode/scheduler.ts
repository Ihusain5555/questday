// ---------------------------------------------------------------------------
// QuestDay — Active mode scheduler (§8), main process.
//
// Implements every tier:
//   • Awareness — a quiet periodic "current quest" reminder.
//   • Gentle nudge — a heads-up when the active time frame is ending / off-task.
//   • Soft friction — an "are you sure?" prompt on flagged apps.
//   • Hard block (tier 4, approved 2026-06-06) — flagged apps get minimized
//     behind an always-on-top block screen. Always escapable via a guilt-free
//     timed break pass (never punitive — the user sets their own rule).
// ---------------------------------------------------------------------------

import { Notification, BrowserWindow } from 'electron'
import { minimizeApp, restoreApp } from './detector'
import { getDatabase } from '../db/store'
import { resolveCurrentQuest, activeTimeFrame } from '@shared/engine/selectCurrentQuest'
import { minutesUntilFrameEnd } from '@shared/engine/activeMode'
import { ymd } from '@shared/engine/rollover'
import { balance } from '@shared/config/balance'

export interface ActiveModeNotice {
  kind: 'awareness' | 'nudge'
  title: string
  body: string
  id: string
}

let timer: NodeJS.Timeout | null = null
let lastReminderAt = 0
let snoozeUntil = 0
const nudgedFrameKeys = new Set<string>()
/** The day nudgedFrameKeys currently holds keys for — cleared when it changes so
 *  the set can't grow without bound on a long-running (days/weeks) tray app. */
let nudgeDay = ''
let noticeSeq = 0

export interface FrictionTrigger {
  appName: string
  questTitle: string | null
  id: string
  /** 'soft' = tier-3 are-you-sure prompt; 'block' = tier-4 block screen. */
  kind: 'soft' | 'block'
  /** Length of the tier-4 break pass, minutes (shown on the block screen). */
  breakMinutes: number
}

// Foreground-detection state (off-task nudge + soft friction + hard block).
let wasDistracting = false
let lastOffTaskNudgeAt = 0
let frictionGraceUntil = 0
let frictionShowing = false
const OFF_TASK_NUDGE_COOLDOWN_MS = balance.activeMode.offTaskNudgeCooldownMin * 60_000
let showFriction: ((data: FrictionTrigger) => void) | null = null

// Hard-block state: the break pass window and the last app we minimized (so a
// break pass can graciously hand it back).
let breakPassUntil = 0
let lastBlockedApp = ''

/** Allow the main process to give us a way to surface the friction window. */
export function setShowFriction(fn: (data: FrictionTrigger) => void): void {
  showFriction = fn
}

/**
 * Called when the user resolves the friction/block window.
 * Soft friction:
 *  - proceeded: treat the app as acknowledged (no re-prompt while they use it);
 *    re-arms only on the next fresh switch back to it.
 *  - cancelled: a short grace covers the focus hand-off back to QuestDay.
 * Hard block:
 *  - proceeded = "take a break": start the timed pass and restore their app —
 *    the break is genuine, not a trick.
 *  - cancelled = "back to my quest": short grace for the focus hand-off.
 */
export function onFrictionResolved(proceeded: boolean, kind: 'soft' | 'block' = 'soft'): void {
  frictionShowing = false
  const now = Date.now()
  if (kind === 'block') {
    if (proceeded) {
      const mins = Math.max(1, getDatabase().settings.blockBreakPassMin)
      breakPassUntil = now + mins * 60_000
      wasDistracting = true
      if (lastBlockedApp) restoreApp(lastBlockedApp)
    } else {
      wasDistracting = false
      frictionGraceUntil = now + balance.activeMode.dismissGraceSec * 1000
    }
    return
  }
  if (proceeded) {
    wasDistracting = true
    frictionGraceUntil = now + balance.activeMode.proceedGraceSec * 1000
  } else {
    wasDistracting = false
    frictionGraceUntil = now + balance.activeMode.dismissGraceSec * 1000
  }
}

/** Case-insensitive match of a flagged app/site entry against the foreground. */
function matchesEntry(app: string, title: string, entry: string): boolean {
  const a = app.toLowerCase()
  const t = title.toLowerCase()
  const e = entry.trim().toLowerCase()
  if (!e) return false
  if (a.includes(e) || t.includes(e)) return true
  // Domain-ish entry (youtube.com) -> match the bare label in window titles.
  const bare = e.split('.')[0]
  return bare.length >= 3 && (a.includes(bare) || t.includes(bare))
}

function fireFriction(appName: string, questTitle: string | null, kind: 'soft' | 'block'): void {
  frictionShowing = true
  showFriction?.({
    appName,
    questTitle,
    id: `${kind === 'block' ? 'block' : 'friction'}-${++noticeSeq}`,
    kind,
    breakMinutes: Math.max(1, getDatabase().settings.blockBreakPassMin)
  })
}

/**
 * Called for each foreground-window sample. Fires an off-task nudge and/or the
 * soft-friction prompt when the user lands on a flagged app/site. Never blocks.
 */
export function handleForeground(app: string, title: string): void {
  const db = getDatabase()
  const s = db.settings
  if (!s.activeModeEnabled) {
    wasDistracting = false
    return
  }
  const now = Date.now()
  if (now < snoozeUntil) return

  const isDistracting = s.distractingApps.some((e) => matchesEntry(app, title, e))
  const current = resolveCurrentQuest(db.quests, db.timeFrames, new Date(), db.settings.pinnedQuestId)
  const label = app || 'that app'

  // Hard block (tier 4) — supersedes nudge/friction for flagged apps. Fires on
  // EVERY landing on the app (not just fresh switches): minimize it and show the
  // block screen. A running break pass means peace — no block, no nudges.
  if (isDistracting && s.activeModeTiers.hardBlock) {
    if (now < breakPassUntil) {
      wasDistracting = true
      return
    }
    if (!frictionShowing && now > frictionGraceUntil) {
      lastBlockedApp = app
      minimizeApp(app)
      fireFriction(label, current?.title ?? null, 'block')
      wasDistracting = true
    }
    return
  }

  // Off-task nudge (gentle tier).
  if (isDistracting && s.activeModeTiers.nudge && now - lastOffTaskNudgeAt > OFF_TASK_NUDGE_COOLDOWN_MS) {
    lastOffTaskNudgeAt = now
    fire(
      'nudge',
      'Psst — back on track?',
      current ? `You're on ${label}. Current quest: ${current.title}` : `You're on ${label}.`
    )
  }

  // Soft friction: fire on a fresh switch INTO a distracting app. No blanket
  // cooldown — re-opening the app re-triggers it (guarded only against the
  // focus bounce while the prompt is up / just resolved).
  if (
    isDistracting &&
    !wasDistracting &&
    s.activeModeTiers.softFriction &&
    !frictionShowing &&
    now > frictionGraceUntil
  ) {
    fireFriction(label, current?.title ?? null, 'soft')
  }

  // While the prompt is showing, the foreground is our window — don't let that
  // sample reset the "was distracting" memory.
  if (!frictionShowing) wasDistracting = isDistracting
}

function broadcast(notice: ActiveModeNotice): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('activeMode:notify', notice)
  }
}

function fire(kind: ActiveModeNotice['kind'], title: string, body: string): void {
  const notice: ActiveModeNotice = { kind, title, body, id: `${kind}-${++noticeSeq}` }
  if (Notification.isSupported()) {
    try {
      const n = new Notification({ title, body, silent: false })
      n.on('click', () => {
        for (const win of BrowserWindow.getAllWindows()) win.show()
      })
      n.show()
    } catch {
      /* OS notification best-effort */
    }
  }
  broadcast(notice)
}

function tick(): void {
  const db = getDatabase()
  const s = db.settings
  if (!s.activeModeEnabled) return
  const now = new Date()
  const today = ymd(now)
  // New day: drop yesterday's nudge keys so the set stays bounded.
  if (today !== nudgeDay) {
    nudgedFrameKeys.clear()
    nudgeDay = today
  }
  if (now.getTime() < snoozeUntil) return

  const current = resolveCurrentQuest(db.quests, db.timeFrames, now, db.settings.pinnedQuestId)

  // Awareness — quiet periodic reminder of the current quest.
  if (s.activeModeTiers.awareness && current) {
    const intervalMs = Math.max(1, s.reminderIntervalMin) * 60_000
    if (now.getTime() - lastReminderAt >= intervalMs) {
      lastReminderAt = now.getTime()
      fire('awareness', 'Current quest', current.title)
    }
  }

  // Gentle nudge — heads-up that the active frame is wrapping up (once per frame/day).
  if (s.activeModeTiers.nudge) {
    const frame = activeTimeFrame(db.timeFrames, now)
    if (frame) {
      const mins = minutesUntilFrameEnd(frame, now)
      if (mins <= Math.max(1, s.frameEndingLeadMin)) {
        const key = `${frame.id}:${today}`
        if (!nudgedFrameKeys.has(key)) {
          nudgedFrameKeys.add(key)
          fire(
            'nudge',
            `${frame.name} ends in ${Math.max(1, mins)} min`,
            current ? `Current quest: ${current.title}` : 'Wrap up or carry on — your call.'
          )
        }
      }
    }
  }
}

export function startActiveModeScheduler(): void {
  if (timer) return
  timer = setInterval(tick, balance.activeMode.pollIntervalSec * 1000)
}

/** Stop the periodic tick (called when Active mode is switched off, so a disabled
 *  feature costs zero idle wake-ups on a long-running tray app). */
export function stopActiveModeScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** Quiet all reminders/nudges for `minutes`. */
export function snooze(minutes: number): void {
  snoozeUntil = Date.now() + Math.max(1, minutes) * 60_000
}

/** Fire an immediate awareness reminder (used by the "Send test reminder" button). */
export function testReminder(): void {
  const db = getDatabase()
  const current = resolveCurrentQuest(db.quests, db.timeFrames, new Date(), db.settings.pinnedQuestId)
  fire('awareness', 'Current quest', current ? current.title : 'No current quest right now')
}
