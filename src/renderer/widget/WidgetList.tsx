import type { Database, Quest } from '@shared/types'
import { rankCandidates } from '@shared/engine/selectCurrentQuest'
import { PRIORITY_COLOR } from '../app/options'
import { formatMinutes } from '@shared/format'

interface Props {
  db: Database
  now: Date
  currentId: string | null
}

/** Full quest list grouped by time frame, shown when the widget is expanded. */
export function WidgetList({ db, now, currentId }: Props): JSX.Element {
  const frames = [...db.timeFrames].sort((a, b) => a.order - b.order)
  const activeFrameId = rankCandidates(db.quests, db.timeFrames, now)[0]?.quest.timeFrameId ?? null

  // For the active frame, order by selection score so the spotlight quest leads.
  const rankedActive = rankCandidates(db.quests, db.timeFrames, now).map((r) => r.quest)

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
              quests.map((q) => (
                <div className={`wlist-item ${q.id === currentId ? 'current' : ''}`} key={q.id}>
                  <span className="pri-dot" style={{ background: PRIORITY_COLOR[q.priority] }} />
                  <span className="wlist-title">{q.title}</span>
                  <span className="wlist-est">{formatMinutes(q.timeEstimateMinutes)}</span>
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
