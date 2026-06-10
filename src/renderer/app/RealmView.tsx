import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../state/store'
import { balance } from '@shared/config/balance'
import { totalCompletions } from '@shared/engine/stats'
import { realmProgress, claimableNow, chartedRegionIds } from '@shared/engine/realm'
import { chronicleTopics, topicById, entryById, type ChronicleEntry } from '@shared/config/chronicle'
import type { ChronicleRecord } from '@shared/types'
import { MapTrifold, Flag, Planet, Leaf, Scroll, Feather, Sparkle, X, type Icon } from '@phosphor-icons/react'

// The reward artifact: a fantasy realm charted YOUR way. Each completed quest
// earns one expedition; you spend it by charting a region AND choosing what to
// learn — your expedition "returns with" a knowledge entry (the Chronicle).
// Gains-only; a charted region stays charted. Geometry in balance.realm,
// knowledge in config/chronicle.
const ATLAS = balance.realm.atlases[0]
const VB = balance.realm.viewBox
const LANDS = ['url(#realmLand)', 'url(#realmLandWarm)', 'url(#realmLandDeep)']

/** Chronicle topic icon name -> Phosphor component. */
const TOPIC_ICON: Record<string, Icon> = { Planet, Leaf, Scroll, Feather }

/** A small gold/forest landmark drawn on a charted region (reused mockup art). */
function Landmark({ kind, x, y }: { kind: string; x: number; y: number }): JSX.Element | null {
  switch (kind) {
    case 'keep':
      return (
        <g transform={`translate(${x},${y})`} filter="url(#realmGoldGlow)" fill="#f4d77a">
          <rect x={-13} y={-2} width={26} height={16} rx={1.5} opacity={0.95} />
          <rect x={-13} y={-12} width={5} height={12} />
          <rect x={-3} y={-15} width={6} height={15} />
          <rect x={8} y={-12} width={5} height={12} />
          <path d="M-3 -15 l3 -6 l3 6 z" />
        </g>
      )
    case 'town':
      return (
        <g transform={`translate(${x},${y})`} filter="url(#realmGoldGlow)" fill="#f4d77a">
          <rect x={-11} y={-2} width={22} height={13} rx={1.5} opacity={0.92} />
          <rect x={-11} y={-9} width={4} height={9} />
          <rect x={-1} y={-11} width={4} height={11} />
          <rect x={7} y={-9} width={4} height={9} />
        </g>
      )
    case 'tower':
      return (
        <g transform={`translate(${x},${y})`} filter="url(#realmGoldGlow)" fill="#f4d77a">
          <rect x={-3} y={-14} width={6} height={16} />
          <path d="M-4 -14 l4 -7 l4 7 z" />
        </g>
      )
    case 'mountains':
      return (
        <g transform={`translate(${x},${y})`}>
          <g fill="#11402e" stroke="#0b1a14" strokeWidth={0.8}>
            <path d="M-26 14 l13 -23 l13 23 z" />
            <path d="M-12 14 l12 -18 l12 18 z" />
            <path d="M2 14 l11 -15 l11 15 z" />
          </g>
          <g fill="#f4d77a" opacity={0.85}>
            <path d="M-15 -6 l4 -6 l4 6 z" />
            <path d="M1 -3 l3 -5 l3 5 z" />
          </g>
        </g>
      )
    case 'village':
      return <circle cx={x} cy={y} r={3.6} fill="#f4d77a" filter="url(#realmGoldGlow)" />
    case 'forest':
      return (
        <g transform={`translate(${x},${y})`} fill="#0f4d36" stroke="#0b3a28" strokeWidth={0.8}>
          <path d="M-13 8 l7 -16 l7 16 z" />
          <path d="M-3 10 l7 -18 l7 18 z" />
          <path d="M7 8 l7 -16 l7 16 z" />
        </g>
      )
    default:
      return null
  }
}

/** The realm map SVG — charted regions glow (tap to re-read their discovery);
 *  unexplored regions are fog (tap to chart when expeditions are ready). */
function RealmMap({
  revealed,
  claimable = false,
  onClaim,
  onRead
}: {
  revealed: Set<string>
  claimable?: boolean
  onClaim?: (id: string) => void
  onRead?: (id: string) => void
}): JSX.Element {
  const indexed = ATLAS.regions.map((r, i) => ({ r, i }))
  const fog = indexed.filter((x) => !revealed.has(x.r.id))
  const lit = indexed.filter((x) => revealed.has(x.r.id))
  const canClaim = claimable && !!onClaim
  return (
    <svg
      className="realm-svg"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-label={`A map of ${ATLAS.name}: ${lit.length} of ${indexed.length} regions charted; the rest are unexplored.`}
    >
      <defs>
        <radialGradient id="realmSea" cx="50%" cy="38%" r="80%">
          <stop offset="0%" stopColor="#0f2b21" />
          <stop offset="60%" stopColor="#0b201a" />
          <stop offset="100%" stopColor="#081711" />
        </radialGradient>
        <linearGradient id="realmLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c8a63" />
          <stop offset="55%" stopColor="#1f7a55" />
          <stop offset="100%" stopColor="#155e41" />
        </linearGradient>
        <linearGradient id="realmLandDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#247a57" />
          <stop offset="100%" stopColor="#114c36" />
        </linearGradient>
        <linearGradient id="realmLandWarm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#338e66" />
          <stop offset="100%" stopColor="#19684a" />
        </linearGradient>
        <linearGradient id="realmGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4d77a" />
          <stop offset="100%" stopColor="#b78c34" />
        </linearGradient>
        <radialGradient id="realmVign" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </radialGradient>
        <filter id="realmGoldGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="realmSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={0} y={0} width={VB.w} height={VB.h} fill="url(#realmSea)" />
      <g opacity={0.06} stroke="#3ddc97" strokeWidth={0.6} fill="none">
        <path d="M40 60 q30 -8 60 0 t60 0" />
        <path d="M560 80 q26 -7 52 0 t52 0" />
        <path d="M60 430 q26 -7 52 0 t52 0" />
      </g>

      {/* Unexplored (fog) regions — tappable to chart when expeditions are ready */}
      {fog.map(({ r }) => (
        <g
          key={r.id}
          className={canClaim ? 'realm-region realm-claimable' : 'realm-region'}
          onClick={canClaim ? () => onClaim?.(r.id) : undefined}
        >
          <title>{canClaim ? `Chart ${r.name}` : `${r.name} — unexplored`}</title>
          <path className="realm-fog" d={r.path} />
          <text className="realm-label-fog" x={r.label.x} y={r.label.y}>
            {r.name}
          </text>
        </g>
      ))}

      {/* Charted regions — lit, with a gold border + landmark (tap to re-read) */}
      {lit.map(({ r, i }) => (
        <g
          key={r.id}
          className={onRead ? 'realm-region realm-charted' : 'realm-region'}
          onClick={onRead ? () => onRead(r.id) : undefined}
        >
          {onRead && <title>{`${r.name} — re-read your discovery`}</title>}
          <g filter="url(#realmSoftGlow)">
            <path d={r.path} fill={LANDS[i % LANDS.length]} stroke="url(#realmGold)" strokeWidth={2} />
          </g>
          <Landmark kind={r.landmark.kind} x={r.landmark.x} y={r.landmark.y} />
          <text className="realm-label" x={r.label.x} y={r.label.y}>
            {r.name}
          </text>
        </g>
      ))}

      <g transform="translate(82,392)" opacity={0.95}>
        <circle r={32} fill="none" stroke="#c9a24a" strokeWidth={1} opacity={0.5} />
        <circle r={25} fill="none" stroke="#c9a24a" strokeWidth={0.6} opacity={0.38} />
        <g filter="url(#realmGoldGlow)">
          <path d="M0 -30 L6 0 L0 6 L-6 0 Z" fill="url(#realmGold)" />
          <path d="M0 30 L6 0 L0 -6 L-6 0 Z" fill="#9a7a2e" />
          <path d="M30 0 L0 6 L-6 0 L0 -6 Z" fill="#b78c34" />
          <path d="M-30 0 L0 6 L6 0 L0 -6 Z" fill="#b78c34" />
        </g>
        <text x={0} y={-36} textAnchor="middle" fill="#f4d77a" style={{ fontFamily: 'Georgia, serif', fontSize: 10 }}>
          N
        </text>
      </g>

      <g transform="translate(712,402)" opacity={0.28} stroke="#c9a24a" strokeWidth={1.1} fill="none">
        <path d="M0 0 q10 -12 22 -4 q8 6 2 14 q-6 8 -16 4" />
        <path d="M22 -4 q6 -6 12 -2" />
      </g>

      <g transform="translate(40,42)">
        <rect x={-6} y={-22} width={206} height={34} rx={6} fill="rgba(11,26,20,0.55)" stroke="rgba(201,162,74,0.35)" />
        <text x={98} y={0} textAnchor="middle" fill="#f4d77a" style={{ fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '2px' }}>
          {ATLAS.name.toUpperCase()}
        </text>
      </g>

      <rect x={0} y={0} width={VB.w} height={VB.h} fill="url(#realmVign)" pointerEvents="none" />
    </svg>
  )
}

type Reveal = { topicId: string; picked: string; entry: ChronicleEntry; stage: 'teaser' | 'fact' }

/**
 * The Realm — QuestDay's reward world. Each completed quest earns an expedition;
 * the player charts a region of their choosing and their scouts return with a
 * piece of knowledge they pick. Gains-only (tone rule).
 */
export function RealmView(): JSX.Element {
  const { db, claimRegion, updateSettings } = useStore()
  const [claiming, setClaiming] = useState<{ id: string; name: string } | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [reading, setReading] = useState<ChronicleRecord | null>(null)

  if (!db) return <div />
  const chronicle = db.settings.realmChronicle ?? []
  const completions = totalCompletions(db.quests)
  const revealed = chartedRegionIds(chronicle)
  const claimable = claimableNow(completions, chronicle)
  const prog = realmProgress(chronicle)
  const lastTopic = db.settings.realmLastTopic

  const openClaim = (id: string): void => {
    const region = ATLAS.regions.find((r) => r.id === id)
    if (region) setClaiming({ id, name: region.name })
  }

  const openRead = (id: string): void => {
    const rec = chronicle.find((r) => r.region === id)
    if (rec) setReading(rec)
  }

  // Pick a topic -> choose an unseen entry -> tease, then reveal the fact.
  const pickTopic = (topicId: string): void => {
    const actualId =
      topicId === 'surprise'
        ? chronicleTopics[Math.floor(Math.random() * chronicleTopics.length)].id
        : topicId
    const topic = topicById(actualId)
    if (!topic) return
    const seen = new Set(chronicle.filter((r) => r.topic === actualId).map((r) => r.entry))
    const unseen = topic.entries.filter((e) => !seen.has(e.id))
    const pool = unseen.length ? unseen : topic.entries
    const entry = pool[Math.floor(Math.random() * pool.length)]
    setReveal({ topicId: actualId, picked: topicId, entry, stage: 'teaser' })
    window.setTimeout(() => setReveal((r) => (r ? { ...r, stage: 'fact' } : r)), 1500)
  }

  const commit = (): void => {
    if (claiming && reveal) {
      // Remember the topic they deliberately chose (not "surprise") for quick repeat.
      if (reveal.picked !== 'surprise') void updateSettings({ realmLastTopic: reveal.picked })
      void claimRegion(claiming.id, reveal.topicId, reveal.entry.id)
    }
    setReveal(null)
    setClaiming(null)
  }

  const closeModal = (): void => {
    setReveal(null)
    setClaiming(null)
  }

  return (
    <div className="view realm-view">
      <div className="view-head">
        <h2>
          <MapTrifold size={20} weight="fill" className="realm-title-icon" /> Realm
        </h2>
        <span className="realm-hint">
          {prog.revealedCount} / {prog.total} regions charted
        </span>
      </div>
      <p className="tagline">
        Each quest you finish earns an expedition. Chart any region you like and choose what your
        scouts bring back — your realm and your Chronicle only ever grow.
      </p>

      <div className="realm-frame">
        <div className="realm-topbar">
          <div className="realm-brand">
            <div className="realm-kicker">Realm Atlas</div>
            <div className="realm-atlas-title">{ATLAS.name}</div>
          </div>
          <div className="realm-progress-badge">
            <div className="realm-count">
              {prog.revealedCount} <span className="realm-total">/ {prog.total}</span>
            </div>
            <div className="realm-count-label">Regions charted</div>
          </div>
        </div>

        <div className={`realm-banner ${claimable > 0 ? 'ready' : ''}`}>
          {claimable > 0 ? (
            <>
              <Flag size={16} weight="fill" /> {claimable} expedition{claimable === 1 ? '' : 's'} ready
              — tap an unexplored region to chart it
            </>
          ) : prog.remaining === 0 ? (
            <>
              <Flag size={16} weight="fill" /> Your whole realm is charted — legendary.
            </>
          ) : (
            <>
              <Flag size={16} /> Complete a quest to earn your next expedition.
            </>
          )}
        </div>

        <div className="realm-map-wrap">
          <RealmMap revealed={revealed} claimable={claimable > 0} onClaim={openClaim} onRead={openRead} />
        </div>

        <div className="realm-meter">
          <i style={{ width: `${prog.percent}%` }} />
        </div>

        <div className="realm-caption">
          <div className="realm-legend">
            <span className="realm-leg-item">
              <span className="realm-swatch lit" /> <b>Charted</b> — tap to re-read its discovery
            </span>
            <span className="realm-leg-item">
              <span className="realm-swatch fog" /> <b>Unexplored</b> — claim it with an expedition
            </span>
          </div>
          <div className="realm-milestone">
            <div>{prog.percent}% of {ATLAS.name} charted</div>
            {prog.remaining > 0 ? (
              <div className="realm-next">
                {prog.remaining} region{prog.remaining === 1 ? '' : 's'} left to chart
              </div>
            ) : (
              <div className="realm-next">Realm complete ✦</div>
            )}
          </div>
        </div>
      </div>

      {/* The Chronicle codex — everything your expeditions have brought back */}
      {chronicle.length > 0 && (
        <div className="realm-chronicle">
          <div className="rc-head">
            <span>The Chronicle</span>
            <span className="rc-count">
              {chronicle.length} discover{chronicle.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div className="rc-list">
            {[...chronicle].reverse().map((rec) => {
              const region = ATLAS.regions.find((r) => r.id === rec.region)
              const topic = topicById(rec.topic)
              const entry = entryById(rec.topic, rec.entry)
              const TIcon = topic ? TOPIC_ICON[topic.icon] ?? Sparkle : Sparkle
              return (
                <button key={rec.region} className="rc-item" onClick={() => setReading(rec)}>
                  <span className="rc-region">
                    <TIcon size={14} weight="fill" /> {region?.name ?? rec.region}
                  </span>
                  <span className="rc-fact">{entry?.fact ?? '…'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Expedition-returns modal: pick a topic, then tease -> reveal */}
      <AnimatePresence>
        {claiming && (
          <motion.div
            className="realm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={reveal?.stage === 'fact' ? undefined : closeModal}
          >
            <motion.div
              className="realm-modal"
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="rm-close" onClick={closeModal} aria-label="Close">
                <X size={16} weight="bold" />
              </button>

              {!reveal ? (
                <>
                  <div className="rm-kicker">Expedition returns</div>
                  <h3 className="rm-title">Your scouts reach {claiming.name}.</h3>
                  <p className="rm-sub">What did you have them study?</p>
                  <div className="rm-topics">
                    {chronicleTopics.map((t) => {
                      const TIcon = TOPIC_ICON[t.icon] ?? Sparkle
                      return (
                        <button
                          key={t.id}
                          className={`rm-topic ${lastTopic === t.id ? 'last' : ''}`}
                          onClick={() => pickTopic(t.id)}
                        >
                          {lastTopic === t.id && <span className="rm-last">Last</span>}
                          <span className="rm-topic-badge">
                            <TIcon size={20} weight="fill" />
                          </span>
                          <span className="rm-topic-name">{t.name}</span>
                          <span className="rm-topic-blurb">{t.blurb}</span>
                        </button>
                      )
                    })}
                    <button className="rm-topic surprise" onClick={() => pickTopic('surprise')}>
                      <span className="rm-topic-badge">
                        <Sparkle size={20} weight="fill" />
                      </span>
                      <span className="rm-topic-name">Surprise me</span>
                      <span className="rm-topic-blurb">Let the scouts decide</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="rm-reveal">
                  <div className="rm-teaser">{reveal.entry.teaser}</div>
                  <AnimatePresence>
                    {reveal.stage === 'fact' && (
                      <motion.div
                        className="rm-fact"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      >
                        <div className="rm-fact-text">{reveal.entry.fact}</div>
                        <button className="primary rm-keep" onClick={commit}>
                          <Flag size={15} weight="fill" /> Add to Chronicle
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {reveal.stage === 'teaser' && <div className="rm-dots">· · ·</div>}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-read a charted region's discovery */}
      <AnimatePresence>
        {reading && (
          <motion.div
            className="realm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReading(null)}
          >
            <motion.div
              className="realm-modal reading"
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="rm-close" onClick={() => setReading(null)} aria-label="Close">
                <X size={16} weight="bold" />
              </button>
              {(() => {
                const region = ATLAS.regions.find((r) => r.id === reading.region)
                const topic = topicById(reading.topic)
                const entry = entryById(reading.topic, reading.entry)
                const TIcon = topic ? TOPIC_ICON[topic.icon] ?? Sparkle : Sparkle
                return (
                  <>
                    <div className="rm-kicker">
                      <TIcon size={13} weight="fill" /> {topic?.name ?? 'Discovery'}
                    </div>
                    <h3 className="rm-title">{region?.name ?? reading.region}</h3>
                    {entry && <div className="rm-teaser">{entry.teaser}</div>}
                    <div className="rm-fact-text">{entry?.fact ?? '…'}</div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Compact realm strip for the Dashboard — a glanceable thumbnail + progress. */
export function RealmPeek(): JSX.Element {
  const { db } = useStore()
  if (!db) return <div />
  const chronicle = db.settings.realmChronicle ?? []
  const completions = totalCompletions(db.quests)
  const revealed = chartedRegionIds(chronicle)
  const claimable = claimableNow(completions, chronicle)
  const prog = realmProgress(chronicle)
  return (
    <div className="realm-peek">
      <div className="realm-peek-map">
        <RealmMap revealed={revealed} />
      </div>
      <div className="realm-peek-info">
        <div className="realm-peek-title">{ATLAS.name}</div>
        <div className="realm-peek-count">
          {prog.revealedCount} / {prog.total} regions charted
        </div>
        <div className="realm-peek-meter">
          <i style={{ width: `${prog.percent}%` }} />
        </div>
        {claimable > 0 ? (
          <div className="realm-peek-next">
            <Flag size={13} weight="fill" /> {claimable} expedition{claimable === 1 ? '' : 's'} ready
          </div>
        ) : prog.remaining === 0 ? (
          <div className="realm-peek-next">Realm complete ✦</div>
        ) : (
          <div className="realm-peek-next">Finish a quest to explore</div>
        )}
      </div>
    </div>
  )
}
