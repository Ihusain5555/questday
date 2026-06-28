import { useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import {
  activeTimeFrame,
  resolveCurrentQuest,
  immediateSubTask
} from '@shared/engine/selectCurrentQuest'
import { effectiveTimeFrames } from '@shared/engine/prayerFrames'
import { RealmPeek } from './RealmView'
import { StatsView } from './StatsView'
import { WeeklyReviewCard } from './WeeklyReviewCard'
import { EndOfDayCard } from './EndOfDayCard'
import { PlayerBar } from '../components/PlayerBar'
import { isFeatureEnabled } from './features'
import { questXP } from '@shared/engine/rewards'
import { totalCompletions, activeDaysAllTime } from '@shared/engine/stats'
import { ShareCardModal } from './ShareCardModal'
import { Lightning, Check, AppWindow, ShareNetwork } from '@phosphor-icons/react'

export function Dashboard(): JSX.Element {
  const { db, completeQuest } = useStore()

  const now = useNow(20000)
  const [sharingJourney, setSharingJourney] = useState(false)
  if (!db) return <div>Loading…</div>

  const frames = effectiveTimeFrames(db.timeFrames, db.settings, now)
  const frame = activeTimeFrame(frames, now)
  const current = resolveCurrentQuest(db.quests, frames, now, db.settings.pinnedQuestId)
  const sub = immediateSubTask(current)
  const activeCount = db.quests.filter((q) => q.status === 'active').length

  // All-time "journey" snapshot for the share studio (derived, never stored → ↩ Restore-exact;
  // bestStreak comes from the inert garden engine, which still tracks it silently).
  const journeyData = {
    kind: 'journey' as const,
    completionsTotal: totalCompletions(db.quests),
    level: db.player.level,
    streak: db.player.streakCount,
    bestStreak: Math.max(db.garden.bestStreak, db.player.streakCount),
    daysActive: activeDaysAllTime(db.quests)
  }

  return (
    <div>
      <PlayerBar player={db.player} activeCount={activeCount} />

      <div className="card current-quest-card">
        <div className="cq-head">
          <div className="label">Current quest · {frame ? frame.name : 'no active frame'}</div>
          <button
            className="ghost cq-show-widget"
            title={
              db.settings.widgetVisible
                ? 'Hide the always-on-top widget'
                : 'Reopen the always-on-top widget'
            }
            onClick={() =>
              void (db.settings.widgetVisible
                ? window.questday.widget.hide()
                : window.questday.widget.show())
            }
          >
            <AppWindow size={15} weight="bold" /> {db.settings.widgetVisible ? 'Hide widget' : 'Show widget'}
          </button>
        </div>
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

      {isFeatureEnabled(db.settings.enabledFeatures, 'endOfDayNote') && <EndOfDayCard />}

      <div className="dash-stats">
        <StatsView />
      </div>

      <div className="dash-journey-share">
        <button className="ghost" onClick={() => setSharingJourney(true)}>
          <ShareNetwork size={16} weight="bold" /> Share my journey
        </button>
      </div>

      {sharingJourney && (
        <ShareCardModal data={journeyData} onClose={() => setSharingJourney(false)} />
      )}
    </div>
  )
}
