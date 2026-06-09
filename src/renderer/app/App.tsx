import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { Dashboard } from './Dashboard'
import { QuestsView } from './QuestsView'
import { TimeFramesView } from './TimeFramesView'
import { FocusView } from './FocusView'
import { EisenhowerView } from './EisenhowerView'
import { ActiveModeSettings } from './ActiveModeSettings'
import { GardenView } from './GardenView'
import { ArcadeView } from './arcade/ArcadeView'
import { StatsView } from './StatsView'
import { DataView } from './DataView'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { RolloverBanner } from './RolloverBanner'
import { PastDueReview } from './PastDueReview'
import { ymd, encouragementMessage } from '@shared/engine/rollover'
import { isCoreTab, isFeatureEnabled } from './features'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import {
  Crown,
  Sword,
  Hourglass,
  Timer,
  Compass,
  Plant,
  GameController,
  ChartBar,
  Target,
  FloppyDisk
} from '@phosphor-icons/react'

type Tab = 'dashboard' | 'quests' | 'frames' | 'focus' | 'matrix' | 'world' | 'arcade' | 'stats' | 'active' | 'data'

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Crown size={16} weight="fill" /> },
  { id: 'quests', label: 'Quests', icon: <Sword size={16} weight="fill" /> },
  { id: 'frames', label: 'Time frames', icon: <Hourglass size={16} weight="fill" /> },
  { id: 'focus', label: 'Focus', icon: <Timer size={16} weight="fill" /> },
  { id: 'matrix', label: 'Matrix', icon: <Compass size={16} weight="fill" /> },
  { id: 'world', label: 'World', icon: <Plant size={16} weight="fill" /> },
  { id: 'arcade', label: 'Arcade', icon: <GameController size={16} weight="fill" /> },
  { id: 'stats', label: 'Stats', icon: <ChartBar size={16} weight="fill" /> },
  { id: 'active', label: 'Active mode', icon: <Target size={16} weight="fill" /> },
  { id: 'data', label: 'Data', icon: <FloppyDisk size={16} weight="fill" /> }
]

export function App(): JSX.Element {
  const { db, loading, connected, connect, runDayChange } = useStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [rolloverMsg, setRolloverMsg] = useState<string | null>(null)
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)

  const now = useNow(30000)
  const todayKey = ymd(now)
  const processedFor = useRef<string | null>(null)

  useEffect(() => {
    void connect()
  }, [connect])

  // Run rollover once data is loaded, and again whenever the calendar day
  // changes while the app stays open (midnight crossing). Gate on `loading` so
  // we don't fire before the store's db is populated.
  useEffect(() => {
    if (!connected || loading) return
    if (processedFor.current === todayKey) return
    processedFor.current = todayKey
    void (async () => {
      const change = await runDayChange()
      if (!change) return
      if (!change.firstRun && change.carried.length > 0) {
        setRolloverMsg(encouragementMessage(change.carried.length, new Date()))
      }
      if (change.needsReview.length > 0) {
        setReviewIds(change.needsReview.map((q) => q.id))
      }
    })()
  }, [connected, loading, todayKey, runDayChange])

  // Hide toggled-off productivity features (core tabs are always shown). If the
  // open tab gets hidden, fall back to the Dashboard.
  const enabledFeatures = db?.settings.enabledFeatures
  const visibleTabs = TABS.filter((t) => isCoreTab(t.id) || isFeatureEnabled(enabledFeatures, t.id))
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) setTab('dashboard')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, enabledFeatures])

  if (loading) return <div className="app">Loading…</div>

  return (
    <MotionConfig reducedMotion="user">
      <div className="titlebar">
        <span className="titlebar-brand">
          <Crown size={15} weight="fill" /> QuestDay
        </span>
        <span className="titlebar-version">v{__APP_VERSION__}</span>
      </div>
      <div className="app">
      {rolloverMsg && <RolloverBanner message={rolloverMsg} onClose={() => setRolloverMsg(null)} />}

      <nav className="tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'quests' && <QuestsView />}
            {tab === 'frames' && <TimeFramesView />}
            {tab === 'focus' && <FocusView />}
            {tab === 'matrix' && <EisenhowerView />}
            {tab === 'world' && <GardenView />}
            {tab === 'arcade' && <ArcadeView />}
            {tab === 'stats' && <StatsView />}
            {tab === 'active' && <ActiveModeSettings />}
            {tab === 'data' && <DataView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {reviewIds && reviewIds.length > 0 && (
        <PastDueReview initialIds={reviewIds} onClose={() => setReviewIds(null)} />
      )}

      <CompletionCelebration />
    </div>
    </MotionConfig>
  )
}
