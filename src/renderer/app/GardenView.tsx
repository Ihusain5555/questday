import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { balance } from '@shared/config/balance'
import {
  activeItems,
  activeTheme,
  dailyStock,
  earnedVisitors,
  harvestPayout,
  isHarvestable,
  isMature,
  itemEmoji,
  mutationByKey,
  nextPlotUpgrade,
  plotSize,
  seasonFor,
  speciesByKey,
  weatherFor
} from '@shared/engine/garden'
import type { Garden } from '@shared/types'
import { CoinIcon } from '../components/RewardIcons'
import {
  Basket,
  ArrowsOutCardinal,
  X,
  Plant,
  Crown,
  Barn,
  Buildings,
  Rocket,
  Sun,
  Wind,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Flower,
  Leaf,
  Snowflake
} from '@phosphor-icons/react'

// The five worlds, the seasons, and weather get real icons (consistent with the
// rest of the app) — only the harvestable plants stay as garden art.
const THEME_ICON: Record<string, typeof Plant> = {
  garden: Plant,
  medieval: Crown,
  farm: Barn,
  city: Buildings,
  space: Rocket
}
const SEASON_ICON: Record<string, typeof Plant> = {
  spring: Flower,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake
}
const WEATHER_ICON: Record<string, typeof Plant> = {
  sunny: Sun,
  breezy: Wind,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow
}
function ThemeGlyph({ k, size }: { k: string; size: number }): JSX.Element {
  const I = THEME_ICON[k] ?? Plant
  return <I size={size} weight="fill" />
}
function SeasonGlyph({ k, size }: { k: string; size: number }): JSX.Element {
  const I = SEASON_ICON[k] ?? Sun
  return <I size={size} weight="fill" />
}
function WeatherGlyph({ k, size }: { k: string; size: number }): JSX.Element {
  const I = WEATHER_ICON[k] ?? Sun
  return <I size={size} weight="fill" />
}

/** Local YYYY-MM-DD (drives the daily shop rotation). */
function todayStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const rarityMeta = (key: string) =>
  balance.garden.rarities[key as keyof typeof balance.garden.rarities] ?? balance.garden.rarities.common

/**
 * The reward world (§7 vision, Grow-a-Garden inspired): a world that grows out
 * of your effort, in the game style you like. Coins buy seeds; completions
 * grow them (and can roll positive-only weather mutations); ripe crops are
 * harvested for coins and regrow forever. Structurally non-punitive: a world
 * only ever gains — nothing wilts, nothing leaves, harvesting never removes.
 */
export function GardenView(): JSX.Element {
  const {
    db,
    plantGardenItem,
    moveGardenItem,
    setWorldTheme,
    harvestGardenItem,
    harvestFlash,
    clearHarvestFlash,
    dewNews,
    clearDewNews
  } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)

  // The payout flash fades on its own.
  useEffect(() => {
    if (!harvestFlash) return
    const id = setTimeout(clearHarvestFlash, 2600)
    return () => clearTimeout(id)
  }, [harvestFlash, clearHarvestFlash])

  if (!db) return <div>Loading…</div>
  const g = db.garden
  const theme = activeTheme(g)
  const items = activeItems(g)
  const level = db.player.level
  const coins = db.player.currency
  const sel = selected ? speciesByKey(theme.key, selected) : null
  const { cols, rows } = plotSize(level, items)
  const now = new Date()
  const season = seasonFor(now)
  const weather = weatherFor(now)
  const stock = dailyStock(theme.key, todayStr())

  const itemAt = (x: number, y: number) => items.find((i) => i.x === x && i.y === y)
  const moving = movingId ? items.find((i) => i.id === movingId) : null
  const inspected = inspectId ? items.find((i) => i.id === inspectId) : null
  const inspectedSpecies = inspected ? speciesByKey(inspected.theme, inspected.species) : null
  const growing = items.filter((i) => !isMature(i)).length
  const ripe = items.filter((i) => isHarvestable(i)).length
  const visitors = earnedVisitors(theme, g.bestStreak)
  const nextVisitor = theme.visitorMilestones.find((m) => m.streak > g.bestStreak)
  const nextUpgrade = nextPlotUpgrade(level)
  const alwaysStocked = theme.catalog.filter((c) => c.rarity === 'common' || c.rarity === 'uncommon')
  const rotating = theme.catalog.filter((c) => c.rarity !== 'common' && c.rarity !== 'uncommon')

  const pickTheme = async (key: string) => {
    setSelected(null)
    setMovingId(null)
    setInspectId(null)
    await setWorldTheme(key)
  }

  const onFreeTile = async (x: number, y: number) => {
    if (moving) {
      await moveGardenItem(moving.id, x, y)
      setMovingId(null)
      return
    }
    if (!sel) return
    await plantGardenItem(sel.key, x, y)
    // Keep the selection if another one is still affordable — fast multi-planting.
    if (coins - sel.cost < sel.cost) setSelected(null)
  }

  // Click a placed item to inspect it (harvest/move actions live in the panel).
  const onPlacedTile = (id: string) => {
    setSelected(null)
    setMovingId(null)
    setInspectId((cur) => (cur === id ? null : id))
  }

  const startMove = () => {
    setMovingId(inspectId)
    setInspectId(null)
  }

  const harvestInspected = async () => {
    if (!inspectId) return
    await harvestGardenItem(inspectId)
    setInspectId(null)
  }

  const shopCard = (c: (typeof theme.catalog)[number], inStock: boolean) => {
    const locked = level < c.unlockLevel
    const affordable = coins >= c.cost
    const isSel = selected === c.key
    const rarity = rarityMeta(c.rarity)
    return (
      <button
        key={c.key}
        className={`shop-item rarity-${c.rarity} ${isSel ? 'selected' : ''} ${locked ? 'locked' : ''} ${
          inStock ? '' : 'out-of-stock'
        }`}
        style={{ borderColor: isSel ? undefined : `${rarity.color}55` }}
        disabled={locked || !affordable || !inStock}
        title={
          !inStock
            ? `${c.name} (${rarity.name}) — not in today's stock; rarer things rotate back in. Check tomorrow!`
            : locked
              ? `${c.name} unlocks at level ${c.unlockLevel}`
              : `${c.name} (${rarity.name}) — ${c.cost} coins. ${
                  c.kind === 'plant'
                    ? `Grows ${c.stages.join(' → ')}: one step per quest completed here. Ripe = harvest 🧺 ${c.harvestValue} coins (mutations multiply!), then it regrows.`
                    : 'A decoration — placed complete right away.'
                }${affordable ? '' : ` Needs ${c.cost} coins (you have ${coins}).`}`
        }
        onClick={() => {
          setMovingId(null)
          setInspectId(null)
          setSelected(isSel ? null : c.key)
        }}
      >
        <span className="shop-emoji">{c.stages[c.stages.length - 1]}</span>
        <span className="shop-name">{c.name}</span>
        <span className="shop-rarity" style={{ color: rarity.color }}>
          {rarity.name}
        </span>
        <span className="shop-stages">
          {c.kind === 'plant' ? `${c.stages.join('→')} · 🧺 ${c.harvestValue}` : '✨ ready now'}
        </span>
        <span className="shop-cost">
          {locked ? (
            `Lv ${c.unlockLevel}`
          ) : (
            <>
<CoinIcon size={12} /> {c.cost}
            </>
          )}
        </span>
      </button>
    )
  }

  return (
    <div>
      <div className="view-head">
        <h2>
          <ThemeGlyph k={theme.key} size={20} /> Your {theme.name.toLowerCase()}
        </h2>
        <span className="season-badge" title={`It's ${season.name.toLowerCase()} — purely cosmetic, nothing ever wilts`}>
          <SeasonGlyph k={season.key} size={14} /> {season.name}
        </span>
        <span
          className="season-badge weather-badge"
          title={`Today's weather. It decides which mutations can appear when plants grow — mutations only ever ADD harvest value.`}
        >
          <WeatherGlyph k={weather.key} size={14} /> {weather.name}
        </span>
        <span className="garden-coins" title="Earned by completing quests and harvesting — shared across all worlds">
<CoinIcon size={15} /> {coins}
          {harvestFlash && (
            <span className="harvest-flash">
              +{harvestFlash.coins} {harvestFlash.doubled ? '×2!' : ''}
            </span>
          )}
        </span>
      </div>

      {dewNews && (
        <div className="dew-banner" onClick={clearDewNews} title="Click to dismiss">
          {dewNews}
        </div>
      )}

      <div className="theme-row">
        {balance.garden.themes.map((t) => (
          <button
            key={t.key}
            className={`theme-pick ${t.key === theme.key ? 'selected' : ''}`}
            title={`${t.name} — ${t.blurb} Switching is free: every world keeps its things.`}
            onClick={() => void pickTheme(t.key)}
          >
            <span className="theme-emoji">
              <ThemeGlyph k={t.key} size={18} />
            </span>
            <span className="theme-name">{t.name}</span>
          </button>
        ))}
      </div>

      <p className="tagline">
        {theme.blurb} Every quest you complete grows something here
        {growing > 0
          ? ` (${growing} ${growing === 1 ? 'is' : 'are'} waiting on your next completions — nothing grows on its own except the daily morning dew)`
          : ''}
        {ripe > 0 ? ` — and ${ripe} ${ripe === 1 ? 'is' : 'are'} ripe for harvest 🧺` : ''}. This
        world only ever grows — an off day never costs you a thing.
      </p>

      {visitors.length > 0 && (
        <div className="visitor-row">
          {visitors.map((v) => (
            <span className="visitor" key={v.key} title={`${v.name} — moved in at a ${v.streak}-day best streak`}>
              {v.emoji}
            </span>
          ))}
          <span className="meta-dim">your companions — they never leave (and they help: see Perks)</span>
        </div>
      )}

      {inspected && inspectedSpecies && (
        <div className="inspect-bar">
          <span className="inspect-what">
            {itemEmoji(inspected)} <strong>{inspectedSpecies.name}</strong>
            {!isMature(inspected) &&
              ` — stage ${inspected.stage + 1}/${inspectedSpecies.stages.length}`}
            {(inspected.mutations ?? []).map((k) => {
              const m = mutationByKey(k)
              return m ? (
                <span key={k} className="inspect-mut" title={`${m.name} — next harvest ×${m.mult}`}>
                  {m.emoji} ×{m.mult}
                </span>
              ) : null
            })}
            {(inspected.harvests ?? 0) > 0 && (
              <span className="meta-dim"> · harvested {inspected.harvests}×</span>
            )}
          </span>
          {isHarvestable(inspected) && (
            <button className="primary inspect-harvest" onClick={() => void harvestInspected()}>
              <Basket size={15} weight="fill" /> Harvest +{harvestPayout(inspected, g.bestStreak)}
              <CoinIcon size={14} />
            </button>
          )}
          {!isMature(inspected) && (
            <span className="meta-dim">grows when you complete quests</span>
          )}
          <button onClick={startMove}>
            <ArrowsOutCardinal size={14} weight="bold" /> Move
          </button>
          <button aria-label="Close inspector" title="Close" onClick={() => setInspectId(null)}>
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      <div
        className={`garden-grid season-${season.key} ground-${theme.ground}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 52px)` }}
        data-selected={sel ? sel.key : undefined}
      >
        {Array.from({ length: rows }).flatMap((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const item = itemAt(x, y)
            if (item) {
              const species = speciesByKey(item.theme, item.species)
              const mature = isMature(item)
              const isMoving = movingId === item.id
              const muts = item.mutations ?? []
              return (
                <button
                  className={`g-tile planted ${mature ? 'mature' : 'growing'} ${isMoving ? 'moving' : ''} ${
                    muts.length > 0 ? 'mutated' : ''
                  } ${inspectId === item.id ? 'inspected' : ''}`}
                  key={`${x}-${y}`}
                  title={
                    isMoving
                      ? `Moving your ${species?.name ?? 'item'} — click a free tile to set it down`
                      : species
                        ? `${species.name}${
                            mature ? '' : ` — stage ${item.stage + 1}/${species.stages.length}`
                          }${
                            isHarvestable(item)
                              ? ` — ripe! Click to harvest (+${harvestPayout(item, g.bestStreak)} 🪙)`
                              : ''
                          }${muts.length > 0 ? ` — ${muts.map((k) => mutationByKey(k)?.name).join(', ')}` : ''}. Click for actions.`
                        : ''
                  }
                  onClick={() => onPlacedTile(item.id)}
                >
                  {itemEmoji(item)}
                  {muts.length > 0 && (
                    <span className="g-muts" aria-hidden>
                      {muts.map((k) => mutationByKey(k)?.emoji ?? '').join('')}
                    </span>
                  )}
                  {!mature && species && (
                    <span className="g-stage" aria-hidden>
                      {item.stage + 1}/{species.stages.length}
                    </span>
                  )}
                  {isHarvestable(item) && (
                    <span className="g-ripe" aria-hidden>
                      🧺
                    </span>
                  )}
                </button>
              )
            }
            const active = Boolean(sel || moving)
            return (
              <button
                className={`g-tile free ${active ? 'plantable' : ''}`}
                key={`${x}-${y}`}
                title={moving ? `Move it here` : sel ? `Plant ${sel.name} here` : 'A quiet spot, waiting'}
                onClick={() => void onFreeTile(x, y)}
              >
                {active ? '·' : ''}
              </button>
            )
          })
        )}
      </div>
      {nextUpgrade && (
        <p className="meta-dim garden-hint plot-hint">
          📐 Your plot grows to {nextUpgrade.cols}×{nextUpgrade.rows} at level {nextUpgrade.level}
          {' '}(every world shares the upgrade).
        </p>
      )}

      <div className="card">
        <strong>Shop</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          {moving
            ? 'Rearranging — click a free tile to set it down.'
            : sel
              ? sel.kind === 'plant'
                ? `Now click a free tile to place your ${sel.name}. It starts as ${sel.stages[0]} and grows a step each time you complete a quest here.`
                : `Now click a free tile to place your ${sel.name} — decorations appear complete right away.`
              : 'Pick something, then click a free tile to place it. Ripe crops harvest for coins and regrow — forever. Click anything placed to inspect, harvest, or move it.'}
        </p>
        <div className="shop-row">{alwaysStocked.map((c) => shopCard(c, stock.has(c.key)))}</div>
        <div className="stock-head">
          ✨ Today&apos;s rare stock <span className="meta-dim">— rotates daily, nothing is ever missable</span>
        </div>
        <div className="shop-row">
          {rotating
            .slice()
            .sort((a, b) => Number(stock.has(b.key)) - Number(stock.has(a.key)))
            .map((c) => shopCard(c, stock.has(c.key)))}
        </div>
      </div>

      <div className="card perks-card">
        <strong>Companion perks</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          Best-streak milestones bring companions, and companions bring luck. Earned once, kept
          forever:
        </p>
        <ul className="perks-list">
          <li className={g.bestStreak >= 3 ? 'earned' : ''}>
            3-day best · +{Math.round(balance.garden.harvest.perks.mutationChanceAt3 * 100)}%
            mutation chance {g.bestStreak >= 3 ? '✓' : `(best so far: ${g.bestStreak})`}
          </li>
          <li className={g.bestStreak >= 7 ? 'earned' : ''}>
            7-day best · +{Math.round(balance.garden.harvest.perks.harvestBonusAt7 * 100)}% on every
            harvest {g.bestStreak >= 7 ? '✓' : ''}
          </li>
          <li className={g.bestStreak >= 14 ? 'earned' : ''}>
            14-day best · morning dew grows {balance.garden.harvest.perks.dewPlantsAt14} plants{' '}
            {g.bestStreak >= 14 ? '✓' : ''}
          </li>
          <li className={g.bestStreak >= 30 ? 'earned' : ''}>
            30-day best · {Math.round(balance.garden.harvest.perks.doubleChanceAt30 * 100)}% chance
            a harvest pays double {g.bestStreak >= 30 ? '✓' : ''}
          </li>
        </ul>
      </div>

      {nextVisitor && (
        <p className="meta-dim garden-hint">
          {nextVisitor.emoji} A {nextVisitor.name.toLowerCase()} will move in when your best streak
          reaches {nextVisitor.streak} days (best so far: {g.bestStreak}).
        </p>
      )}
    </div>
  )
}

/** Compact, read-only world strip for the Dashboard. */
export function GardenPeek({ garden, level }: { garden: Garden; level: number }): JSX.Element {
  const theme = activeTheme(garden)
  const items = activeItems(garden)
  const { cols, rows } = plotSize(level, items)
  const visitors = earnedVisitors(theme, garden.bestStreak)
  const ripe = items.filter((i) => isHarvestable(i)).length
  if (items.length === 0) {
    return (
      <div className="placeholder garden-peek-empty">
        {theme.emoji} Your reward world awaits — complete quests to earn coins, then place your
        first {theme.key === 'garden' ? 'seed' : 'build'} in the <strong>World</strong> tab.
      </div>
    )
  }
  return (
    <div className="card garden-peek">
      <div className="label">
        Your {theme.name.toLowerCase()}{' '}
        {visitors.length > 0 && <span>{visitors.map((v) => v.emoji).join(' ')}</span>}
        {ripe > 0 && <span className="peek-ripe"> · 🧺 {ripe} ripe</span>}
      </div>
      <div
        className={`garden-grid peek ground-${theme.ground}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 26px)` }}
      >
        {Array.from({ length: rows }).flatMap((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const item = items.find((i) => i.x === x && i.y === y)
            return (
              <div className="g-tile peek" key={`${x}-${y}`}>
                {item ? itemEmoji(item) : ''}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
