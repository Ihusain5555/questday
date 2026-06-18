import { useEffect, useState } from 'react'
import type { Quest, QuestTemplate } from '@shared/types'
import { useStore, type QuestInput, FAITH_PRAYER_TITLES, FAITH_QURAN_TITLE } from '../state/store'
import { useNow } from '../hooks/useNow'
import { QuestForm, type QuestFormInitial } from './QuestForm'
import { QuestLibraryRail } from './QuestLibraryRail'
import { TEMPLATE_DRAG_MIME } from './TemplateCard'
import { IMPORTANCE_COLOR, URGENCY_COLOR } from './options'
import { isFeatureEnabled } from './features'
import { formatDue, formatMinutes } from '@shared/format'
import { activeTimeFrame, isSnoozed } from '@shared/engine/selectCurrentQuest'
import { questXP } from '@shared/engine/rewards'
import { isRecurring, isResting, recurLabel, ymdOf } from '@shared/engine/recurrence'
import {
  Lightning,
  Check,
  ArrowsClockwise,
  ArrowUUpLeft,
  Trophy,
  DotsSixVertical,
  FloppyDisk,
  Copy,
  Clock,
  Mosque,
  PencilSimple,
  Archive,
  X
} from '@phosphor-icons/react'

export function QuestsView(): JSX.Element {
  const {
    db,
    createQuest,
    updateQuest,
    deleteQuest,
    duplicateQuest,
    snoozeQuest,
    unsnoozeQuest,
    dropQuest,
    completeQuest,
    restoreQuest,
    moveQuestToFrame,
    moveQuestBefore,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    saveQuestAsTemplate,
    addFaithChecklist
  } = useStore()
  const now = useNow(20000)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Quest | null>(null)
  const [showDropped, setShowDropped] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overFrame, setOverFrame] = useState<string | null>(null)
  const [overQuest, setOverQuest] = useState<string | null>(null)
  // Quest Library (v1): the template create/edit form, and the tap-add prefill.
  const [templateForm, setTemplateForm] = useState<{
    mode: 'new' | 'edit'
    template: QuestTemplate | null
  } | null>(null)
  const [tapAddInitial, setTapAddInitial] = useState<QuestFormInitial | null>(null)
  // Snooze (v1.13): which quest's "snooze until…" mini-menu is open (null = none).
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null)
  // Close the snooze mini-menu on any outside click (the .snooze-wrap stops propagation
  // so clicks on the button/menu don't self-close before their handlers run).
  useEffect(() => {
    if (!snoozeFor) return
    const close = (): void => setSnoozeFor(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [snoozeFor])

  const activeFrameId = db ? activeTimeFrame(db.timeFrames, now)?.id ?? null : null

  if (!db) return <div>Loading…</div>

  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)
  const libraryOn = isFeatureEnabled(db.settings.enabledFeatures, 'questLibrary')
  // Salah & Qur'an checklist (opt-in, off by default). When on, a calm setup card
  // sits atop the Quests tab; once the preset quests exist it flips to a quiet note.
  const faithOn = isFeatureEnabled(db.settings.enabledFeatures, 'faithChecklist')
  const faithTitles = new Set<string>([...FAITH_PRAYER_TITLES, FAITH_QURAN_TITLE])
  const faithAdded = db.quests.some((q) => faithTitles.has(q.title))
  // Prayer times need a location; until one is set the card guides the user to Settings.
  const prayerLocationSet = db.settings.prayerTimes?.lat != null

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

  // Snooze a quest until a friendly preset time. Non-punitive: it only hides the quest
  // from the spotlight until then — it's still listed (dimmed) and returns on its own.
  const doSnooze = (id: string, kind: 'hour' | 'evening' | 'tomorrow') => {
    const base = new Date()
    let until: Date
    if (kind === 'hour') {
      until = new Date(base.getTime() + 60 * 60 * 1000)
    } else if (kind === 'evening') {
      until = new Date(base)
      until.setHours(18, 0, 0, 0)
      if (until.getTime() <= base.getTime()) until.setDate(until.getDate() + 1)
    } else {
      until = new Date(base)
      until.setDate(until.getDate() + 1)
      until.setHours(9, 0, 0, 0)
    }
    void snoozeQuest(id, until.toISOString())
    setSnoozeFor(null)
  }

  // ---- Quest Library handlers ----
  const openNewTemplate = () => setTemplateForm({ mode: 'new', template: null })
  const openEditTemplate = (t: QuestTemplate) => setTemplateForm({ mode: 'edit', template: t })
  const handleTemplateSave = async (input: QuestInput) => {
    if (templateForm?.mode === 'edit' && templateForm.template)
      await updateTemplate(templateForm.template.id, input)
    else await createTemplate(input)
    setTemplateForm(null)
  }
  /** Tap "+ Add to today": open the normal quest form pre-filled from the template
   *  (scheduling fields shown so the user picks a frame + due date). */
  const openTapAdd = (t: QuestTemplate) =>
    setTapAddInitial({
      title: t.title,
      difficulty: t.difficulty,
      importance: t.importance,
      urgency: t.urgency,
      timeEstimateMinutes: t.timeEstimateMinutes,
      subTasks: t.subTasks
    })
  const handleTapAddSave = async (input: QuestInput) => {
    await createQuest(input)
    setTapAddInitial(null)
  }
  /** Drag a template card onto a frame: instant create in that frame, no due date. */
  const addTemplateToFrame = (templateId: string, frameId: string) => {
    const t = db.questTemplates.find((x) => x.id === templateId)
    if (!t) return
    void createQuest({
      title: t.title,
      difficulty: t.difficulty,
      importance: t.importance,
      urgency: t.urgency,
      timeEstimateMinutes: t.timeEstimateMinutes,
      subTasks: t.subTasks.map((s) => ({ title: s.title, timeEstimateMinutes: s.timeEstimateMinutes })),
      dueAt: null,
      timeFrameId: frameId,
      recurDays: []
    })
  }

  return (
    <div className={libraryOn ? 'quests-layout' : undefined}>
      {libraryOn && (
        <QuestLibraryRail
          templates={db.questTemplates}
          onNewTemplate={openNewTemplate}
          onAddToToday={openTapAdd}
          onEditTemplate={openEditTemplate}
          onDeleteTemplate={(t) => void deleteTemplate(t.id)}
        />
      )}

      <div className={libraryOn ? 'quests-main' : undefined}>
        <div className="view-head">
          <h2>Quests</h2>
          <button className="primary" onClick={openNew}>
            + New quest
          </button>
        </div>

        {faithOn && (
          <div className="card faith-card">
            <div className="faith-card-icon">
              <Mosque size={24} weight="fill" />
            </div>
            <div className="faith-card-body">
              {faithAdded ? (
                <>
                  <strong>Prayer &amp; Qur’an quests</strong>
                  <p>Added. Your five prayers return each day at their times, ready and unticked.</p>
                  <p className="faith-hint">
                    Keep the prayer names as they are — renaming one stops its time from updating
                    automatically each day.
                  </p>
                </>
              ) : !prayerLocationSet ? (
                <>
                  <strong>Your daily prayer quests</strong>
                  <p>
                    Set your city first so prayer times are accurate for where you are — everything
                    is computed on your device, nothing leaves it.
                  </p>
                  <p className="faith-hint">
                    Open the <strong>Data</strong> tab (the gear, far right) → under “Productivity
                    features” find “Salah &amp; Qur’an” → pick your city, then come back here.
                  </p>
                </>
              ) : (
                <>
                  <strong>Your daily prayer &amp; Qur’an quests</strong>
                  <p>
                    Add the five daily prayers — Fajr, Dhuhr, Asr, Maghrib, Isha — each due at its
                    time for your city, plus an optional Qur’an reading. Miss one and it simply rests
                    and returns tomorrow — never a mark against you.
                  </p>
                  <button className="primary" onClick={() => void addFaithChecklist()}>
                    Add to my quests
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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
          // Capacity bar (calm): planned load of ACTIVE, non-resting quests vs the
          // frame's length. Soft amber near/over full — never red, never a failure.
          const activeInFrame = db.quests.filter(
            (q) => q.timeFrameId === frame.id && q.status === 'active' && !isResting(q, now)
          )
          const usedMin = activeInFrame.reduce((m, q) => m + q.timeEstimateMinutes, 0)
          const frameMin = (((frame.endMinute - frame.startMinute) % 1440) + 1440) % 1440 || 1440
          const capPct = usedMin / frameMin
          // overFrame is set for BOTH quest drags and template drags (the
          // onDragOver below), so the highlight works for either.
          const isDropTarget = overFrame === frame.id
          return (
            <div
              className={`card ${isDropTarget ? 'drop-over' : ''}`}
              key={frame.id}
              onDragOver={(e) => {
                // Accept quest moves (dragId set) AND template drags (distinct
                // MIME, no dragId). Must preventDefault for the drop to fire.
                const isTpl = e.dataTransfer.types.includes(TEMPLATE_DRAG_MIME)
                if (!dragId && !isTpl) return
                e.preventDefault()
                e.dataTransfer.dropEffect = isTpl ? 'copy' : 'move'
                if (overFrame !== frame.id) setOverFrame(frame.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                // Template drop (distinct MIME) takes precedence and is never
                // mis-read as a quest move.
                const templateId = e.dataTransfer.getData(TEMPLATE_DRAG_MIME)
                if (templateId) {
                  addTemplateToFrame(templateId, frame.id)
                  setOverFrame(null)
                  setOverQuest(null)
                  return
                }
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

              {usedMin > 0 && (
                <div className="capacity" title="Each quest's planned time, as a slice of this frame — just a calm heads-up, never a limit">
                  <div className={`capacity-track ${capPct > 0.9 ? 'full' : ''}`}>
                    {[...activeInFrame]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((q, i) => (
                        <div
                          key={q.id}
                          className={`capacity-seg s${i % 5}`}
                          style={{
                            width: `${(q.timeEstimateMinutes / Math.max(frameMin, usedMin)) * 100}%`
                          }}
                          title={`${q.title} · ${formatMinutes(q.timeEstimateMinutes)}`}
                        />
                      ))}
                    {usedMin > frameMin && (
                      <div className="capacity-over" style={{ left: `${(frameMin / usedMin) * 100}%` }} />
                    )}
                  </div>
                  <span className="capacity-label">
                    {formatMinutes(usedMin)} planned · {Math.round(capPct * 100)}% of this frame
                  </span>
                </div>
              )}

              {quests.length === 0 ? (
                <div className="empty">No quests in this frame yet.</div>
              ) : (
                <ul className="quest-list">
                  {quests.map((q) => (
                    <li
                      className={`quest-row ${q.status} ${dragId === q.id ? 'dragging' : ''} ${
                        dragId && dragId !== q.id && overQuest === q.id ? 'drop-before' : ''
                      } ${q.status === 'active' && isResting(q, now) ? 'resting' : ''} ${
                        q.status === 'active' && isSnoozed(q, now) ? 'snoozed' : ''
                      }`}
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
                          {q.status === 'active' && isSnoozed(q, now) && (
                            <span
                              className="badge muted"
                              title="Snoozed — tucked away; it returns to your spotlight at this time, on its own. No penalty."
                            >
                              <Clock size={11} weight="bold" /> snoozed · {formatDue(q.snoozedUntil ?? null)}
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
                          <span className="badge" style={{ background: IMPORTANCE_COLOR[q.importance] }}>
                            {q.importance}
                          </span>
                          <span className="badge" style={{ background: URGENCY_COLOR[q.urgency] }}>
                            {q.urgency}
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
                        {q.notes && <div className="quest-notes">{q.notes}</div>}
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
                        {libraryOn && (
                          <button
                            className="ghost icon-btn"
                            aria-label="Save as template"
                            onClick={() => void saveQuestAsTemplate(q.id)}
                            title="Save as a reusable template (title, steps & badges — never its due date)"
                          >
                            <FloppyDisk size={16} weight="bold" />
                          </button>
                        )}
                        <button
                          className="ghost icon-btn"
                          aria-label="Edit"
                          title="Edit"
                          onClick={() => openEdit(q)}
                        >
                          <PencilSimple size={16} weight="bold" />
                        </button>
                        <button
                          className="ghost icon-btn"
                          aria-label="Duplicate"
                          onClick={() => void duplicateQuest(q.id)}
                          title="Duplicate as a fresh active quest"
                        >
                          <Copy size={16} weight="bold" />
                        </button>
                        {q.status === 'active' && !isSnoozed(q, now) && (
                          <div className="snooze-wrap" onMouseDown={(e) => e.stopPropagation()}>
                            <button
                              className="ghost icon-btn"
                              aria-label="Snooze"
                              title="Snooze — tuck away until later (it returns on its own, no penalty)"
                              onClick={() => setSnoozeFor(snoozeFor === q.id ? null : q.id)}
                            >
                              <Clock size={16} weight="bold" />
                            </button>
                            {snoozeFor === q.id && (
                              <div className="snooze-menu" role="menu">
                                <button type="button" onClick={() => doSnooze(q.id, 'hour')}>
                                  In 1 hour
                                </button>
                                <button type="button" onClick={() => doSnooze(q.id, 'evening')}>
                                  This evening
                                </button>
                                <button type="button" onClick={() => doSnooze(q.id, 'tomorrow')}>
                                  Tomorrow
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {q.status === 'active' && isSnoozed(q, now) && (
                          <button
                            className="ghost icon-btn"
                            aria-label="Wake"
                            title="Wake now — return it to your spotlight"
                            onClick={() => void unsnoozeQuest(q.id)}
                          >
                            <ArrowUUpLeft size={16} weight="bold" />
                          </button>
                        )}
                        {q.status === 'active' && (
                          <button
                            className="ghost icon-btn"
                            aria-label="Drop"
                            onClick={() => dropQuest(q.id)}
                            title="Drop — set aside, no penalty"
                          >
                            <Archive size={16} weight="bold" />
                          </button>
                        )}
                        <button
                          className="ghost icon-btn danger"
                          aria-label="Delete"
                          title="Delete"
                          onClick={() => void deleteQuest(q.id)}
                        >
                          <X size={16} weight="bold" />
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

      {templateForm && (
        <QuestForm
          timeFrames={frames}
          initial={templateForm.template}
          defaultTimeFrameId={activeFrameId ?? frames[0]?.id ?? ''}
          hideScheduling
          onSave={handleTemplateSave}
          onCancel={() => setTemplateForm(null)}
        />
      )}

      {tapAddInitial && (
        <QuestForm
          timeFrames={frames}
          initial={tapAddInitial}
          defaultTimeFrameId={activeFrameId ?? frames[0]?.id ?? ''}
          isEdit={false}
          onSave={handleTapAddSave}
          onCancel={() => setTapAddInitial(null)}
        />
      )}
    </div>
  )
}
