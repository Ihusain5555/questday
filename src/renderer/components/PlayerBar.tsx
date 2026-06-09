import { xpForLevel } from '@shared/engine/rewards'
import type { PlayerState } from '@shared/types'
import { Sword } from '@phosphor-icons/react'
import { CoinIcon, FlameIcon, StarBadge } from './RewardIcons'

interface Props {
  player: PlayerState
  /** Shown as the active-quests stat when provided. */
  activeCount?: number
  /** Compact = the widget strip (small star, thin bar, no labels row). */
  compact?: boolean
}

/**
 * The player status bar (gaming look): level star with the XP bar growing out
 * of it (current/needed toward the next level), coins, and streak. The star,
 * coin, and flame are bespoke dimensional glyphs (see RewardIcons).
 */
export function PlayerBar({ player, activeCount, compact = false }: Props): JSX.Element {
  const need = xpForLevel(player.level)
  const pct = Math.max(0, Math.min(100, Math.round((player.xp / need) * 100)))

  if (compact) {
    return (
      <div className="player-bar compact" title={`Level ${player.level} — ${player.xp}/${need} XP`}>
        <StarBadge level={player.level} size={26} />
        <div className="xp-track thin">
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="pstat">
          <CoinIcon size={15} />
          {player.currency}
        </span>
        <span className="pstat">
          <FlameIcon size={15} />
          {player.streakCount}
        </span>
      </div>
    )
  }

  return (
    <div className="card player-bar">
      <StarBadge level={player.level} />
      <div className="xp-wrap">
        <div className="xp-labels">
          <span className="xp-level-label">Level {player.level}</span>
          <span className="xp-amount">
            {player.xp}/{need} XP
          </span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="player-stats">
        <span className="pstat" title="Coins — spend them in your World">
          <CoinIcon size={19} />
          {player.currency}
        </span>
        <span className="pstat" title="Day streak — XP bonus up to +25%">
          <FlameIcon size={19} />
          {player.streakCount}
        </span>
        {activeCount !== undefined && (
          <span className="pstat" title="Active quests">
            <Sword size={17} weight="fill" color="var(--brand)" />
            {activeCount}
          </span>
        )}
      </div>
    </div>
  )
}
