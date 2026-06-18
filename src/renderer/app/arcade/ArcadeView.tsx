import { useState } from 'react'
import { useStore } from '../../state/store'
import { balance } from '@shared/config/balance'
import { GameController, Ticket, Trophy, Play, SpeakerSimpleHigh, SpeakerSimpleSlash, ShareNetwork } from '@phosphor-icons/react'
import { play as playSfx, isMuted, toggleMuted } from './sound'
import { ShareCardModal } from '../ShareCardModal'
import { AimTrainer } from './games/AimTrainer'
import { ReactionTime } from './games/ReactionTime'
import { MemoryMatch } from './games/MemoryMatch'
import { ColorClash } from './games/ColorClash'
import { FlashRecall } from './games/FlashRecall'
import { NBack } from './games/NBack'
import { SpanRecall } from './games/SpanRecall'
import { StopTap } from './games/StopTap'
import { TrackSwitch } from './games/TrackSwitch'
import { MentalSpin } from './games/MentalSpin'
import { GameIcon, GameBadge } from './gameIcons'

type GameKey = keyof typeof balance.arcade.games

/** Registry — adding a game = one balance entry + one component here. */
const GAME_COMPONENTS: Record<string, (props: { onFinish: (score: number) => void }) => JSX.Element> = {
  aim: AimTrainer,
  reaction: ReactionTime,
  memory: MemoryMatch,
  colorclash: ColorClash,
  flashrecall: FlashRecall,
  nback: NBack,
  spanrecall: SpanRecall,
  stoptap: StopTap,
  trackswitch: TrackSwitch,
  mentalspin: MentalSpin
}

interface RoundResult {
  key: GameKey
  score: number
  newBest: boolean
}

/** Resolve a CSS colour expression (including nested `var(--x)`) to a concrete rgb()
 *  string. Canvas `fillStyle` can't resolve CSS custom properties, so the arcade
 *  share-card needs the game's accent colour pre-resolved before it's drawn. */
function resolveCssColor(expr: string): string {
  const probe = document.createElement('span')
  probe.style.color = expr
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb || '#3fe0a8'
}

/**
 * 🕹️ The Arcade (v1.4): ticket-gated minigames. Tickets come ONLY from quest
 * completions (capped per day, never expire) — the arcade is an earned reward.
 * Non-punitive: quitting cashes out, bests only ever celebrate.
 */
export function ArcadeView(): JSX.Element {
  const { db, spendArcadeTicket, finishArcadeRound } = useStore()
  const [playing, setPlaying] = useState<GameKey | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [sharing, setSharing] = useState(false)
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
      {muted ? <SpeakerSimpleSlash size={18} weight="regular" /> : <SpeakerSimpleHigh size={18} weight="fill" />}
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
    const { newBest } = await finishArcadeRound(key, score)
    if (newBest) playSfx('best')
    setResult({ key, score, newBest })
  }

  if (playing) {
    const Game = GAME_COMPONENTS[playing]
    const cfg = balance.arcade.games[playing]
    return (
      <div>
        <div className="view-head">
          <h2>
            <GameIcon k={playing} size={20} /> {cfg.name}
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
        You get {balance.arcade.ticketsFreePerDay} free brain-breaks a day, plus one for every
        quest you finish — they never expire. Each game trains a real skill — attention, memory,
        processing speed, focus, flexibility. You get better at what you practice (no, it
        won&apos;t make you a genius — just sharper at the game).
      </p>

      {result && (
        <div className="card arcade-result">
          <GameIcon k={result.key} size={16} /> <strong>{balance.arcade.games[result.key].name}</strong>
          {' — '}score {result.score}
          {result.newBest && (
            <span className="arcade-result-best">
              {' · '}
              <Trophy size={13} weight="fill" color="var(--gold)" /> new best!
            </span>
          )}
          <button className="ghost arcade-share-btn" onClick={() => setSharing(true)}>
            <ShareNetwork size={14} weight="bold" /> Share score
          </button>
        </div>
      )}

      {sharing && result && (
        <ShareCardModal
          data={{
            kind: 'arcade',
            gameName: balance.arcade.games[result.key].name,
            accent: resolveCssColor(balance.arcade.games[result.key].color),
            score: result.score,
            best: db.arcade.best[result.key] ?? result.score,
            isBest: result.newBest
          }}
          onClose={() => setSharing(false)}
        />
      )}

      {tickets === 0 && (
        <div className="placeholder arcade-empty">
          <Ticket size={16} weight="fill" /> All out of brain-breaks for now — finish a quest to
          earn another, and you&apos;ll get {balance.arcade.ticketsFreePerDay} free again tomorrow.
        </div>
      )}

      <div className="arcade-cards">
        {games.map(([key, cfg]) => {
          const best = db.arcade.best[key]
          return (
            <div className="card arcade-card" key={key}>
              <GameBadge k={key} size={26} lg />
              <div className="arcade-name">{cfg.name}</div>
              <div className="meta-dim arcade-blurb">{cfg.blurb}</div>
              <div className="meta-dim arcade-card-meta">
                {best !== undefined ? (
                  <>
                    <Trophy size={12} weight="fill" color="var(--gold)" /> best: {best}
                  </>
                ) : (
                  'no rounds yet'
                )}
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
