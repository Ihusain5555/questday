import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import {
  activeTimeFrame,
  selectCurrentQuest,
  immediateSubTask
} from '@shared/engine/selectCurrentQuest'
import { RealmPeek } from './RealmView'
import { StatsView } from './StatsView'
import { WeeklyReviewCard } from './WeeklyReviewCard'
import { PlayerBar } from '../components/PlayerBar'
import { isFeatureEnabled } from './features'
import { questXP } from '@shared/engine/rewards'
import { Lightning, Check } from '@phosphor-icons/react'

export function Dashboard(): JSX.Element {
  const { db, completeQuest } = useStore()

  const now = useNow(20000)
  if (!db) return <div>Loading…</div>

  const frame = activeTimeFrame(db.timeFrames, now)
  const current = selectCurrentQuest(db.quests, db.timeFrames, now)
  const sub = immediateSubTask(current)
  const activeCount = db.quests.filter((q) => q.status === 'active').length

  return (
    <div>
      <PlayerBar player={db.player} activeCount={activeCount} />

      <div className="card current-quest-card">
        <div className="label">Current quest · {frame ? frame.name : 'no active frame'}</div>
        {current ? (
          <>
            <div className="cq-title">{current.title}</div>
            <div className="cq-sub">{sub ? `→ ${sub.title}` : 'No sub-tasks — just do it!'}</div>
            <div className="cq-bounty" title="Reward on completion (streak bonus may add more)">
              <span className="bounty-label">Bounty</span>
              <span className="bounty-amt">
                <Lightning size={15} weight="fill" /> {questXP(current)} XP
              </span>
            </div>
            <button className="primary cq-complete" onClick={() => void completeQuest(current.id)}>
              <Check size={17} weight="bold" /> Complete quest
            </button>
          </>
        ) : (
          <div className="empty">
            {frame
              ? 'Nothing queued in this frame. Add a quest to get going. ✨'
              : 'No time frame is active right now — set up your frames in the Time frames tab.'}
          </div>
        )}
      </div>

      <RealmPeek />

      {isFeatureEnabled(db.settings.enabledFeatures, 'weeklyReview') && <WeeklyReviewCard />}

      <div className="dash-stats">
        <StatsView />
      </div>
    </div>
  )
}
