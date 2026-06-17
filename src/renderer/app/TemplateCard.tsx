import type { QuestTemplate } from '@shared/types'
import { DotsSixVertical, Plus, Clock, ListChecks, PencilSimple, Trash } from '@phosphor-icons/react'
import { IMPORTANCE_COLOR, URGENCY_COLOR } from './options'
import { formatMinutes } from '@shared/format'

/** Distinct drag payload key for templates — checked BEFORE the quest-move
 *  ('text/plain') logic so a template drop can never be mis-read as a reorder. */
export const TEMPLATE_DRAG_MIME = 'application/x-questday-template'

interface Props {
  template: QuestTemplate
  /** Tap "+ Add to today" → open the pre-filled New Quest form. */
  onAdd: () => void
  onEdit: () => void
  onDelete: () => void
}

/** One Library card: a quest blueprint. Draggable onto a time frame, and the
 *  badges reuse the live-quest colour maps so it reads as native QuestDay. */
export function TemplateCard({ template: t, onAdd, onEdit, onDelete }: Props): JSX.Element {
  const stepCount = t.subTasks.length
  return (
    <div
      className="tpl-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TEMPLATE_DRAG_MIME, t.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="tpl-top">
        <span className="tpl-grip" title="Drag onto a time frame to add it">
          <DotsSixVertical size={16} weight="bold" />
        </span>
        <div className="tpl-titlewrap">
          <div className="tpl-title">{t.title}</div>
          <div className="tpl-steps">
            <ListChecks size={12} weight="bold" /> {stepCount} {stepCount === 1 ? 'step' : 'steps'}
          </div>
        </div>
      </div>

      <div className="tpl-badges">
        <span className="badge" style={{ background: IMPORTANCE_COLOR[t.importance] }}>
          {t.importance}
        </span>
        <span className="badge" style={{ background: URGENCY_COLOR[t.urgency] }}>
          {t.urgency}
        </span>
        <span className="badge outline">{t.difficulty}</span>
      </div>

      <div className="tpl-foot">
        <span className="tpl-time">
          <Clock size={13} weight="bold" /> {formatMinutes(t.timeEstimateMinutes)}
        </span>
        <button className="tpl-add" onClick={onAdd} title="Add this to today (pick a frame)">
          <Plus size={13} weight="bold" /> Add to today
        </button>
      </div>

      {/* Edit/Delete reveal on hover so the card stays clean at rest (the
          approved mockup look); functionally required by the spec. */}
      <div className="tpl-actions">
        <button className="ghost sm" onClick={onEdit} title="Edit this template">
          <PencilSimple size={12} weight="bold" /> Edit
        </button>
        <button className="ghost sm danger" onClick={onDelete} title="Delete this template">
          <Trash size={12} weight="bold" /> Delete
        </button>
      </div>
    </div>
  )
}
