import { useStore } from '../state/store'
import { balance } from '@shared/config/balance'
import { totalCompletions } from '@shared/engine/stats'
import { realmProgress, revealedRegionIds } from '@shared/engine/realm'
import type { Quest } from '@shared/types'
import { MapTrifold } from '@phosphor-icons/react'

// The reward artifact: a fantasy realm whose regions are "discovered" as quests
// are completed. Reveal is a pure function of all-time completions (engine/realm.ts)
// — gains-only, so there's no state to tend. Geometry/thresholds live in
// balance.realm; this view just renders charted vs unexplored.
const ATLAS = balance.realm.atlases[0]
const VB = balance.realm.viewBox
// Three land tints, cycled per region so the map reads as varied terrain.
const LANDS = ['url(#realmLand)', 'url(#realmLandWarm)', 'url(#realmLandDeep)']

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

/** The realm map SVG — shared by the full view and the Dashboard peek. Charted
 *  regions glow emerald with a gold border + landmark; the rest are faint fog. */
function RealmMap({ revealed }: { revealed: Set<string> }): JSX.Element {
  const indexed = ATLAS.regions.map((r, i) => ({ r, i }))
  const fog = indexed.filter((x) => !revealed.has(x.r.id))
  const lit = indexed.filter((x) => revealed.has(x.r.id))
  return (
    <svg
      className="realm-svg"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-label={`A map of ${ATLAS.name}: ${lit.length} of ${indexed.length} regions discovered; the rest are unexplored.`}
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

      {/* Sea / unexplored ocean base */}
      <rect x={0} y={0} width={VB.w} height={VB.h} fill="url(#realmSea)" />
      <g opacity={0.06} stroke="#3ddc97" strokeWidth={0.6} fill="none">
        <path d="M40 60 q30 -8 60 0 t60 0" />
        <path d="M560 80 q26 -7 52 0 t52 0" />
        <path d="M60 430 q26 -7 52 0 t52 0" />
      </g>

      {/* Unexplored (fog) regions — drawn under the charted ones */}
      {fog.map(({ r }) => (
        <g key={r.id}>
          <path
            d={r.path}
            fill="rgba(233,243,238,0.018)"
            stroke="rgba(233,243,238,0.10)"
            strokeWidth={1.4}
            strokeDasharray="5 5"
          />
          <text className="realm-label-fog" x={r.label.x} y={r.label.y}>
            {r.name}
          </text>
        </g>
      ))}

      {/* Charted (discovered) regions — lit, with a gold border + landmark */}
      {lit.map(({ r, i }) => (
        <g key={r.id}>
          <g filter="url(#realmSoftGlow)">
            <path d={r.path} fill={LANDS[i % LANDS.length]} stroke="url(#realmGold)" strokeWidth={2} />
          </g>
          <Landmark kind={r.landmark.kind} x={r.landmark.x} y={r.landmark.y} />
          <text className="realm-label" x={r.label.x} y={r.label.y}>
            {r.name}
          </text>
        </g>
      ))}

      {/* Compass rose (gold, premium) */}
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

      {/* Sea-monster flourish (faint gold) */}
      <g transform="translate(712,402)" opacity={0.28} stroke="#c9a24a" strokeWidth={1.1} fill="none">
        <path d="M0 0 q10 -12 22 -4 q8 6 2 14 q-6 8 -16 4" />
        <path d="M22 -4 q6 -6 12 -2" />
      </g>

      {/* In-map title cartouche */}
      <g transform="translate(40,42)">
        <rect x={-6} y={-22} width={206} height={34} rx={6} fill="rgba(11,26,20,0.55)" stroke="rgba(201,162,74,0.35)" />
        <text
          x={98}
          y={0}
          textAnchor="middle"
          fill="#f4d77a"
          style={{ fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '2px' }}
        >
          {ATLAS.name.toUpperCase()}
        </text>
      </g>

      {/* Vignette */}
      <rect x={0} y={0} width={VB.w} height={VB.h} fill="url(#realmVign)" pointerEvents="none" />
    </svg>
  )
}

/**
 * The Realm — QuestDay's reward world. Completing quests charts regions of a
 * fantasy realm; over weeks an unexplored map becomes a charted world. Gains
 * only — a discovered region stays discovered (tone rule).
 */
export function RealmView(): JSX.Element {
  const { db } = useStore()
  if (!db) return <div />
  const completions = totalCompletions(db.quests)
  const revealed = revealedRegionIds(completions)
  const prog = realmProgress(completions)

  return (
    <div className="view realm-view">
      <div className="view-head">
        <h2>
          <MapTrifold size={20} weight="fill" className="realm-title-icon" /> Realm
        </h2>
        <span className="realm-hint">
          {prog.revealedCount} / {prog.total} regions discovered
        </span>
      </div>
      <p className="tagline">
        Every quest you finish charts more of {ATLAS.name}. Regions you discover stay discovered —
        your realm only ever grows.
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
            <div className="realm-count-label">Regions discovered</div>
          </div>
        </div>

        <div className="realm-map-wrap">
          <RealmMap revealed={revealed} />
        </div>

        <div className="realm-meter">
          <i style={{ width: `${prog.percent}%` }} />
        </div>

        <div className="realm-caption">
          <div className="realm-legend">
            <span className="realm-leg-item">
              <span className="realm-swatch lit" /> <b>Discovered</b> — charted by a completed quest
            </span>
            <span className="realm-leg-item">
              <span className="realm-swatch fog" /> <b>Unexplored</b> — awaits your next quest
            </span>
          </div>
          <div className="realm-milestone">
            <div>{prog.percent}% of {ATLAS.name} charted</div>
            {prog.next ? (
              <div className="realm-next">
                Next: {prog.next.name} in {prog.toNext} quest{prog.toNext === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="realm-next">The whole realm is charted — legendary.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Compact realm strip for the Dashboard — a glanceable thumbnail + progress. */
export function RealmPeek({ quests }: { quests: Quest[] }): JSX.Element {
  const completions = totalCompletions(quests)
  const revealed = revealedRegionIds(completions)
  const prog = realmProgress(completions)
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
        {prog.next ? (
          <div className="realm-peek-next">
            Next: {prog.next.name} in {prog.toNext}
          </div>
        ) : (
          <div className="realm-peek-next">Fully charted ✦</div>
        )}
      </div>
    </div>
  )
}
