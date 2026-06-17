import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { Dashboard } from './Dashboard'
import { QuestsView } from './QuestsView'
import { TimeFramesView } from './TimeFramesView'
import { ProductivityView } from './ProductivityView'
import { RealmView } from './RealmView'
import { ArcadeView } from './arcade/ArcadeView'
import { DataView } from './DataView'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { SaveErrorToast } from '../components/SaveErrorToast'
import { RolloverBanner } from './RolloverBanner'
import { PastDueReview } from './PastDueReview'
import { ymd, encouragementMessage } from '@shared/engine/rollover'
import { isCoreTab, isFeatureEnabled } from './features'
import { IS_MAC } from '../platform'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import {
  Crown,
  Sword,
  Hourglass,
  Hammer,
  MapTrifold,
  GameController,
  Gear
} from '@phosphor-icons/react'

type Tab = 'dashboard' | 'quests' | 'frames' | 'productivity' | 'world' | 'arcade' | 'data'

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Crown size={16} weight="fill" /> },
  { id: 'quests', label: 'Quests', icon: <Sword size={16} weight="fill" /> },
  { id: 'frames', label: 'Time frames', icon: <Hourglass size={16} weight="fill" /> },
  { id: 'productivity', label: 'Forge', icon: <Hammer size={16} weight="fill" /> },
  { id: 'world', label: 'Realm', icon: <MapTrifold size={16} weight="fill" /> },
  { id: 'arcade', label: 'Arcade', icon: <GameController size={16} weight="fill" /> },
  { id: 'data', label: 'Data', icon: <Gear size={16} weight="fill" /> }
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

  // macOS draws the traffic-light buttons over the window's top-left; tag <body>
  // so CSS can pad the custom title bar clear of them. No-op on Windows.
  useEffect(() => {
    if (IS_MAC) document.body.classList.add('platform-darwin')
  }, [])

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
            className={`tab ${tab === t.id ? 'on' : ''} ${t.id === 'data' ? 'gear-tab' : ''}`}
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
            {/* Per-tab boundary (keyed by tab so it clears on navigation): one
                view's render crash shows a recovery card, the rest stay usable. */}
            <ErrorBoundary key={tab} label="this view">
              {tab === 'dashboard' && <Dashboard />}
              {tab === 'quests' && <QuestsView />}
              {tab === 'frames' && <TimeFramesView />}
              {tab === 'productivity' && <ProductivityView />}
              {tab === 'world' && <RealmView />}
              {tab === 'arcade' && <ArcadeView />}
              {tab === 'data' && <DataView />}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {reviewIds && reviewIds.length > 0 && (
        <PastDueReview initialIds={reviewIds} onClose={() => setReviewIds(null)} />
      )}

      <CompletionCelebration />
      <SaveErrorToast />
    </div>
    </MotionConfig>
  )
}
