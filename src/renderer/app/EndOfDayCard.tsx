import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { ymd } from '@shared/engine/rollover'
import { PencilSimple } from '@phosphor-icons/react'

/**
 * End-of-day reflection (v1.13) — a calm Dashboard wind-down card. The user jots one
 * line about how today went; it's saved per local day into the sealed `dailyNotes` map
 * (never read by reward/civilization math, so ↩ Restore stays exact). Optional, private,
 * never a target or a miss — pure tone-rule "gains only". Toggle: `endOfDayNote`.
 */
export function EndOfDayCard(): JSX.Element | null {
  const { db, setDailyNote } = useStore()
  const now = useNow(60000)
  const today = ymd(now)
  const saved = db?.dailyNotes?.[today] ?? ''
  const [text, setText] = useState(saved)
  const [flash, setFlash] = useState(false)

  // Re-sync when the day rolls over or another window edits today's note.
  useEffect(() => {
    setText(saved)
  }, [saved, today])

  if (!db) return null

  const dirty = text.trim() !== saved.trim()
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const save = async (): Promise<void> => {
    await setDailyNote(today, text)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  return (
    <div className="card eod-card">
      <div className="eod-head">
        <PencilSimple size={18} weight="fill" />
        <strong>End of day</strong>
        <span className="eod-date">{dateLabel}</span>
      </div>
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
    </div>
  )
}
