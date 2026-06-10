import { useState } from 'react'
import type { Quest } from '@shared/types'
import { useStore, type QuestInput } from '../state/store'
import { useNow } from '../hooks/useNow'
import { QuestForm } from './QuestForm'
import { PRIORITY_COLOR, SKIPPABILITY_COLOR } from './options'
import { formatDue, formatMinutes } from '@shared/format'
import { activeTimeFrame } from '@shared/engine/selectCurrentQuest'
import { questXP } from '@shared/engine/rewards'
import { isRecurring, isResting, recurLabel, ymdOf } from '@shared/engine/recurrence'
import {
  Lightning,
  Check,
  ArrowsClockwise,
  ArrowUUpLeft,
  Trophy,
  DotsSixVertical
} from '@phosphor-icons/react'

export function QuestsView(): JSX.Element {
  const {
    db,
    createQuest,
    updateQuest,
    deleteQuest,
    dropQuest,
    completeQuest,
    restoreQuest,
    moveQuestToFrame,
    moveQuestBefore
  } = useStore()
  const now = useNow(20000)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Quest | null>(null)
  const [showDropped, setShowDropped] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overFrame, setOverFrame] = useState<string | null>(null)
  const [overQuest, setOverQuest] = useState<string | null>(null)

  const activeFrameId = db ? activeTimeFrame(db.timeFrames, now)?.id ?? null : null

  if (!db) return <div>Loading…</div>

  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = (q: Quest) => {
    setEditing(q)
    setShowForm(true)
  }
  const handleSave = async (input: QuestInput) => {
    if (editing) await updateQuest(editing.id, input)
    else await createQuest(input)
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div>
      <div className="view-head">
        <h2>Quests</h2>
        <button className="primary" onClick={openNew}>
          + New quest
        </button>
      </div>

      {frames.map((frame) => {
        // Active first (manual order), then completed (latest win first — a
        // little trophy shelf), then dropped.
        const statusRank = { active: 0, completed: 1, dropped: 2 } as Record<Quest['status'], number>
        // A recurring quest completed TODAY always stays visible ("done for
        // today — back tomorrow"), so a daily never just vanishes on completion.
        const doneToday = (q: Quest) =>
          isRecurring(q) &&
          q.status === 'completed' &&
          !!q.completedAt &&
          ymdOf(new Date(q.completedAt)) === ymdOf(now)
        const quests = db.quests
          .filter(
            (q) =>
              q.timeFrameId === frame.id &&
              (q.status === 'active' ||
                (showDropped && q.status === 'dropped') ||
                (q.status === 'completed' && (showCompleted || doneToday(q))))
          )
          .sort((a, b) => {
            if (statusRank[a.status] !== statusRank[b.status])
              return statusRank[a.status] - statusRank[b.status]
            if (a.status === 'completed')
              return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
            return a.sortOrder - b.sortOrder
          })
        const isDropTarget = dragId !== null && overFrame === frame.id
        return (
          <div
            className={`card ${isDropTarget ? 'drop-over' : ''}`}
            key={frame.id}
            onDragOver={(e) => {
              if (!dragId) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overFrame !== frame.id) setOverFrame(frame.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || dragId
              if (id) void moveQuestToFrame(id, frame.id)
              setOverFrame(null)
              setOverQuest(null)
              setDragId(null)
            }}
          >
            <div className="frame-head">
              <strong>{frame.name}</strong>
              {frame.id === activeFrameId && <span className="badge active-now">active now</span>}
              <span className="frame-count">{quests.length}</span>
            </div>

            {quests.length === 0 ? (
              <div className="empty">No quests in this frame yet.</div>
            ) : (
              <ul className="quest-list">
                {quests.map((q) => (
                  <li
                    className={`quest-row ${q.status} ${dragId === q.id ? 'dragging' : ''} ${
                      dragId && dragId !== q.id && overQuest === q.id ? 'drop-before' : ''
                    } ${q.status === 'active' && isResting(q, now) ? 'resting' : ''}`}
                    key={q.id}
                    draggable={q.status === 'active'}
                    onDragStart={(e) => {
                      setDragId(q.id)
                      e.dataTransfer.setData('text/plain', q.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverFrame(null)
                      setOverQuest(null)
                    }}
                    onDragOver={(e) => {
                      // Rows are precise drop targets: drop inserts BEFORE this
                      // quest (within-frame reorder; frames still take loose drops).
                      if (!dragId || dragId === q.id || q.status !== 'active') return
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = 'move'
                      if (overQuest !== q.id) setOverQuest(q.id)
                      if (overFrame !== null) setOverFrame(null)
                    }}
                    onDrop={(e) => {
                      if (!dragId || dragId === q.id || q.status !== 'active') return
                      e.preventDefault()
                      e.stopPropagation()
                      const id = e.dataTransfer.getData('text/plain') || dragId
                      if (id && id !== q.id) void moveQuestBefore(id, q.id)
                      setOverFrame(null)
                      setOverQuest(null)
                      setDragId(null)
                    }}
                  >
                    {q.status === 'active' && (
                      <span className="drag-grip" title="Drag to reorder or move to another frame">
                        <DotsSixVertical size={16} weight="bold" />
                      </span>
                    )}
                    <div className="quest-main">
                      <div className="quest-title-row">
                        <span className="q-title">{q.title}</span>
                        {isRecurring(q) && (
                          <span
                            className="badge recur"
                            title="Recurring — completing it counts every time; it returns fresh on its next scheduled day"
                          >
<ArrowsClockwise size={11} weight="bold" /> {recurLabel(q)}
                          </span>
                        )}
                        {q.status === 'active' && isResting(q, now) && (
                          <span className="badge muted" title="Not scheduled today — it'll wake up on its next day. No nagging in between.">
                            rests today
                          </span>
                        )}
                        {q.status === 'dropped' && <span className="badge muted">dropped</span>}
                        {q.status === 'completed' && (
                          <span
                            className="badge done"
                            title={
                              isRecurring(q)
                                ? 'Done for today — it comes back fresh on its next scheduled day'
                                : 'Completed — it counts forever'
                            }
                          >
<Check size={11} weight="bold" /> {formatDue(q.completedAt)}
                            {isRecurring(q) && ' · back next day'}
                          </span>
                        )}
                      </div>
                      <div className="quest-meta">
                        <span className="badge" style={{ background: PRIORITY_COLOR[q.priority] }}>
                          {q.priority}
                        </span>
                        <span className="badge" style={{ background: SKIPPABILITY_COLOR[q.skippability] }}>
                          {q.skippability}
                        </span>
                        <span className="badge outline">{q.difficulty}</span>
                        {q.status === 'active' && (
                          <span className="badge bounty" title="XP on completion">
                            <Lightning size={11} weight="fill" /> {questXP(q)} XP
                          </span>
                        )}
                        <span className="meta-dim">{formatMinutes(q.timeEstimateMinutes)}</span>
                        <span className="meta-dim">due {formatDue(q.dueAt)}</span>
                        {q.subTasks.length > 0 && (
                          <span className="meta-dim">
                            {q.subTasks.filter((s) => s.done).length}/{q.subTasks.length} steps
                          </span>
                        )}
                        {(q.rolledOverCount ?? 0) > 0 && (
                          <span className="meta-dim meta-icon" title="Carried over from a previous day">
                            <ArrowsClockwise size={11} weight="bold" /> {q.rolledOverCount}×
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="quest-actions">
                      {q.status === 'active' && (
                        <button
                          className="complete-btn"
                          onClick={() => void completeQuest(q.id)}
                          title="Complete — earn XP"
                        >
<Check size={14} weight="bold" /> Complete
                        </button>
                      )}
                      {q.status === 'completed' && (
                        <button
                          className="ghost"
                          onClick={() => void restoreQuest(q.id)}
                          title="Mis-click? Back to active — this completion's XP is returned (and any realm discovery it charted)"
                        >
<ArrowUUpLeft size={14} weight="bold" /> Restore
                        </button>
                      )}
                      <button className="ghost" onClick={() => openEdit(q)}>
                        Edit
                      </button>
                      {q.status === 'active' && (
                        <button className="ghost" onClick={() => dropQuest(q.id)} title="Abandon — no penalty">
                          Drop
                        </button>
                      )}
                      <button className="ghost danger" onClick={() => deleteQuest(q.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <div className="list-toggles">
        <label className="show-dropped">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show completed quests <Trophy size={13} weight="fill" color="var(--gold)" />
        </label>
        <label className="show-dropped">
          <input type="checkbox" checked={showDropped} onChange={(e) => setShowDropped(e.target.checked)} />
          Show dropped quests
        </label>
      </div>

      {showForm && (
        <QuestForm
          timeFrames={frames}
          initial={editing}
          defaultTimeFrameId={activeFrameId ?? frames[0]?.id ?? ''}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
