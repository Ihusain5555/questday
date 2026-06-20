import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Target, type Transition } from 'framer-motion'
import { Star, Ticket, Flag } from '@phosphor-icons/react'
import { useStore } from '../state/store'
import { CountUp } from './CountUp'
import { FlameIcon } from './RewardIcons'
import { BUILDING_SVG } from '../app/townBuildings'
import { play } from '../app/arcade/sound'
import { REALM_COMING_SOON } from '@shared/config/featureGates'

// viewBox framing the 'hall' building art (drawn around local origin) as a small badge.
const HALL_VIEWBOX = '-64 -116 128 144'

// On-brand confetti (Clay Fantasy palette — no slop purple).
const PARTICLE_COLORS = ['#2fb380', '#3fe0a8', '#f5b938', '#ffcf5c', '#ff6b6b', '#b566d6']
const DISMISS_MS = 2400

/**
 * Juicy, brief, rewarding completion animation (§6). Renders over whichever
 * window completed the quest. Auto-dismisses; click to dismiss early. Purely
 * celebratory — never punitive.
 *
 * Respects the OS "reduce motion" preference (tone + accessibility): when it's on,
 * the same reward card still appears, but instantly — no flying confetti, no spring
 * pops. The animations are framer-motion JS transforms, so a CSS prefers-reduced-
 * motion rule can't reach them; `useReducedMotion()` is the only correct gate.
 */
export function CompletionCelebration(): JSX.Element {
  // Subscribe to just these slices so a celebration toast doesn't re-render on
  // every unrelated data change (and vice-versa).
  const celebration = useStore((s) => s.celebration)
  const clearCelebration = useStore((s) => s.clearCelebration)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!celebration) return
    // A satisfying completion chime (a brighter flourish on a jackpot bonus). The sound
    // module self-checks mute, so this stays silent when the user has muted SFX.
    play(celebration.bonus?.kind === 'jackpot' ? 'jackpot' : 'complete')
    // A mutation is a jackpot moment — let it land a beat longer.
    const id = setTimeout(
      clearCelebration,
      celebration.expedition || celebration.civ?.grewBuildings ? DISMISS_MS + 1200 : DISMISS_MS
    )
    return () => clearTimeout(id)
  }, [celebration, clearCelebration])

  // Stable particle field per celebration instance. Suppressed entirely under
  // reduced motion (the confetti is the most motion-heavy element).
  const particles = useMemo(() => {
    if (!celebration || reduce) return []
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4
      const dist = 80 + Math.random() * 120
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.12
      }
    })
  }, [celebration, reduce])

  // Reduced-motion: render at the final state with no entrance animation/delay.
  // Otherwise use the supplied spring/scale entrance unchanged.
  const enter = (initial: Target, animate: Target, transition: Transition) =>
    reduce
      ? { initial: false as const, animate, transition: { duration: 0 } as Transition }
      : { initial, animate, transition }

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          className="celebrate-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.08 : 0.18 }}
          onClick={clearCelebration}
        >
          <div className="celebrate-stage">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="particle"
                style={{ background: p.color, width: p.size, height: p.size }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
              />
            ))}

            <motion.div
              className="celebrate-card"
              {...enter(
                { scale: 0.5, opacity: 0, y: 10 },
                { scale: 1, opacity: 1, y: 0 },
                { type: 'spring', stiffness: 360, damping: 18 }
              )}
              exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            >
              <motion.div
                className="celebrate-emoji"
                {...enter(
                  { scale: 0, rotate: -30 },
                  { scale: 1, rotate: 0 },
                  { type: 'spring', stiffness: 300, damping: 12, delay: 0.05 }
                )}
              >
                🎉
              </motion.div>
              <div className="celebrate-title">Quest complete!</div>
              <div className="celebrate-quest">{celebration.questTitle}</div>

              <div className="celebrate-rewards">
                <motion.span
                  className="reward-xp"
                  {...enter(
                    { scale: 0.6, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.18, type: 'spring', stiffness: 320, damping: 14 }
                  )}
                >
                  +<CountUp value={celebration.award.xpGained} /> XP
                </motion.span>
              </div>

              {celebration.bonus && (
                <motion.div
                  className={`celebrate-bonus celebrate-bonus-${celebration.bonus.kind}`}
                  {...enter(
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.26, type: 'spring', stiffness: 300, damping: 12 }
                  )}
                >
                  {celebration.bonus.kind === 'jackpot' ? '🎁 Jackpot bonus' : '✨ Bonus'} +
                  {celebration.bonus.xp} XP
                </motion.div>
              )}

              {celebration.award.leveledUp && (
                <motion.div
                  className="celebrate-level"
                  {...enter(
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.34, type: 'spring', stiffness: 300, damping: 12 }
                  )}
                >
                  <Star size={17} weight="fill" /> Level up! → {celebration.award.newPlayer.level}
                </motion.div>
              )}

              {celebration.award.newStreak > 1 && (
                <motion.div
                  className="celebrate-streak"
                  {...enter({ opacity: 0 }, { opacity: 1 }, { delay: 0.4 })}
                >
                  <FlameIcon size={16} /> {celebration.award.newStreak}-day streak
                  {celebration.award.streakMultiplier > 1 &&
                    ` (+${Math.round((celebration.award.streakMultiplier - 1) * 100)}% bonus)`}
                </motion.div>
              )}

              {!REALM_COMING_SOON && celebration.expedition && (
                <motion.div
                  className="celebrate-region"
                  {...enter(
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.5, type: 'spring', stiffness: 280, damping: 12 }
                  )}
                >
                  <Flag size={16} weight="fill" /> Expedition earned — chart a region in your Realm
                </motion.div>
              )}

              {!REALM_COMING_SOON && (celebration.civ?.grewBuildings ? (
                <motion.div
                  className="celebrate-civ-grew"
                  {...enter(
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.52, type: 'spring', stiffness: 280, damping: 12 }
                  )}
                >
                  <span className="celebrate-building-sprite" aria-hidden>
                    <svg viewBox={HALL_VIEWBOX} role="img">
                      <g dangerouslySetInnerHTML={{ __html: BUILDING_SVG['hall'] }} />
                    </svg>
                  </span>
                  Your {celebration.civ.stageName} grew —{' '}
                  {celebration.civ.grewBuildings === 1
                    ? 'a new building rose'
                    : `${celebration.civ.grewBuildings} new buildings rose`}
                </motion.div>
              ) : celebration.civ?.atCap ? (
                <motion.div
                  className="celebrate-civ-full"
                  {...enter(
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1 },
                    { delay: 0.52, type: 'spring', stiffness: 280, damping: 12 }
                  )}
                >
                  <span className="celebrate-building-sprite" aria-hidden>
                    <svg viewBox={HALL_VIEWBOX} role="img">
                      <g dangerouslySetInnerHTML={{ __html: BUILDING_SVG['hall'] }} />
                    </svg>
                  </span>
                  Your {celebration.civ.stageName} stands in full glory
                </motion.div>
              ) : celebration.civ && celebration.civ.toNext != null ? (
                <motion.div
                  className="celebrate-civ-progress"
                  {...enter({ opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: 0.52 })}
                >
                  <span className="civ-progress-bar" aria-hidden>
                    <span
                      className="civ-progress-fill"
                      style={{ width: `${celebration.civ.percent}%` }}
                    />
                  </span>
                  {celebration.civ.toNext} to your next building
                </motion.div>
              ) : null)}

              {celebration.ticket && (
                <motion.div
                  className="celebrate-ticket"
                  {...enter({ opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: 0.6 })}
                >
                  <Ticket size={16} weight="fill" /> +1 arcade ticket
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
