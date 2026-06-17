import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import {
  selectCurrentQuest,
  activeTimeFrame,
  rankCandidates
} from '@shared/engine/selectCurrentQuest'
import { ymd } from '@shared/engine/rollover'
import { WidgetList } from './WidgetList'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { ActiveModeToasts } from '../components/ActiveModeToasts'
import { PlayerBar } from '../components/PlayerBar'
import { formatMinutes } from '@shared/format'
import { CaretRight, CaretDown, GearSix, X, Check, SkipForward } from '@phosphor-icons/react'
import { motion, MotionConfig } from 'framer-motion'

/**
 * Whether to show the warm "resting / welcome back" line: NO completion yet today
 * AND the last win was 2+ calendar days ago (or never). Derived purely from
 * player.lastCompletionDate — no stored state, and the user is never shown a
 * day-count. Gains-only: it greets a return, never marks an absence.
 */
function isRealmResting(lastCompletionDate: string | null, now: Date): boolean {
  if (lastCompletionDate === ymd(now)) return false // already a win today
  if (!lastCompletionDate) return true // brand new — the realm is quietly resting
  const [y, m, d] = lastCompletionDate.split('-').map(Number)
  const last = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const gapDays = Math.round((today.getTime() - last.getTime()) / 86400000)
  return gapDays >= 2
}

/**
 * Always-on-top widget (§9). Live-updates via the cross-window store sync and a
 * time tick, surfaces the single §4 current quest + immediate sub-task, lets you
 * tick that sub-task off, and expands into the full quest list.
 */
export function Widget(): JSX.Element {
  const { db, loading, connect, toggleSubTask, completeQuest } = useStore()
  const now = useNow(20000)

  useEffect(() => {
    void connect()
  }, [connect])

  const expanded = db?.settings.widgetExpanded ?? false
  const frame = db ? activeTimeFrame(db.timeFrames, now) : null
  const current = db ? selectCurrentQuest(db.quests, db.timeFrames, now) : null
  // Resting / welcome-back greeting on a genuine return (see isRealmResting).
  const resting = db ? isRealmResting(db.player.lastCompletionDate, now) : false

  // "Not now" deferrals are session-only (this window's memory, never persisted,
  // never a penalty). The immediate sub-task is the first not-done step that
  // isn't deferred; once only deferred steps remain, they resurface in order.
  const [deferredIds, setDeferredIds] = useState<string[]>([])
  const undone = current
    ? [...current.subTasks].sort((a, b) => a.order - b.order).filter((s) => !s.done)
    : []
  const fresh = undone.filter((s) => !deferredIds.includes(s.id))
  const sub = fresh[0] ?? undone[0] ?? null
  const canDefer = undone.length >= 2

  const deferSub = () => {
    if (!sub) return
    const next = [...deferredIds.filter((id) => id !== sub.id), sub.id]
    // If that would defer every remaining step, keep only this one deferred so
    // the earlier ones come straight back — skipping is never a dead end.
    setDeferredIds(undone.every((s) => next.includes(s.id)) ? [sub.id] : next)
  }
  const remainingInFrame = db
    ? Math.max(0, rankCandidates(db.quests, db.timeFrames, now).length - 1)
    : 0
  const allDone = current ? current.subTasks.length > 0 && current.subTasks.every((s) => s.done) : false

  return (
    <MotionConfig reducedMotion="user">
    <div className="widget">
      <div className="widget-drag">
        <span>QuestDay{frame ? ` · ${frame.name}` : ''}</span>
        <div className="controls">
          <button
            aria-label={expanded ? 'Collapse' : 'Expand full list'}
            title={expanded ? 'Collapse' : 'Expand full list'}
            onClick={() => void window.questday.widget.setExpanded(!expanded)}
          >
            {expanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </button>
          <button
            aria-label="Open QuestDay"
            title="Open QuestDay"
            onClick={() => void window.questday.openMainWindow()}
          >
            <GearSix size={14} weight="fill" />
          </button>
          <button
            aria-label="Hide widget"
            title="Hide widget"
            onClick={() => void window.questday.widget.hide()}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="widget-body-content">
        {!loading && resting && (
          <div className="widget-resting">
            <span className="wr-moon">🌙</span> Welcome back — your realm’s been resting. No rush.
          </div>
        )}
        {loading ? (
          <div className="empty">Loading…</div>
        ) : current ? (
          <>
            <motion.div
              key={current.id}
              className="quest-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              {current.title}
            </motion.div>
            {sub ? (
                <motion.div
                  key={sub.id}
                  className="subtask-row"
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                >
                  <label className="subtask-check">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => void toggleSubTask(current.id, sub.id)}
                    />
                    <span className="subtask">
                      {sub.title}
                      {sub.timeEstimateMinutes ? (
                        <span className="sub-est-hint"> · ~{formatMinutes(sub.timeEstimateMinutes)}</span>
                      ) : null}
                    </span>
                  </label>
                  {canDefer && (
                    <button
                      className="defer-btn"
                      aria-label="Skip to the next step"
                      title="Not this one right now? Jump to the next step — this one will come back."
                      onClick={deferSub}
                    >
                      <SkipForward size={15} weight="fill" />
                    </button>
                  )}
                </motion.div>
              ) : allDone ? (
                <motion.div
                  key="all-done"
                  className="subtask done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                >
                  <Check size={16} weight="bold" /> All steps done — ready to complete!
                </motion.div>
              ) : (
                <motion.div
                  key="no-sub"
                  className="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No sub-tasks — just do it!
                </motion.div>
              )}
            <button
              className={`widget-complete ${allDone ? 'ready' : ''}`}
              onClick={() => void completeQuest(current.id)}
            >
              <Check size={17} weight="bold" /> Complete
            </button>
            {!expanded && remainingInFrame > 0 && (
              <div className="more-hint">+{remainingInFrame} more in this frame</div>
            )}
          </>
        ) : (
          <div className="empty">
            {frame
              ? 'Nothing queued in this frame. ✨'
              : 'No active time frame right now.'}
          </div>
        )}

        {expanded && db && <WidgetList db={db} now={now} currentId={current?.id ?? null} />}

        {db && <PlayerBar player={db.player} compact />}
      </div>

      <CompletionCelebration />
      <ActiveModeToasts />
    </div>
    </MotionConfig>
  )
}
