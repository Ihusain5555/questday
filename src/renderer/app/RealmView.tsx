import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../state/store'
import { balance } from '@shared/config/balance'
import { totalCompletions, totalXpEarned } from '@shared/engine/stats'
import { realmProgress, claimableNow, chartedRegionIds } from '@shared/engine/realm'
import { civProgress, buildingsForXp } from '@shared/engine/civilization'
import { chronicleTopics, topicById, entryById, type ChronicleEntry } from '@shared/config/chronicle'
import type { ChronicleRecord } from '@shared/types'
import { MapTrifold, Flag, Planet, Leaf, Scroll, Feather, Sparkle, X, type Icon } from '@phosphor-icons/react'
import { CivilizationPanel } from './CivilizationPanel'
import { TownView } from './TownView'
import { TownPlacer } from './TownPlacer'
import { REGION_BIOME } from './biomeDecor'
import { MapIconSymbols } from './storybookMapIcons'

// The reward artifact: a fantasy realm charted YOUR way. Each completed quest
// earns one expedition; you spend it by charting a region AND choosing what to
// learn — your expedition "returns with" a knowledge entry (the Chronicle).
// Gains-only; a charted region stays charted. Geometry in balance.realm,
// knowledge in config/chronicle.
const ATLAS = balance.realm.atlases[0]
const VB = balance.realm.viewBox

/** Chronicle topic icon name -> Phosphor component. */
const TOPIC_ICON: Record<string, Icon> = { Planet, Leaf, Scroll, Feather }

/** A region's landmark kind -> storybook map symbol id (drawn as <use> of #sbm-*). */
const KIND_ICON: Record<string, string> = {
  keep: 'castle',
  town: 'town',
  tower: 'tower',
  mountains: 'mountains',
  village: 'town',
  forest: 'forest',
  lighthouse: 'lighthouse',
  marsh: 'marsh',
  mist: 'mist'
}

/** A cozy storybook landmark icon, centered horizontally on a region's
 *  settlement point and sitting just above it. */
function Landmark({
  kind,
  x,
  y,
  size = 52
}: {
  kind: string
  x: number
  y: number
  size?: number
}): JSX.Element | null {
  const icon = KIND_ICON[kind]
  if (!icon) return null
  return <use href={`#sbm-${icon}`} x={x - size / 2} y={y - size * 0.86} width={size} height={size} />
}

// Half-width of a region's name banner — kept in sync with scripts/_layout-check.mjs,
// which packing-verifies that no two regions' (icon + banner) footprints overlap.
const bannerHalf = (name: string): number => Math.max(30, name.length * 4.2 + 10)

/** A swallowtail cartouche (name banner) path of half-width `h`, centered at 0,0. */
function banner(h: number): string {
  return `M${-h} -12 L${h} -12 L${h + 11} 0 L${h} 12 L${-h} 12 L${-h - 11} 0 Z`
}

// Hand-drawn hero towns (Layer 2): a region id -> its reusable town <symbol> id.
// Regions not listed fall back to the simple #sbm landmark icon. Charted = full
// colour; unexplored = a faded "ghost" of the SAME art (a CSS opacity class), so
// the two states can never drift apart and nothing extra is stored.
const TOWN_ART: Record<string, string> = {
  larkholt: 'town-larkholt',
  goldfield: 'town-goldfield',
  sunmeadow: 'town-sunmeadow',
  greymoor: 'town-greymoor',
  tidesend: 'town-tidesend',
  quietfens: 'town-quietfens',
  embergreen: 'town-greenhaven',
}
const TOWN_SIZE = 76
/** Per-symbol size override (the capital citadel renders larger as the showpiece). Keyed by symbol id. */
const TOWN_SIZE_BY_ID: Record<string, number> = { 'town-greenhaven': 100 }
/** Regions whose landmark IS painted map terrain (e.g. the Crownspire range), so
 *  they draw NO separate icon — just the name + a soft highlight of their area on hover. */
const ICONLESS = new Set(['crownspire'])

/** A hand-drawn town placed at a region's spot (sits like Landmark, but is the
 *  full town cluster). `ghost` renders the faded unexplored state. */
function Town({ id, x, y, ghost }: { id: string; x: number; y: number; ghost?: boolean }): JSX.Element {
  const size = TOWN_SIZE_BY_ID[id] ?? TOWN_SIZE
  return (
    <use
      href={`#${id}`}
      x={x - size / 2}
      y={y - size * 0.86}
      width={size}
      height={size}
      className={ghost ? 'realm-town realm-town-ghost' : 'realm-town'}
    />
  )
}

/** True while the document is VISIBLE. Pauses map motion only when the window is
 *  actually hidden/minimized — NOT on mere focus loss, so a visible-but-unfocused
 *  map (e.g. while you read another window) keeps animating. `enabled` is false
 *  for the still thumbnail so it never wires a listener. */
function useDocumentVisible(enabled: boolean): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!enabled) return
    const update = (): void => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [enabled])
  return visible
}

/**
 * The realm map SVG — an antique "Inked Watercolor" world (v1.10). The sea,
 * land, terrain and frame are static map art; each atlas region is a settlement
 * marker on it: charted regions show their landmark + a banner name (tap to
 * re-read their discovery), unexplored regions are a faded marker (tap to chart
 * when an expedition is ready). Gains-only. `lite` (the Dashboard thumbnail)
 * drops the costly watercolor filters + text for cheap, always-on rendering.
 * (Living waves/boats/sea-creatures arrive in the next build.)
 */
function RealmMap({
  revealed,
  claimable = false,
  onClaim,
  onRead,
  onEnterTown,
  lite = false
}: {
  revealed: Set<string>
  claimable?: boolean
  onClaim?: (id: string) => void
  onRead?: (id: string) => void
  onEnterTown?: (id: string) => void
  lite?: boolean
}): JSX.Element {
  const regions = ATLAS.regions
  const litCount = regions.filter((r) => revealed.has(r.id)).length
  const canClaim = claimable && !!onClaim
  // Live watercolor filters (turbulence + displacement) are one-time-costly; skip
  // them entirely in `lite` so the always-on Dashboard thumbnail stays cheap.
  const rough = lite ? undefined : 'url(#tqRough)'
  const wc = lite ? undefined : 'url(#tqWc)'
  const visible = useDocumentVisible(!lite)
  return (
    <svg
      className={`realm-svg${!visible ? ' realm-anim-paused' : ''}`}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-label={`A map of ${ATLAS.name}: ${litCount} of ${regions.length} regions charted; the rest are unexplored.`}
    >
      <defs>
        {/* Antique inked-watercolor palette + textures (ported from the approved
            mockups/world-map-final.html; ids prefixed `tq` to avoid collisions). */}
        <radialGradient id="tqParch" cx="50%" cy="42%" r="78%">
          <stop offset="0%" stopColor="#f6eed4" />
          <stop offset="64%" stopColor="#ecdfba" />
          <stop offset="100%" stopColor="#ddca9c" />
        </radialGradient>
        <radialGradient id="tqSea" cx="50%" cy="46%" r="74%">
          <stop offset="0%" stopColor="#bfe0e0" />
          <stop offset="55%" stopColor="#90c0c4" />
          <stop offset="100%" stopColor="#6ba0a6" />
        </radialGradient>
        <linearGradient id="tqGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbeec0" />
          <stop offset="50%" stopColor="#e6be63" />
          <stop offset="100%" stopColor="#b98a2e" />
        </linearGradient>
        <filter id="tqGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.24 0 0 0 0 0.13  0 0 0 0.045 0" />
        </filter>
        <filter id="tqRough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
        <filter id="tqWc" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="b" in2="n" scale="16" />
        </filter>
        <filter id="tqSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Soft underwater shadow for diving sea-creatures — a gradient ellipse,
            NOT a live blur filter (a live filter re-blurs every frame). */}
        <radialGradient id="tqShadow">
          <stop offset="0%" stopColor="#2f5a5e" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#2f5a5e" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2f5a5e" stopOpacity="0" />
        </radialGradient>
        <pattern id="tqHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#6b5236" strokeWidth="0.7" opacity="0.3" />
        </pattern>
        <pattern id="tqRingH" width="86" height="44" patternUnits="userSpaceOnUse">
          <path d="M0 0 L20 38 L40 6 L60 42 L86 10 L86 0 Z" fill="#c08056" stroke="#a06642" strokeWidth="0.9" opacity="0.85" />
          <path d="M0 0 L20 38 L40 6 L60 42 L86 10" fill="none" stroke="#a06642" strokeWidth="0.7" />
        </pattern>
        <radialGradient id="tqWForest">
          <stop offset="0%" stopColor="#7aa552" />
          <stop offset="100%" stopColor="#7aa552" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tqWGold">
          <stop offset="0%" stopColor="#e9cf6e" />
          <stop offset="100%" stopColor="#e9cf6e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tqWMoor">
          <stop offset="0%" stopColor="#b59ec0" />
          <stop offset="100%" stopColor="#b59ec0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tqWFen">
          <stop offset="0%" stopColor="#86c4a8" />
          <stop offset="100%" stopColor="#86c4a8" stopOpacity="0" />
        </radialGradient>
        <symbol id="tqConifer" viewBox="0 0 24 30">
          <path d="M12 30 v-6" stroke="#6a5a36" strokeWidth="1.6" />
          <path d="M3 24 L12 3 L21 24 Z" fill="#74a84e" stroke="#4f7e3a" strokeWidth="0.8" />
          <path d="M5 16 L12 4 L19 16 Z" fill="#86b85c" stroke="#4f7e3a" strokeWidth="0.6" />
        </symbol>
        <symbol id="tqDecid" viewBox="0 0 24 30">
          <path d="M12 30 v-7" stroke="#6a5a36" strokeWidth="1.6" />
          <circle cx="12" cy="13" r="9" fill="#83b257" stroke="#4f7e3a" strokeWidth="0.8" />
        </symbol>
        <clipPath id="tqLand">
          <use href="#tqContinent" />
        </clipPath>
        <MapIconSymbols />
        {/* Hand-drawn hero towns (Layer 2). viewBox is a square around the town so
            <use width=height> scales it without distortion. CC0 hand-authored SVG. */}
        <symbol id="town-larkholt" viewBox="580 532 120 120">
          <g fill="none" stroke="#5a4a2e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
            <path d="M610 632 L632 632 L658 632 L632 640 Z" fill="#b09a6e" stroke="#b09a6e" strokeWidth={2} strokeDasharray="1 6" />
            <path d="M640 600 L660 624 L632 636 Z" fill="#b09a6e" stroke="#b09a6e" strokeWidth={2} strokeDasharray="1 6" />
            <path d="M633 614 V578 L632 555 L631 578 V614 Z" fill="#ecdfba" />
            <path d="M632 555 L645 578 L633 578 Z" fill="#cf7f50" />
            <path d="M632 555 L619 578 L631 578 Z" fill="#cf7f50" />
            <path d="M632 614 V589 L645 583 L645 614 Z" fill="#f0e3bc" />
            <path d="M632 589 L645 583 L656 590 L645 596 Z" fill="#f7d98a" />
            <path d="M631 540 V548 M627 544 H635" stroke="#5a4a2e" strokeWidth={1.4} />
            <rect x="628" y="600" width="6" height="14" rx="2" fill="#cf9a3a" />
            <rect x="648" y="595" width="5" height="6" fill="#cf9a3a" />
            <path d="M604 614 V596 L617 585 L630 596 V614 Z" fill="#f0e3bc" />
            <path d="M604 596 L617 585 L630 596" fill="#f7d98a" />
            <rect x="612" y="602" width="6" height="12" rx="1.5" fill="#cf9a3a" />
            <rect x="606" y="599" width="4" height="4" fill="#cf9a3a" />
            <path d="M657 614 V598 L669 588 L681 598 V614 Z" fill="#ecdfba" />
            <path d="M657 598 L669 588 L681 598" fill="#cf7f50" />
            <rect x="664" y="603" width="6" height="11" rx="1.5" fill="#cf9a3a" />
            <rect x="673" y="600" width="4" height="4" fill="#cf9a3a" />
            <path d="M598 580 V566 L609 557 L620 566 V580 Z" fill="#f0e3bc" />
            <path d="M598 566 L609 557 L620 566" fill="#f7d98a" />
            <rect x="605" y="569" width="5" height="11" rx="1.5" fill="#cf9a3a" />
            <path d="M663 578 V564 L674 556 L686 564 V578 Z" fill="#ecdfba" />
            <path d="M663 564 L674 556 L686 564" fill="#f7d98a" />
            <rect x="670" y="567" width="5" height="11" rx="1.5" fill="#cf9a3a" />
            <rect x="678" y="565" width="4" height="4" fill="#cf9a3a" />
            <path d="M619 632 V620 L630 612 L641 620 V632 Z" fill="#f0e3bc" />
            <path d="M619 620 L630 612 L641 620" fill="#cf7f50" />
            <rect x="626" y="623" width="5" height="9" rx="1.5" fill="#cf9a3a" />
            <ellipse cx="640" cy="625" rx="9" ry="5" fill="#ddd2bb" />
            <path d="M633 624 a8 5 0 0 1 14 0" fill="#ddd2bb" />
            <path d="M634 620 L640 611 L646 620" fill="#6a5a36" stroke="#5a4a2e" strokeWidth={1.4} />
            <path d="M640 611 V606" stroke="#5a4a2e" strokeWidth={1.4} />
            <path d="M588 600 c-7 0 -8 -9 -1 -10 c1 -7 11 -7 12 0 c6 0 6 9 -1 10 Z" fill="#83b257" stroke="#4f7e3a" />
            <path d="M593 600 V610" stroke="#6a5a36" strokeWidth={2} />
            <path d="M690 596 l5 12 l-10 0 Z" fill="#74a84e" stroke="#4f7e3a" />
            <path d="M688 588 l6 11 l-12 0 Z" fill="#86b85c" stroke="#4f7e3a" />
            <path d="M689 599 V610" stroke="#6a5a36" strokeWidth={2} />
            <path d="M615 590 c-6 0 -7 -8 -1 -9 c1 -6 10 -6 11 0 c5 0 5 8 -1 9 Z" fill="#86b85c" stroke="#4f7e3a" />
            <path d="M619 590 V598" stroke="#6a5a36" strokeWidth={2} />
          </g>
        </symbol>
        <symbol id="town-goldfield" viewBox="504 168 104 104">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M533 248 L540 246 L575 244 L580 247 L562 252 Z" fill="#b09a6e" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M556 232 L538 218" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><ellipse cx="556" cy="248" rx="13" ry="5" fill="#f7d98a" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M545 247 Q556 238 567 247" fill="#f7d98a" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M547 246 L549 240 M551 247 L552 240 M556 247 L556 239 M561 247 L560 240 M565 246 L563 240" stroke="#5a4a2e" strokeWidth="1.2"/><path d="M548 232 V216 Q548 209 556 208 Q564 209 564 216 V232 Z" fill="#ecdfba"/><path d="M547 208 Q556 200 565 208 Z" fill="#cf7f50"/><rect x="552" y="222" width="8" height="10" rx="1.5" fill="#cf9a3a"/><rect x="550" y="213" width="5" height="5" fill="#cf9a3a"/><g stroke="#5a4a2e" strokeWidth="1.6"><path d="M556 207 L548 191 M556 207 L572 199 M556 207 L564 223 M556 207 L540 215"/><path d="M548 191 L545 195 L552 198 L549 191 Z M572 199 L568 196 L565 203 L572 199 Z M564 223 L567 219 L560 216 L563 223 Z M540 215 L544 218 L551 211 L544 207 Z" fill="#f0e3bc"/></g><circle cx="556" cy="207" r="2" fill="#cf9a3a"/><path d="M519 244 V231 L524 226 L548 226 L548 244 Z" fill="#f0e3bc"/><path d="M523 226 L524 226 L548 226 L546 222 L526 222 Z" fill="#f7d98a"/><path d="M519 231 L524 226" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="526" y="234" width="6" height="10" rx="1" fill="#cf9a3a"/><rect x="538" y="232" width="7" height="6" fill="#cf9a3a"/><path d="M564 246 V234 L569 229 L592 230 L592 246 Z" fill="#ecdfba"/><path d="M568 229 L569 229 L592 230 L590 226 L571 225 Z" fill="#f7d98a"/><path d="M564 234 L569 229" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="572" y="236" width="6" height="10" rx="1" fill="#cf9a3a"/><rect x="583" y="234" width="6" height="6" fill="#cf9a3a"/><path d="M527 216 V204 L535 197 L543 204 V216 Z" fill="#f0e3bc"/><path d="M527 204 L535 197 L543 204" fill="#f7d98a"/><rect x="532" y="208" width="6" height="8" rx="1" fill="#cf9a3a"/><path d="M571 218 V207 L578 200 L585 207 V218 Z" fill="#ecdfba"/><path d="M571 207 L578 200 L585 207" fill="#f7d98a"/><rect x="575" y="210" width="6" height="8" rx="1" fill="#cf9a3a"/><path d="M524 256 V247 L531 241 L538 247 V256 Z" fill="#f0e3bc"/><path d="M524 247 L531 241 L538 247" fill="#cf7f50"/><rect x="528" y="250" width="5" height="6" fill="#cf9a3a"/><path d="M576 258 V250 L582 245 L588 250 V258 Z" fill="#f0e3bc"/><path d="M576 250 L582 245 L588 250" fill="#f7d98a"/><rect x="580" y="253" width="5" height="5" fill="#cf9a3a"/><path d="M542 256 Q538 246 546 245 Q554 246 550 256 Z" fill="#f7d98a"/><path d="M543 256 L546 247 M547 256 L546 246 M551 256 L548 248" stroke="#5a4a2e" strokeWidth="1.2"/><path d="M558 260 Q555 252 561 251 Q567 252 564 260 Z" fill="#f7d98a"/><path d="M559 260 L561 252 M563 260 L561 252" stroke="#5a4a2e" strokeWidth="1.2"/><g stroke="#4f7e3a" strokeWidth="1.6"><path d="M513 232 Q505 228 509 220 Q513 213 519 219 Q525 215 525 224 Q524 231 517 231 Z" fill="#83b257"/><path d="M517 231 V238" stroke="#6a5a36" strokeWidth="1.6"/></g><g stroke="#4f7e3a" strokeWidth="1.6"><path d="M596 240 L600 226 L604 240 Z" fill="#74a84e"/><path d="M600 240 V246" stroke="#6a5a36" strokeWidth="1.6"/></g><g stroke="#4f7e3a" strokeWidth="1.6"><path d="M536 191 Q530 188 533 182 Q537 177 541 182 Q545 179 544 186 Q542 191 537 190 Z" fill="#86b85c"/><path d="M538 190 V196" stroke="#6a5a36" strokeWidth="1.6"/></g></g>
        </symbol>
        <symbol id="town-sunmeadow" viewBox="715 174 120 120">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M737 290 Q768 286 802 289" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M772 282 Q758 268 748 258" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M730 268 Q740 256 730 244 Q722 236 730 226 L808 226 Q816 236 808 246 Q800 256 808 268" fill="none" stroke="#ddd2bb" strokeWidth="2.4"/><path d="M725 282 V250 L724 232 L745 232 L746 252 V282 Z" fill="#ecdfba"/><path d="M723 233 L735 222 L747 233 Z" fill="#f7d98a"/><rect x="730" y="266" width="9" height="16" rx="1.5" fill="#cf9a3a"/><rect x="730" y="240" width="6" height="6" fill="#cf9a3a"/><path d="M753 285 V261 L765 252 L778 260 V285 Z" fill="#f0e3bc"/><path d="M753 261 L765 252 L778 260" fill="#cf7f50"/><rect x="760" y="270" width="7" height="13" rx="1.5" fill="#cf9a3a"/><path d="M758 252 V210 H788 V252 Z" fill="#ddd2bb"/><path d="M758 210 L760 204 H764 V210 M768 210 V204 H772 V210 M776 210 V204 H780 V210 M784 210 V204 L786 210" fill="#ddd2bb"/><path d="M748 226 V198 H760 V226 Z" fill="#d7cdb6"/><path d="M748 198 L749 193 H752 V198 M755 198 V193 H758 V198 L760 198 V198" fill="#d7cdb6"/><path d="M786 226 V200 H798 V226 Z" fill="#d7cdb6"/><path d="M786 200 L787 195 H790 V200 M793 200 V195 H796 V200 L798 200" fill="#d7cdb6"/><rect x="766" y="232" width="13" height="20" rx="1.5" fill="#cf9a3a"/><rect x="765" y="216" width="6" height="7" fill="#cf9a3a"/><rect x="776" y="216" width="6" height="7" fill="#cf9a3a"/><path d="M773 198 V178" strokeWidth="1.6"/><path d="M773 179 L789 184 L773 190 Z" fill="#76a455" strokeWidth="1.4"/><path d="M793 287 V264 L805 255 L818 263 V287 Z" fill="#ecdfba"/><path d="M793 264 L805 255 L818 263" fill="#f7d98a"/><rect x="800" y="272" width="7" height="15" rx="1.5" fill="#cf9a3a"/><rect x="809" y="268" width="5" height="5" fill="#cf9a3a"/><path d="M729 224 V206 L740 198 L751 206 V224 Z" fill="#f0e3bc"/><path d="M729 206 L740 198 L751 206" fill="#cf7f50"/><rect x="736" y="212" width="7" height="12" rx="1.5" fill="#cf9a3a"/><path d="M793 226 V208 L804 200 L815 208 V226 Z" fill="#f0e3bc"/><path d="M793 208 L804 200 L815 208" fill="#f7d98a"/><rect x="800" y="214" width="7" height="12" rx="1.5" fill="#cf9a3a"/><path d="M735 252 q-7 -3 -7 -11 q0 -8 7 -10 q7 -6 14 0 q7 2 7 10 q0 8 -7 11 Z" fill="#83b257" stroke="#4f7e3a" strokeWidth="1.4"/><path d="M742 252 V258" stroke="#6a5a36" strokeWidth="1.4"/><path d="M815 250 l6 -14 l6 14 Z" fill="#74a84e" stroke="#4f7e3a" strokeWidth="1.4"/><path d="M821 250 V256" stroke="#6a5a36" strokeWidth="1.4"/><path d="M783 288 q-5 -2 -5 -7 q0 -6 5 -7 q5 -4 10 0 q5 1 5 7 q0 5 -5 7 Z" fill="#86b85c" stroke="#4f7e3a" strokeWidth="1.4"/></g>
        </symbol>
        <symbol id="town-greymoor" viewBox="790 395 108 108">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M820 470 Q812 487 829 489 L859 489 Q874 487 866 470 Q852 472 843 471 Q831 470 820 470 Z" fill="#b09a6e" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M845 488 Q838 470 850 458" fill="none" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><g fill="#83b257" stroke="#4f7e3a"><path d="M803 478 Q794 478 796 470 Q791 466 797 461 Q797 454 805 456 Q809 451 814 457 Q821 457 819 465 Q822 471 816 474 Q815 480 808 478 Q806 481 803 478 Z"/><path d="M809 478 V486" stroke="#6a5a36"/></g><g fill="#74a84e" stroke="#4f7e3a"><path d="M883 462 L878 474 H888 Z"/><path d="M884 456 L879 467 H889 Z"/><path d="M883 451 L880 460 H887 Z"/><path d="M883 474 V482" stroke="#6a5a36"/></g><path d="M819 452 L819 415 L815 415 L815 408 L820 408 L820 414 L825 414 L825 408 L830 408 L830 414 L835 414 L835 408 L840 408 L840 452 Z" fill="#ddd2bb"/><path d="M824 452 L824 422 Q829 419 835 422 L835 452" fill="#d7cdb6"/><path d="M819 426 L840 426" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="826" y="431" width="7" height="11" rx="1" fill="#6a5a36" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="827" y="416" width="4" height="5" fill="#cf9a3a"/><path d="M833 411 L833 405" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M833 406 L840 408 L833 410 Z" fill="#cf7f50" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M798 472 V452 L799 442 L813 433 L827 443 L827 451" fill="#ddd2bb"/><path d="M799 442 L813 433 L827 443" fill="#cf7f50"/><path d="M813 433 L813 472" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="803" y="458" width="6" height="14" rx="1" fill="#6a5a36" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="817" y="450" width="6" height="6" fill="#cf9a3a"/><path d="M852 472 V450 L867 439 L883 449 V472 Z" fill="#d7cdb6"/><path d="M850 451 L867 438 L885 451" fill="#cf7f50"/><rect x="861" y="458" width="7" height="14" rx="1" fill="#6a5a36" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="872" y="455" width="6" height="6" fill="#cf9a3a"/><path d="M858 449 L876 449" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M829 491 V474 L830 467 L842 460 L854 468 V491 Z" fill="#ddd2bb"/><path d="M829 468 L842 459 L855 468" fill="#cf7f50"/><path d="M842 460 L842 491" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="833" y="478" width="6" height="13" rx="1" fill="#6a5a36" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="845" y="474" width="6" height="6" fill="#cf9a3a"/><path d="M870 492 V476 L871 470 L882 464 L893 471 V492 Z" fill="#d7cdb6"/><path d="M870 471 L882 463 L894 471" fill="#cf7f50"/><rect x="874" y="480" width="6" height="12" rx="1" fill="#6a5a36" stroke="#5a4a2e" strokeWidth="1.4"/><rect x="885" y="476" width="5" height="5" fill="#cf9a3a"/></g>
        </symbol>
        <symbol id="town-tidesend" viewBox="257 400 97 97">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M276 470 q14 5 30 1 q20 -4 34 2" stroke="#b09a6e" strokeDasharray="1 6"/><path d="M300 458 q-13 4 -24 13" stroke="#b09a6e" strokeDasharray="1 6"/><path d="M312 467 q-3 12 6 22 q11 7 22 1 q7 -10 -2 -19 q-12 -8 -26 -4 Z" fill="#8fc0c4" stroke="#5f9aa0" strokeWidth="1.4"/><path d="M295 452 V424 q0 -3 5 -3 q5 0 5 3 V452 Z" fill="#ddd2bb"/><path d="M294 424 L300 411 L306 424 Z" fill="#cf7f50"/><path d="M306 424 q-6 -15 -12 0" fill="#cf7f50"/><rect x="297" y="440" width="6" height="9" rx="1.4" fill="#cf9a3a"/><circle cx="300" cy="430" r="2.4" fill="#cf9a3a"/><path d="M300 411 V404" strokeWidth="1.4"/><path d="M300 404 q7 1 6 5 q-6 1 -6 -1" fill="#76a455" stroke="#4f7e3a" strokeWidth="1.2"/><path d="M270 462 V446 L281 437 L291 446 V462 Z" fill="#f0e3bc"/><path d="M269 446 L281 436 L292 446" fill="#f7d98a"/><rect x="277" y="451" width="6" height="11" rx="1.4" fill="#cf9a3a"/><rect x="285" y="449" width="4" height="4" fill="#cf9a3a"/><path d="M321 458 V444 L331 436 L341 444 V458 Z" fill="#ecdfba"/><path d="M320 444 L331 435 L342 444" fill="#f7d98a"/><rect x="327" y="448" width="5" height="10" rx="1.4" fill="#cf9a3a"/><rect x="335" y="446" width="4" height="4" fill="#cf9a3a"/><path d="M283 478 V466 L292 459 L301 466 V478 Z" fill="#f0e3bc"/><path d="M282 466 L292 458 L302 466" fill="#cf7f50"/><rect x="288" y="469" width="5" height="9" rx="1.4" fill="#cf9a3a"/><path d="M264 478 q5 -10 10 0" fill="#83b257" stroke="#4f7e3a"/><path d="M269 478 V472" stroke="#6a5a36"/><path d="M312 480 q4 -8 8 0" fill="#86b85c" stroke="#4f7e3a"/><path d="M316 480 V475" stroke="#6a5a36"/><path d="M338 466 q4 -9 8 0" fill="#83b257" stroke="#4f7e3a"/><path d="M342 466 V461" stroke="#6a5a36"/></g>
        </symbol>
        <symbol id="town-quietfens" viewBox="411 603 118 118">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M440 690 Q462 686 486 691" stroke="#8fc0c4" strokeWidth="6"/><path d="M448 700 Q478 695 510 701" stroke="#8fc0c4" strokeWidth="6"/><ellipse cx="430" cy="697" rx="15" ry="8" fill="#8fc0c4" stroke="#5f9aa0" strokeWidth="1.4"/><path d="M427 695 a3 3 0 1 0 6 1" fill="#76a455" stroke="#4f7e3a" strokeWidth="1.2"/><ellipse cx="512" cy="688" rx="13" ry="7" fill="#8fc0c4" stroke="#5f9aa0" strokeWidth="1.4"/><path d="M510 686 a2.6 2.6 0 1 0 5 1" fill="#76a455" stroke="#4f7e3a" strokeWidth="1.2"/><path d="M449 678 L468 674 M450 685 L469 681" stroke="#b09a6e" strokeWidth="2"/><path d="M449 678 L450 685 M455 677 L456 684 M461 676 L462 683 M468 674 L469 681" stroke="#b09a6e" strokeWidth="1.4"/><path d="M479 670 L496 668 M480 677 L497 675" stroke="#b09a6e" strokeWidth="2"/><path d="M479 670 L480 677 M485 669 L486 676 M491 669 L492 675 M496 668 L497 674" stroke="#b09a6e" strokeWidth="1.4"/><path d="M460 656 L461 674 M474 654 L475 672" stroke="#6a5a36" strokeWidth="1.6"/><path d="M438 657 V638 L455 626 L471 637 V657 Z" fill="#f0e3bc"/><path d="M436 638 L455 624 L473 638 Z" fill="#f7d98a"/><rect x="450" y="645" width="8" height="12" rx="1" fill="#cf9a3a"/><path d="M442 657 L443 692 M453 657 L454 690 M466 657 L467 691" stroke="#6a5a36" strokeWidth="1.6"/><path d="M474 650 V632 L490 621 L505 633 V650 Z" fill="#ecdfba"/><path d="M472 632 L490 619 L507 633 Z" fill="#cf7f50"/><rect x="484" y="639" width="7" height="11" rx="1" fill="#cf9a3a"/><path d="M477 650 L478 687 M489 650 L490 686 M501 650 L502 688" stroke="#6a5a36" strokeWidth="1.6"/><path d="M488 678 V662 L502 652 L515 663 V678 Z" fill="#f0e3bc"/><path d="M486 662 L502 650 L517 663 Z" fill="#f7d98a"/><rect x="497" y="668" width="6" height="10" rx="1" fill="#cf9a3a"/><path d="M491 678 L492 703 M503 678 L504 703 M513 678 L514 701" stroke="#6a5a36" strokeWidth="1.6"/><path d="M428 668 q-3 -16 1 -26 M431 668 q3 -14 0 -24 M425 642 q4 6 6 0 M429 644 q5 4 4 -2" stroke="#86b85c" strokeWidth="1.4"/><path d="M519 660 q-3 -15 1 -24 M522 660 q3 -13 0 -22 M516 638 q4 5 6 0" stroke="#86b85c" strokeWidth="1.4"/><path d="M467 700 q-2 -12 1 -20 M470 700 q3 -10 0 -18 M464 681 q4 4 6 0" stroke="#74a84e" strokeWidth="1.4"/><circle cx="453" cy="623" r="5" fill="#83b257" stroke="#4f7e3a" strokeWidth="1.4"/></g>
        </symbol>
        <symbol id="town-greenhaven" viewBox="511 350 165 165">
          <g fill="none" stroke="#5a4a2e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M558 458 C572 449 632 449 648 459 C641 470 566 471 558 458 Z" fill="#8fc0c4" stroke="#5f9aa0"/><path d="M572 408 L600 420 L640 410" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M600 420 L588 452" stroke="#b09a6e" strokeWidth="2" strokeDasharray="1 6"/><path d="M548 442 L552 446 M650 440 L654 444 M556 408 L552 404" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M547 444 L547 432 L555 432 L555 444 M563 444 L563 432 L571 432 L571 444 M579 444 L579 432 L587 432 L587 444" fill="#ddd2bb"/><path d="M547 432 L547 426 L551 426 L551 432 M559 432 L559 426 L563 426 L563 432 M571 432 L571 426 L575 426 L575 432 M583 432 L583 426 L587 426 L587 432" fill="#ddd2bb"/><path d="M541 444 V412 L546 412 V408 L552 408 V412 L557 412 V444 Z" fill="#ddd2bb"/><path d="M541 412 L549 405 L557 412" fill="#cf7f50"/><path d="M549 405 V392" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M549 392 L561 396 L549 401 Z" fill="#76a455"/><rect x="546" y="426" width="6" height="10" rx="1" fill="#cf9a3a"/><path d="M570 460 V424 L576 424 V418 L584 418 V424 L590 424 V460 Z" fill="#ecdfba"/><path d="M570 424 L580 414 L590 424" fill="#f7d98a"/><path d="M580 414 V402" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M580 402 L594 407 L580 412 Z" fill="#76a455"/><rect x="576" y="446" width="8" height="14" rx="1.5" fill="#cf9a3a"/><rect x="572" y="430" width="5" height="6" fill="#cf9a3a"/><rect x="583" y="430" width="5" height="6" fill="#cf9a3a"/><path d="M604 460 V428 C604 414 626 414 626 428 V460 Z" fill="#f0e3bc"/><path d="M615 414 V382" stroke="#5a4a2e" strokeWidth="2"/><path d="M615 382 L605 408 L625 408 Z" fill="#cf7f50"/><path d="M610 460 V438 C610 430 620 430 620 438 V460 Z" fill="#cf9a3a"/><circle cx="615" cy="424" r="4" fill="#8fc0c4" stroke="#5f9aa0" strokeWidth="1.4"/><path d="M612 388 L621 388 M613 393 L620 393" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M555 459 V426 L569 416 L583 426 V459 Z" fill="#f0e3bc"/><path d="M555 426 L569 416 L583 426" fill="#f7d98a"/><rect x="562" y="442" width="8" height="17" rx="1.5" fill="#cf9a3a"/><rect x="572" y="438" width="6" height="6" fill="#cf9a3a"/><path d="M634 460 V430 L646 421 L658 430 V460 Z" fill="#ecdfba"/><path d="M634 430 L646 421 L658 430" fill="#cf7f50"/><rect x="641" y="446" width="7" height="14" rx="1.5" fill="#cf9a3a"/><rect x="650" y="436" width="5" height="6" fill="#cf9a3a"/><path d="M527 461 V436 L538 428 L549 436 V461 Z" fill="#f0e3bc"/><path d="M527 436 L538 428 L549 436" fill="#f7d98a"/><rect x="533" y="448" width="7" height="13" rx="1.5" fill="#cf9a3a"/><path d="M591 462 V440 L601 433 L611 440 V462 Z" fill="#ecdfba"/><path d="M591 440 L601 433 L611 440" fill="#f7d98a"/><rect x="597" y="450" width="6" height="12" rx="1.5" fill="#cf9a3a"/><path d="M540 470 H666" stroke="#5a4a2e" strokeWidth="2"/><path d="M540 470 V456 M548 470 V462 M556 470 V456 M564 470 V462 M572 470 V456 M580 470 V462 M588 470 V456 M596 470 V462 M604 470 V456 M612 470 V462 M620 470 V456 M628 470 V462 M636 470 V456 M644 470 V462 M652 470 V456 M660 470 V462 M666 470 V456" stroke="#5a4a2e" strokeWidth="1.4"/><circle cx="630" cy="448" r="5" fill="#ddd2bb"/><path d="M627 448 V442 M633 448 V442 M627 442 H633" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M628 440 L632 440" stroke="#5a4a2e" strokeWidth="1.4"/><path d="M662 449 L666 447 L670 449 V456 H662 Z" fill="#f7d98a"/><path d="M662 449 H670" stroke="#5a4a2e" strokeWidth="1.4"/><g stroke="#4f7e3a"><path d="M538 476 C530 476 530 466 538 466 C546 466 546 476 538 476 Z" fill="#83b257"/><path d="M538 476 V482" stroke="#6a5a36"/></g><g stroke="#4f7e3a"><path d="M660 432 L666 420 L672 432 Z" fill="#74a84e"/><path d="M666 432 V438" stroke="#6a5a36"/></g><g stroke="#4f7e3a"><path d="M520 452 C513 452 513 444 520 444 C527 444 527 452 520 452 Z" fill="#86b85c"/><path d="M520 452 V457" stroke="#6a5a36"/></g></g>
        </symbol>
      </defs>

      {/* ===== SEA ===== */}
      <rect x={0} y={0} width={VB.w} height={VB.h} fill="url(#tqSea)" />
      {!lite && (
        <g opacity={0.4}>
          <ellipse cx={150} cy={430} rx={120} ry={180} fill="#6ba0a6" filter={wc} />
          <ellipse cx={1066} cy={430} rx={120} ry={220} fill="#6ba0a6" filter={wc} />
        </g>
      )}
      {lite ? (
        /* thumbnail: a few STILL wave ticks (no motion) */
        <g stroke="#dcf0f0" strokeWidth={1.2} strokeLinecap="round" opacity={0.55} fill="none">
          <path d="M150 150 q8 -5 16 0" />
          <path d="M1020 160 q8 -5 16 0" />
          <path d="M1050 540 q8 -5 16 0" />
          <path d="M150 560 q8 -5 16 0" />
          <path d="M520 118 q8 -5 16 0" />
          <path d="M90 420 q8 -5 16 0" />
        </g>
      ) : (
        <>
          {/* lapping waves — gentle ease-in-out ping-pong (returns to exact start) */}
          <g className="realm-wave" stroke="#dcf0f0" strokeWidth={1.3} strokeLinecap="round" opacity={0.6} fill="none">
            <path d="M150 150 q8 -5 16 0" />
            <path d="M120 300 q8 -5 16 0" />
            <path d="M300 120 q8 -5 16 0" />
            <path d="M1020 160 q8 -5 16 0" />
            <path d="M1086 300 q8 -5 16 0" />
            <path d="M1050 540 q8 -5 16 0" />
            <path d="M150 560 q8 -5 16 0" />
            <path d="M120 680 q8 -5 16 0" />
            <path d="M980 700 q8 -5 16 0" />
            <path d="M520 118 q8 -5 16 0" />
            <path d="M1060 440 q8 -5 16 0" />
            <path d="M90 420 q8 -5 16 0" />
            <path d="M1095 600 q8 -5 16 0" />
            <path d="M70 250 q8 -5 16 0" />
          </g>
          <g className="realm-wave" style={{ animationDelay: '-3.5s' }} stroke="#cfe6e6" strokeWidth={1.1} strokeLinecap="round" opacity={0.5} fill="none">
            <path d="M200 200 q7 -4 14 0" />
            <path d="M1010 240 q7 -4 14 0" />
            <path d="M1040 660 q7 -4 14 0" />
            <path d="M210 640 q7 -4 14 0" />
            <path d="M110 540 q7 -4 14 0" />
            <path d="M1100 500 q7 -4 14 0" />
          </g>
          {/* wind streaks — fade in then out so the position reset is invisible */}
          <g fill="none" stroke="#f3ead2" strokeLinecap="round" strokeWidth={1.6}>
            <path className="realm-wind" d="M120 110 q40 -10 80 0 q30 8 60 0" opacity={0.5} />
            <path className="realm-wind" style={{ animationDelay: '-4s' }} d="M780 96 q40 -10 80 0 q30 8 60 0" opacity={0.45} />
            <path className="realm-wind" style={{ animationDelay: '-7s' }} d="M250 730 q40 -10 80 0 q30 8 60 0" opacity={0.4} />
            <path className="realm-wind" style={{ animationDelay: '-2.5s' }} d="M860 720 q40 -10 80 0 q30 8 60 0" opacity={0.4} />
          </g>
        </>
      )}

      {/* ===== LANDMASS ===== */}
      <g filter={rough}>
        <path
          id="tqContinent"
          d="M250 300 C 210 250 250 200 330 190 C 410 178 470 150 560 158 C 660 166 700 140 790 162 C 880 184 940 180 980 250 C 1012 298 1030 324 1042 352 C 1052 380 1000 392 940 400 C 980 450 960 520 900 560 C 850 595 820 640 740 650 C 660 660 600 700 520 690 C 440 680 380 700 320 660 C 250 612 230 560 240 500 C 200 470 210 400 250 360 C 232 338 236 318 250 300 Z"
          fill="url(#tqParch)"
          stroke="#9c7e4a"
          strokeWidth={1.8}
        />
        {/* Mist Isles — tiny isles in the sea off the eastern cape (the cape itself is
            now part of the mainland; these offshore dots keep the "isles" their name) */}
        <g fill="url(#tqParch)" stroke="#9c7e4a" strokeWidth={1.1} opacity={0.92}>
          <path d="M1066 348 q14 -6 22 3 q6 11 -7 16 q-15 4 -19 -7 q-2 -8 4 -12 Z" />
          <path d="M1082 378 q11 -4 17 4 q4 9 -7 12 q-12 3 -15 -6 Z" />
          <path d="M1058 396 q9 -4 15 3 q3 7 -6 10 q-11 2 -13 -6 Z" />
        </g>
        <path d="M165 645 C 150 622 185 600 220 612 C 258 624 262 668 232 686 C 200 704 178 678 165 645 Z" fill="url(#tqParch)" stroke="#9c7e4a" strokeWidth={1.5} opacity={0.95} />
        <path d="M1010 620 C 1000 598 1035 585 1066 600 C 1096 615 1090 656 1058 666 C 1028 675 1016 648 1010 620 Z" fill="url(#tqParch)" stroke="#9c7e4a" strokeWidth={1.5} opacity={0.9} />
      </g>
      {!lite && (
        <rect x={0} y={0} width={VB.w} height={VB.h} fill="#fff" filter="url(#tqGrain)" opacity={0.32} style={{ mixBlendMode: 'overlay' }} pointerEvents="none" />
      )}
      {!lite && (
        <g filter={rough} fill="none" stroke="#7fb0b4" strokeLinecap="round" opacity={0.5}>
          <use href="#tqContinent" transform="translate(610 425) scale(1.03) translate(-610 -425)" strokeWidth={1} />
          <use href="#tqContinent" transform="translate(610 425) scale(1.06) translate(-610 -425)" strokeWidth={0.8} opacity={0.6} />
        </g>
      )}

      {/* ===== TERRAIN (clipped to the main continent) ===== */}
      <g clipPath="url(#tqLand)">
        <g opacity={0.55}>
          <ellipse cx={330} cy={278} rx={118} ry={92} fill="url(#tqWForest)" filter={wc} />
          <ellipse cx={600} cy={430} rx={155} ry={115} fill="url(#tqWGold)" filter={wc} />
          <ellipse cx={610} cy={232} rx={160} ry={86} fill="url(#tqWGold)" filter={wc} />
          <ellipse cx={772} cy={250} rx={110} ry={78} fill="url(#tqWGold)" filter={wc} />
          <ellipse cx={838} cy={460} rx={126} ry={96} fill="url(#tqWMoor)" filter={wc} />
          <ellipse cx={470} cy={648} rx={140} ry={92} fill="url(#tqWFen)" filter={wc} />
          <ellipse cx={650} cy={600} rx={120} ry={80} fill="url(#tqWForest)" filter={wc} opacity={0.5} />
        </g>
        {/* rivers — gentle meanders, kept OFF the harsh rough filter so the thin
            strokes stay continuous; 3 feed Heartmere, 1 drains it toward the sea */}
        <g fill="none" stroke="#5f9aa0" strokeLinecap="round" opacity={0.8}>
          <path d="M858 372 C 824 398 802 416 766 438 C 728 462 690 478 652 488 C 618 499 582 505 552 507" strokeWidth={2.4} />
          <path d="M340 316 C 366 348 392 376 424 408 C 456 440 482 466 504 490" strokeWidth={2} />
          <path d="M712 614 C 698 586 676 558 644 540 C 610 521 580 513 556 508" strokeWidth={1.8} />
          <path d="M484 514 C 446 544 410 568 368 592 C 334 612 304 634 282 650" strokeWidth={3} />
        </g>
        {/* source tarns (over the river starts) + Heartmere (over the inflow/outflow
            ends) so every river begins and ends in real water — no dead ends */}
        <g fill="#8fc0c4" stroke="#5f9aa0" strokeWidth={1.3}>
          <ellipse cx={861} cy={373} rx={13} ry={8} />
          <ellipse cx={338} cy={314} rx={12} ry={8} />
          <ellipse cx={714} cy={616} rx={12} ry={8} />
        </g>
        {/* Heartmere — the central lake */}
        <path d="M474 498 q24 -20 58 -14 q26 6 24 22 q-4 22 -44 24 q-40 2 -46 -16 q-4 -14 8 -16 Z" fill="#8fc0c4" stroke="#5f9aa0" strokeWidth={1.4} filter={wc} opacity={0.9} />
        {/* Vale of Embergreen — a dense wood */}
        <g>
          <use href="#tqConifer" x={298} y={232} width={26} height={32} />
          <use href="#tqDecid" x={330} y={240} width={26} height={32} />
          <use href="#tqConifer" x={274} y={252} width={24} height={30} />
          <use href="#tqDecid" x={356} y={256} width={24} height={30} />
          <use href="#tqConifer" x={320} y={270} width={26} height={32} />
          <use href="#tqDecid" x={286} y={288} width={26} height={32} />
          <use href="#tqConifer" x={344} y={296} width={24} height={30} />
          <use href="#tqDecid" x={262} y={276} width={22} height={28} />
        </g>
        {/* scattered groves for life */}
        <g opacity={0.85}>
          <use href="#tqConifer" x={452} y={356} width={20} height={26} />
          <use href="#tqDecid" x={470} y={362} width={18} height={24} />
          <use href="#tqDecid" x={700} y={500} width={20} height={26} />
          <use href="#tqConifer" x={486} y={430} width={18} height={24} />
          <use href="#tqDecid" x={612} y={560} width={20} height={26} />
          <use href="#tqConifer" x={636} y={566} width={18} height={24} />
        </g>
      </g>

      {/* river-mouth estuary — a soft brackish delta where the outflow meets the sea,
          blending river teal into the ocean tone (no hard clipped shoreline edge) */}
      <path d="M306 638 Q 292 656 276 674 Q 270 680 262 684 Q 278 664 290 648 Q 298 640 306 638 Z" fill="#7cabae" opacity={0.5} />

      {/* Crownspire mountain range (on top of the land) */}
      <g filter={rough} stroke="#6b5236" strokeWidth={1} strokeLinejoin="round">
        <path d="M788 360 L838 282 L876 360 Z" fill="#c8b48a" />
        <path d="M834 360 L900 258 L956 360 Z" fill="#b89e74" />
        <path d="M916 360 L956 300 L996 360 Z" fill="#c8b48a" />
        <path d="M900 258 L884 286 L916 286 Z" fill="#f4efe1" stroke="none" />
        <path d="M838 282 L826 304 L852 304 Z" fill="#f4efe1" stroke="none" />
        <path d="M956 300 L946 320 L968 320 Z" fill="#f4efe1" stroke="none" />
        <path d="M900 260 L956 358 L902 360 Z" fill="url(#tqHatch)" opacity={0.5} />
        <path d="M838 284 L876 358 L840 360 Z" fill="url(#tqHatch)" opacity={0.4} />
      </g>

      {/* ===== REGION MARKERS (data-driven; charted vs unexplored) ===== */}
      {regions.map((r) => {
        if (revealed.has(r.id)) {
          const h = bannerHalf(r.name)
          // A charted HERO TOWN is enterable (click -> zoom into its iso town).
          // Re-reading its Chronicle fact stays available in the Chronicle list
          // below the map; other charted regions keep the tap-to-re-read action.
          const enterable = !!(onEnterTown && TOWN_ART[r.id])
          return (
            <g
              key={r.id}
              className={
                enterable
                  ? 'realm-region realm-charted realm-enterable'
                  : onRead
                    ? 'realm-region realm-charted'
                    : 'realm-region'
              }
              onClick={enterable ? () => onEnterTown!(r.id) : onRead ? () => onRead(r.id) : undefined}
            >
              <title>
                {enterable ? `Enter ${r.name}` : onRead ? `${r.name} — re-read your discovery` : r.name}
              </title>
              {!lite && !ICONLESS.has(r.id) && (
                <ellipse cx={r.landmark.x} cy={r.landmark.y - 6} rx={34} ry={26} fill="#f4d77a" opacity={0.18} filter="url(#tqSoftGlow)" />
              )}
              {TOWN_ART[r.id] ? (
                <Town id={TOWN_ART[r.id]} x={r.landmark.x} y={r.landmark.y} />
              ) : ICONLESS.has(r.id) ? (
                <path d={r.path} className="realm-hit" />
              ) : (
                <Landmark kind={r.landmark.kind} x={r.landmark.x} y={r.landmark.y} />
              )}
              {!lite && (
                <g transform={`translate(${r.label.x} ${r.label.y})`}>
                  <path d={banner(h)} fill="#f5ebcb" stroke="#b98a2e" strokeWidth={1} />
                  <text className="realm-blabel" x={0} y={4} textAnchor="middle">
                    {r.name}
                  </text>
                </g>
              )}
              {enterable && !lite && (
                <text className="realm-enter-label" x={r.label.x} y={r.label.y + 24} textAnchor="middle">
                  enter →
                </text>
              )}
            </g>
          )
        }
        return (
          <g
            key={r.id}
            className={canClaim ? 'realm-region realm-claimable' : 'realm-region'}
            onClick={canClaim ? () => onClaim?.(r.id) : undefined}
          >
            <title>{canClaim ? `Chart ${r.name}` : `${r.name} — unexplored`}</title>
            {TOWN_ART[r.id] ? (
              <Town id={TOWN_ART[r.id]} x={r.landmark.x} y={r.landmark.y} ghost />
            ) : ICONLESS.has(r.id) ? (
              <path d={r.path} className={canClaim ? 'realm-hit realm-hit-claim' : 'realm-hit'} />
            ) : (
              <circle
                className="realm-fogdot"
                cx={r.landmark.x}
                cy={r.landmark.y}
                r={16}
                fill={canClaim ? 'rgba(244,215,122,0.10)' : 'rgba(120,100,70,0.05)'}
                stroke={canClaim ? '#cf9a3a' : '#9c8a64'}
                strokeWidth={1.4}
                strokeDasharray="4 4"
                opacity={canClaim ? 0.9 : 0.5}
              />
            )}
            {!lite && (
              <text
                className="realm-label-fog"
                x={r.label.x}
                y={r.label.y}
                textAnchor="middle"
                style={{ fill: canClaim ? '#9c5b3f' : '#8a7a5a', fontStyle: 'italic' }}
              >
                {r.name}
              </text>
            )}
          </g>
        )
      })}

      {/* ===== OCEAN LIFE (animated; pauses when the window is hidden/blurred) ===== */}
      {!lite && (
        <g>
          {/* sea-serpent (E): swims, breaches, dives under (fading) while its
              underwater shadow glides, then resurfaces — back to the exact start */}
          <g transform="translate(1006 486)">
            <ellipse className="realm-dive-shadow" cx={0} cy={0} rx={30} ry={9} fill="url(#tqShadow)" opacity={0} />
            <g className="realm-dive-body">
              <g fill="none" stroke="#4f7e3a">
                <path d="M-4 26 q10 -20 24 -6 q12 14 26 -4 q12 -16 24 2 q9 12 5 24" stroke="#74a84e" strokeWidth={6} strokeLinecap="round" />
                <path d="M80 46 q10 -7 4 -20 q-9 -5 -14 2 q4 9 10 18 Z" fill="#86b85c" stroke="#4f7e3a" strokeWidth={1.3} />
              </g>
              <circle cx={76} cy={34} r={1.8} fill="#3e3326" />
            </g>
          </g>
          {/* whale (SW): breaches & dives, offset phase */}
          <g transform="translate(150 560)">
            <ellipse className="realm-dive-shadow" cx={0} cy={0} rx={34} ry={10} fill="url(#tqShadow)" opacity={0} style={{ animationDelay: '-7.5s' }} />
            <g className="realm-dive-body" style={{ animationDelay: '-7.5s' }}>
              <path d="M-30 6 q18 -22 54 -12 q16 5 22 0 q-2 11 -14 12 q-28 11 -62 4 q-5 -4 0 -8 Z" fill="#7fb1b4" stroke="#5e9298" strokeWidth={1.3} />
              <path d="M26 -4 q9 4 11 10" fill="none" stroke="#5e9298" strokeWidth={1.3} />
              <circle cx={-18} cy={2} r={1.8} fill="#3e3326" />
            </g>
          </g>
          {/* a small fish-school (E) that dives too */}
          <g transform="translate(1060 360)">
            <g className="realm-dive-body" style={{ animationDelay: '-4s' }} stroke="#5f9aa0" strokeWidth={1.5} fill="none" opacity={0.8}>
              <path d="M0 0 q7 -5 14 0 q-7 5 -14 0 Z M14 0 l7 -3 v6 Z" />
            </g>
          </g>
          {/* boats: long slow sail back & forth (outer) + a gentle bob (inner) */}
          <g transform="translate(150 150)">
            <g className="realm-boat-sail">
              <g className="realm-boat-bob">
                <g stroke="#5a4a2e" strokeWidth={1.1} strokeLinejoin="round">
                  <path d="M-20 8 H20 L13 19 H-13 Z" fill="#cf7f50" />
                  <path d="M0 8 V-24 M-9 8 V-16 M9 8 V-16" strokeWidth={1.3} />
                  <path d="M0 -22 q13 4 13 12 q-7 -2 -13 0 Z" fill="#f6ead0" />
                  <path d="M0 -18 q-11 3 -11 11 q6 -2 11 0 Z" fill="#f0e3bc" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(1030 210)">
            <g className="realm-boat-sail" style={{ animationDelay: '-12s' }}>
              <g className="realm-boat-bob" style={{ animationDelay: '-2s' }}>
                <g stroke="#5a4a2e" strokeWidth={1.1} strokeLinejoin="round">
                  <path d="M-18 8 H18 L12 18 H-12 Z" fill="#cf7f50" />
                  <path d="M0 8 V-22 M9 8 V-14" strokeWidth={1.2} />
                  <path d="M0 -20 q-12 4 -12 11 q7 -2 12 0 Z" fill="#f6ead0" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(440 742)">
            <g className="realm-boat-sail" style={{ animationDelay: '-20s' }}>
              <g className="realm-boat-bob" style={{ animationDelay: '-3.5s' }}>
                <g stroke="#5a4a2e" strokeWidth={1} strokeLinejoin="round">
                  <path d="M-16 7 H16 L11 16 H-11 Z" fill="#cf7f50" />
                  <path d="M0 7 V-20 M-8 7 V-13" strokeWidth={1.1} />
                  <path d="M0 -18 q11 4 11 10 q-6 -2 -11 0 Z" fill="#f6ead0" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(1090 560)">
            <g className="realm-boat-sail" style={{ animationDelay: '-6s' }}>
              <g className="realm-boat-bob" style={{ animationDelay: '-1s' }}>
                <g stroke="#5a4a2e" strokeWidth={1} strokeLinejoin="round">
                  <path d="M-15 7 H15 L10 16 H-10 Z" fill="#cf7f50" />
                  <path d="M0 7 V-20 M8 7 V-13" strokeWidth={1.1} />
                  <path d="M0 -18 q-11 4 -11 10 q6 -2 11 0 Z" fill="#f6ead0" />
                </g>
              </g>
            </g>
          </g>
        </g>
      )}

      {/* ===== FRAME · COMPASS · TITLE ===== */}
      {/* Mountain-ring border: peaks face INWARD on all four sides (top→down,
          bottom→up, left→right, right→left), with solid corner medallions drawn
          last to cleanly cap where the strips overlap. */}
      <g opacity={0.9} pointerEvents="none">
        <rect x={0} y={0} width={1200} height={46} fill="url(#tqRingH)" />
        <g transform="translate(0 820) scale(1 -1)">
          <rect x={0} y={0} width={1200} height={46} fill="url(#tqRingH)" />
        </g>
        <g transform="translate(0 820) rotate(-90)">
          <rect x={0} y={0} width={820} height={46} fill="url(#tqRingH)" />
        </g>
        <g transform="translate(1200 0) rotate(90)">
          <rect x={0} y={0} width={820} height={46} fill="url(#tqRingH)" />
        </g>
        {[
          [0, 0],
          [1154, 0],
          [0, 774],
          [1154, 774]
        ].map(([cx, cy]) => (
          <g key={`corner-${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
            <rect width={46} height={46} fill="#b9774e" stroke="#a06642" strokeWidth={1} />
            <path d="M23 9 L32 23 L23 37 L14 23 Z" fill="url(#tqGold)" stroke="#9c6a14" strokeWidth={0.8} />
            <circle cx={23} cy={23} r={3} fill="#7a4a1e" />
          </g>
        ))}
      </g>
      <rect x={54} y={54} width={1092} height={712} rx={8} fill="none" stroke="url(#tqGold)" strokeWidth={5} pointerEvents="none" />

      {!lite && (
        <g transform="translate(600 126)" pointerEvents="none">
          <circle r={34} fill="#f6eed4" stroke="#b98a2e" strokeWidth={1.3} opacity={0.85} />
          <circle r={26} fill="none" stroke="#cf9a3a" strokeWidth={1.1} />
          <path d="M0 -34 L6 0 L0 34 L-6 0 Z" fill="#f6eed4" stroke="#b98a2e" strokeWidth={0.9} />
          <path d="M-34 0 L0 -6 L34 0 L0 6 Z" fill="#f6eed4" stroke="#b98a2e" strokeWidth={0.9} />
          <path d="M0 -34 L4 0 L0 34 Z" fill="#c0532b" />
          <path d="M-34 0 L0 4 L34 0 Z" fill="#cf9a3a" />
          <path d="M0 0 L16 -16 L6 -6 Z M0 0 L16 16 L6 6 Z M0 0 L-16 16 L-6 6 Z M0 0 L-16 -16 L-6 -6 Z" fill="#cf9a3a" stroke="#b98a2e" strokeWidth={0.5} />
          <circle r={4.5} fill="#c0532b" stroke="#b98a2e" strokeWidth={1} />
        </g>
      )}

      {!lite && (
        <g transform="translate(600 56)" pointerEvents="none">
          <path d="M-148 -22 L148 -22 L166 0 L148 22 L-148 22 L-166 0 Z" fill="#f6eed4" stroke="#b98a2e" strokeWidth={1.4} />
          <path d="M-148 -22 L-136 0 L-148 22 M148 -22 L136 0 L148 22" fill="none" stroke="#b98a2e" strokeWidth={0.9} />
          <text x={0} y={2} textAnchor="middle" style={{ fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '3px', fontWeight: 'bold', fill: '#43381f' }}>
            {ATLAS.name.toUpperCase()}
          </text>
          <text x={0} y={16} textAnchor="middle" style={{ fontFamily: 'Georgia, serif', fontSize: 10, fontStyle: 'italic', fill: '#9c5b3f' }}>
            An Atlas of Your Realm
          </text>
        </g>
      )}

      {!lite && (
        <g pointerEvents="none">
          <text className="realm-sealabel" x={160} y={300} textAnchor="middle">
            THE TIDES
          </text>
          <text className="realm-sealabel" x={1050} y={700} textAnchor="middle">
            here be wonders
          </text>
          <text x={540} y={494} textAnchor="middle" style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontStyle: 'italic', fill: '#46707a' }}>
            Heartmere
          </text>
          <g stroke="#3e3326" strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.5}>
            <path d="M470 120 q5 -4 10 0 q5 -4 10 0 M496 130 q4 -3 8 0 q4 -3 8 0 M452 132 q4 -3 8 0 q4 -3 8 0" />
          </g>
        </g>
      )}
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
  const { db, claimRegion, updateSettings, saveTownLayout } = useStore()
  const [claiming, setClaiming] = useState<{ id: string; name: string } | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [reading, setReading] = useState<ChronicleRecord | null>(null)
  // Which settled town the player is currently INSIDE (Level-1 view), or null on the map.
  const [enteredTown, setEnteredTown] = useState<string | null>(null)

  if (!db) return <div />
  const chronicle = db.settings.realmChronicle ?? []
  const completions = totalCompletions(db.quests)
  // The stage NAME (Camp..Empire) labels the era; the building COUNT is XP-driven
  // (effort-weighted) — both pure-derived, so ↩ Restore walks the town back exactly.
  const civ = civProgress(completions)
  const townBuildingCount = buildingsForXp(totalXpEarned(db.player)).count
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

      <CivilizationPanel quests={db.quests} />

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
          <RealmMap
            revealed={revealed}
            claimable={claimable > 0}
            onClaim={openClaim}
            onRead={openRead}
            onEnterTown={(id) => setEnteredTown(id)}
          />
          {/* Level-1: zoom into a settled town (placeholder iso town for now). Lives
              INSIDE the map box so it fills it cleanly instead of the tall frame. */}
          <AnimatePresence>
            {enteredTown &&
              (() => {
                const region = ATLAS.regions.find((r) => r.id === enteredTown)
                // The player's saved arrangement for THIS town (a sealed override
                // layer — never feeds the XP-derived count above, so ↩ Restore stays
                // exact). Absent town = pure auto-layout.
                const overrides = db.townLayouts?.[enteredTown]?.overrides ?? {}
                return (
                  <TownView
                    townId={enteredTown}
                    townName={region?.name ?? 'Town'}
                    stageName={civ.stageName}
                    buildingCount={townBuildingCount}
                    overrides={overrides}
                    biome={REGION_BIOME[enteredTown] ?? 'meadow'}
                    onEditLayout={(next) => void saveTownLayout(enteredTown, next)}
                    onExit={() => setEnteredTown(null)}
                  />
                )
              })()}
          </AnimatePresence>
          {/* DEV-ONLY: tool to author town positions on the flat overworld image.
              Compiled out of production by Vite (import.meta.env.DEV → false). */}
          {import.meta.env.DEV && (
            <TownPlacer towns={ATLAS.regions.map((r) => ({ id: r.id, name: r.name }))} />
          )}
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
        <RealmMap revealed={revealed} lite />
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
