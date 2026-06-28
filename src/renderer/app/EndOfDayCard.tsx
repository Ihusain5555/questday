import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { ymd } from '@shared/engine/rollover'
import { PencilSimple, Trophy, MoonStars } from '@phosphor-icons/react'

/**
 * End-of-day wind-down (v2). A calm Dashboard card with three parts, all gains-only:
 *   1. Today's wins — a celebratory recap of what got done (derived from completions;
 *      never read by reward math, so ↩ Restore stays exact).
 *   2. Reflection — the user jots one line about the day, saved per local day into the
 *      sealed `dailyNotes` map.
 *   3. Push to tomorrow — tucks every still-open quest away until tomorrow morning
 *      (snooze, not delete) so the day closes cleanly. Optional, private, never a miss.
 * Toggle: `endOfDayNote`.
 */
export function EndOfDayCard(): JSX.Element | null {
  const { db, setDailyNote, pushUnfinishedToTomorrow } = useStore()
  const now = useNow(60000)
  const today = ymd(now)
  const saved = db?.dailyNotes?.[today] ?? ''
  const [text, setText] = useState(saved)
  const [flash, setFlash] = useState(false)
  const [pushed, setPushed] = useState<number | null>(null)

  // Re-sync when the day rolls over or another window edits today's note.
  useEffect(() => {
    setText(saved)
  }, [saved, today])

  if (!db) return null

  const dirty = text.trim() !== saved.trim()
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  // Today's wins: quests completed today — a one-off completed today, or a recurring
  // quest whose completion history includes today. Derived only (never stored).
  const wins = db.quests.filter((q) => {
    if (q.completionDates?.includes(today)) return true
    return q.status === 'completed' && q.completedAt != null && ymd(new Date(q.completedAt)) === today
  })
  const xpToday = wins.reduce((sum, q) => sum + (q.completionAward?.xp ?? 0), 0)

  // Quests still open (active) that the wind-down could push to tomorrow.
  const openCount = db.quests.filter((q) => q.status === 'active').length

  const save = async (): Promise<void> => {
    await setDailyNote(today, text)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  const onPush = async (): Promise<void> => {
    const n = await pushUnfinishedToTomorrow()
    setPushed(n)
  }

  return (
    <div className="card eod-card">
      <div className="eod-head">
        <PencilSimple size={18} weight="fill" />
        <strong>End of day</strong>
        <span className="eod-date">{dateLabel}</span>
      </div>

      {/* 1 — today's wins recap */}
      <div className="eod-wins">
        {wins.length > 0 ? (
          <>
            <div className="eod-wins-head">
              <Trophy size={15} weight="fill" />
              <span>
                {wins.length} {wins.length === 1 ? 'win' : 'wins'} today
                {xpToday > 0 ? ` · +${xpToday} XP` : ''}
              </span>
            </div>
            <ul className="eod-wins-list">
              {wins.slice(0, 6).map((w) => (
                <li key={w.id}>{w.title}</li>
              ))}
              {wins.length > 6 && <li className="eod-wins-more">+{wins.length - 6} more</li>}
            </ul>
          </>
        ) : (
          <div className="eod-wins-empty">
            No wins logged yet today — and that’s perfectly okay. Rest is part of the rhythm. 🌙
          </div>
        )}
      </div>

      {/* 2 — reflection (per-day note) */}
      <p className="eod-prompt">
        How did today go? One line is plenty — a win, a thought, or something you’re grateful for.
      </p>
      <textarea
        className="eod-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Today I…"
        rows={2}
        aria-label="End-of-day reflection"
      />
      <div className="eod-actions">
        {flash && <span className="eod-saved">Saved ✓</span>}
        <button className="primary" disabled={!dirty} onClick={() => void save()}>
          {saved ? 'Update reflection' : 'Save reflection'}
        </button>
      </div>

      {/* 3 — push unfinished to tomorrow */}
      {pushed === null ? (
        openCount > 0 && (
          <button className="eod-push" onClick={() => void onPush()}>
            <MoonStars size={16} weight="fill" />
            Wrap up — rest {openCount} open {openCount === 1 ? 'quest' : 'quests'} until tomorrow
          </button>
        )
      ) : (
        <div className="eod-pushed">
          {pushed > 0
            ? `Tucked ${pushed} ${pushed === 1 ? 'quest' : 'quests'} away until tomorrow morning. Sleep easy. 🌙`
            : 'Nothing left to rest — you’re all caught up. ✨'}
        </div>
      )}
    </div>
  )
}
