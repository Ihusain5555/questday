import { useState } from 'react'
import type { QuestTemplate } from '@shared/types'
import { Books, CaretLeft, Plus, ArrowRight } from '@phosphor-icons/react'
import { TemplateCard } from './TemplateCard'

interface Props {
  templates: QuestTemplate[]
  onNewTemplate: () => void
  onAddToToday: (t: QuestTemplate) => void
  onEditTemplate: (t: QuestTemplate) => void
  onDeleteTemplate: (t: QuestTemplate) => void
}

/** The collapsible Quest Library side rail, mounted inside the Quests tab. One
 *  DOM structure toggled by a `collapsed` class so width animates smoothly (CSS
 *  hides the inner parts and reveals a vertical "Library" label when collapsed). */
export function QuestLibraryRail({
  templates,
  onNewTemplate,
  onAddToToday,
  onEditTemplate,
  onDeleteTemplate
}: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  // Newest-created first (spec §10).
  const sorted = [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <aside className={`library-rail ${collapsed ? 'collapsed' : ''}`}>
      <div className="rail-header">
        <div className="rail-title">
          <Books size={18} weight="fill" /> Library
          {sorted.length > 0 && <span className="rail-count">{sorted.length}</span>}
        </div>
        <button
          className="rail-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand Library' : 'Collapse Library'}
          aria-label={collapsed ? 'Expand Library' : 'Collapse Library'}
        >
          <CaretLeft size={16} weight="bold" className="rail-chevron" />
        </button>
        {/* Shown only when collapsed (CSS) */}
        <div className="rail-vertical">
          <Books size={18} weight="fill" /> Library
        </div>
      </div>

      <div className="rail-sub">
        <button className="rail-newbtn" onClick={onNewTemplate}>
          <Plus size={15} weight="bold" /> New template
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="rail-hint">
          <ArrowRight size={14} weight="bold" /> Tap <b>+ Add</b> or drag a card onto a time frame
        </div>
      )}

      <div className="rail-cards">
        {sorted.length === 0 ? (
          <div className="rail-empty">
            <p className="rail-empty-title">No saved templates yet</p>
            <p className="meta-dim">
              Build one with <b>+ New template</b>, or use <b>Save as template</b> on any quest to
              reuse it later.
            </p>
          </div>
        ) : (
          sorted.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onAdd={() => onAddToToday(t)}
              onEdit={() => onEditTemplate(t)}
              onDelete={() => onDeleteTemplate(t)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
