import type { Database, Quest } from '@shared/types'
import { rankCandidates } from '@shared/engine/selectCurrentQuest'
import { effectiveTimeFrames } from '@shared/engine/prayerFrames'
import { useStore } from '../state/store'
import { IMPORTANCE_COLOR } from '../app/options'
import { formatMinutes } from '@shared/format'
import { PushPin } from '@phosphor-icons/react'

interface Props {
  db: Database
  now: Date
  currentId: string | null
}

/** Full quest list grouped by time frame, shown when the widget is expanded. Tapping a
 *  quest in the ACTIVE frame "pins" it as the current quest (click-to-switch, v1.13);
 *  tapping the pinned one again returns to the automatic pick. Quests in other frames
 *  aren't tappable — a pin only takes effect within the active frame. */
export function WidgetList({ db, now, currentId }: Props): JSX.Element {
  const pinQuest = useStore((s) => s.pinQuest)
  const pinnedId = db.settings.pinnedQuestId ?? null
  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)
  // Resolve prayer-anchored windows so the "active now" frame is detected correctly (v2).
  const eframes = effectiveTimeFrames(db.timeFrames, db.settings, now)
  const activeFrameId = rankCandidates(db.quests, eframes, now)[0]?.quest.timeFrameId ?? null

  // For the active frame, order by selection score so the spotlight quest leads.
  const rankedActive = rankCandidates(db.quests, eframes, now).map((r) => r.quest)

  return (
    <div className="wlist">
      {frames.map((frame) => {
        const isActive = frame.id === activeFrameId
        const quests: Quest[] = isActive
          ? rankedActive
          : db.quests
              .filter((q) => q.timeFrameId === frame.id && q.status === 'active')
              .sort((a, b) => a.sortOrder - b.sortOrder)
        return (
          <div className="wlist-frame" key={frame.id}>
            <div className="wlist-frame-head">
              {frame.name}
              {isActive && <span className="dot-now" title="active now" />}
            </div>
            {quests.length === 0 ? (
              <div className="wlist-empty">—</div>
            ) : (
              quests.map((q) => {
                const isCurrent = q.id === currentId
                const isPinned = q.id === pinnedId
                const dot = <span className="pri-dot" style={{ background: IMPORTANCE_COLOR[q.importance] }} />
                const title = <span className="wlist-title">{q.title}</span>
                const est = <span className="wlist-est">{formatMinutes(q.timeEstimateMinutes)}</span>
                // Only the active frame is tappable — pinning a quest in another frame
                // would have no effect (a pin is honored only within the active frame).
                if (!isActive) {
                  return (
                    <div className="wlist-item" key={q.id}>
                      {dot}
                      {title}
                      {est}
                    </div>
                  )
                }
                return (
                  <button
                    className={`wlist-item clickable${isCurrent ? ' current' : ''}${isPinned ? ' pinned' : ''}`}
                    key={q.id}
                    title={isPinned ? 'Tap to return to the automatic pick' : 'Make this the current quest'}
                    onClick={() => void pinQuest(isPinned ? null : q.id)}
                  >
                    {dot}
                    {title}
                    {isPinned && <PushPin size={11} weight="fill" className="wlist-pin" />}
                    {est}
                  </button>
                )
              })
            )}
          </div>
        )
      })}
    </div>
  )
}
