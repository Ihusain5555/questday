import { useState } from 'react'
import { useStore } from '../../state/store'
import { balance } from '@shared/config/balance'
import { GameController, Ticket, Trophy, Play } from '@phosphor-icons/react'
import { CoinIcon } from '../../components/RewardIcons'
import { play as playSfx, isMuted, toggleMuted } from './sound'
import { AimTrainer } from './games/AimTrainer'
import { ReactionTime } from './games/ReactionTime'
import { MemoryMatch } from './games/MemoryMatch'
import { Snake } from './games/Snake'
import { BlockDrop } from './games/BlockDrop'
import { BubblePop } from './games/BubblePop'
import { LaneDash } from './games/LaneDash'
import { SpikeRush } from './games/SpikeRush'
import { FruitSlice } from './games/FruitSlice'
import { RoadHopper } from './games/RoadHopper'
import { MazeMuncher } from './games/MazeMuncher'
import { ColorClash } from './games/ColorClash'
import { FlashRecall } from './games/FlashRecall'
import { NBack } from './games/NBack'

type GameKey = keyof typeof balance.arcade.games

/** Registry — adding a game = one balance entry + one component here. */
const GAME_COMPONENTS: Record<string, (props: { onFinish: (score: number) => void }) => JSX.Element> = {
  aim: AimTrainer,
  reaction: ReactionTime,
  memory: MemoryMatch,
  snake: Snake,
  blockdrop: BlockDrop,
  bubble: BubblePop,
  runner: LaneDash,
  rhythm: SpikeRush,
  fruit: FruitSlice,
  hopper: RoadHopper,
  maze: MazeMuncher,
  colorclash: ColorClash,
  flashrecall: FlashRecall,
  nback: NBack
}

interface RoundResult {
  key: GameKey
  score: number
  coins: number
  newBest: boolean
}

/**
 * 🕹️ The Arcade (v1.4): ticket-gated minigames. Tickets come ONLY from quest
 * completions (capped per day, never expire) — the arcade is an earned reward,
 * not a coin farm. A good round pays a small capped coin bonus. Non-punitive:
 * quitting cashes out, bests only ever celebrate.
 */
export function ArcadeView(): JSX.Element {
  const { db, spendArcadeTicket, finishArcadeRound } = useStore()
  const [playing, setPlaying] = useState<GameKey | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [muted, setMuted] = useState(isMuted())

  if (!db) return <div>Loading…</div>
  const tickets = db.player.arcadeTickets
  const games = Object.entries(balance.arcade.games) as [GameKey, (typeof balance.arcade.games)[GameKey]][]

  // One sound toggle for the whole arcade (persisted per window via localStorage).
  const muteBtn = (
    <button
      className="arcade-mute"
      title={muted ? 'Sound off — click for sound' : 'Sound on — click to mute'}
      onClick={() => setMuted(toggleMuted())}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )

  const play = async (key: GameKey) => {
    setResult(null)
    if (await spendArcadeTicket()) setPlaying(key)
  }

  const onFinish = async (score: number) => {
    const key = playing
    setPlaying(null)
    if (!key) return
    const { coins, newBest } = await finishArcadeRound(key, score)
    if (newBest) playSfx('best')
    setResult({ key, score, coins, newBest })
  }

  if (playing) {
    const Game = GAME_COMPONENTS[playing]
    const cfg = balance.arcade.games[playing]
    return (
      <div>
        <div className="view-head">
          <h2>
            {cfg.emoji} {cfg.name}
          </h2>
          <span className="garden-coins">
            {muteBtn}
            <Ticket size={15} weight="fill" /> {tickets}
          </span>
        </div>
        <Game onFinish={(s) => void onFinish(s)} />
      </div>
    )
  }

  return (
    <div>
      <div className="view-head">
        <h2>
          <GameController size={20} weight="fill" /> Arcade
        </h2>
        <span className="garden-coins">
          {muteBtn}
          <span title="Earn a ticket with each quest you complete (up to 3/day). Tickets never expire.">
            <Ticket size={15} weight="fill" /> {tickets} {tickets === 1 ? 'ticket' : 'tickets'}
          </span>
        </span>
      </div>
      <p className="tagline">
        Earned fun: every quest you complete drops an arcade ticket (up to{' '}
        {balance.arcade.ticketsPerDay}/day — they never expire). Do well in a round and a small
        coin bonus comes back with you. 🪙
      </p>

      {result && (
        <div className="card arcade-result">
          {balance.arcade.games[result.key].emoji} <strong>{balance.arcade.games[result.key].name}</strong>
          {' — '}score {result.score}
          {result.coins > 0 && (
            <span className="arcade-result-coins">
              {' · '}+{result.coins} <CoinIcon size={13} />
            </span>
          )}
          {result.newBest && (
            <span className="arcade-result-best">
              {' · '}
              <Trophy size={13} weight="fill" color="var(--gold)" /> new best!
            </span>
          )}
        </div>
      )}

      {tickets === 0 && (
        <div className="placeholder arcade-empty">
          <Ticket size={16} weight="fill" /> No tickets right now — your next quest completion earns
          one. The arcade will be here waiting (tickets never expire).
        </div>
      )}

      <div className="arcade-cards">
        {games.map(([key, cfg]) => {
          const best = db.arcade.best[key]
          return (
            <div className="card arcade-card" key={key}>
              <div className="arcade-emoji">{cfg.emoji}</div>
              <div className="arcade-name">{cfg.name}</div>
              <div className="meta-dim arcade-blurb">{cfg.blurb}</div>
              <div className="meta-dim arcade-card-meta">
                {best !== undefined ? (
                  <>
                    <Trophy size={12} weight="fill" color="var(--gold)" /> best: {best}
                  </>
                ) : (
                  'no rounds yet'
                )}{' '}
                · up to {cfg.max} <CoinIcon size={12} />
              </div>
              <button
                className="primary"
                disabled={tickets <= 0}
                title={tickets <= 0 ? 'Complete a quest to earn a ticket' : 'Play one round (1 ticket)'}
                onClick={() => void play(key)}
              >
                <Play size={15} weight="fill" /> Play
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
