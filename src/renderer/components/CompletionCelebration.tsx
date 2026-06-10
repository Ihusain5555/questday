import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Ticket, Flag } from '@phosphor-icons/react'
import { useStore } from '../state/store'
import { CountUp } from './CountUp'
import { CoinIcon, FlameIcon } from './RewardIcons'

// On-brand confetti (Clay Fantasy palette — no slop purple).
const PARTICLE_COLORS = ['#2fb380', '#3fe0a8', '#f5b938', '#ffcf5c', '#ff6b6b', '#b566d6']
const DISMISS_MS = 2400

/**
 * Juicy, brief, rewarding completion animation (§6). Renders over whichever
 * window completed the quest. Auto-dismisses; click to dismiss early. Purely
 * celebratory — never punitive.
 */
export function CompletionCelebration(): JSX.Element {
  const { celebration, clearCelebration } = useStore()

  useEffect(() => {
    if (!celebration) return
    // A mutation is a jackpot moment — let it land a beat longer.
    const id = setTimeout(
      clearCelebration,
      celebration.expedition ? DISMISS_MS + 1200 : DISMISS_MS
    )
    return () => clearTimeout(id)
  }, [celebration, clearCelebration])

  // Stable particle field per celebration instance.
  const particles = useMemo(() => {
    if (!celebration) return []
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
  }, [celebration])

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          className="celebrate-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
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
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            >
              <motion.div
                className="celebrate-emoji"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.05 }}
              >
                🎉
              </motion.div>
              <div className="celebrate-title">Quest complete!</div>
              <div className="celebrate-quest">{celebration.questTitle}</div>

              <div className="celebrate-rewards">
                <motion.span
                  className="reward-xp"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.18, type: 'spring', stiffness: 320, damping: 14 }}
                >
                  +<CountUp value={celebration.award.xpGained} /> XP
                </motion.span>
                <motion.span
                  className="reward-cur"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.26, type: 'spring', stiffness: 320, damping: 14 }}
                >
                  +<CountUp value={celebration.award.currencyGained} /> <CoinIcon size={16} />
                </motion.span>
              </div>

              {celebration.award.leveledUp && (
                <motion.div
                  className="celebrate-level"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.34, type: 'spring', stiffness: 300, damping: 12 }}
                >
<Star size={17} weight="fill" /> Level up! → {celebration.award.newPlayer.level}
                </motion.div>
              )}

              {celebration.award.newStreak > 1 && (
                <motion.div
                  className="celebrate-streak"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
<FlameIcon size={16} /> {celebration.award.newStreak}-day streak
                  {celebration.award.streakMultiplier > 1 &&
                    ` (+${Math.round((celebration.award.streakMultiplier - 1) * 100)}% bonus)`}
                </motion.div>
              )}

              {celebration.expedition && (
                <motion.div
                  className="celebrate-region"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 12 }}
                >
                  <Flag size={16} weight="fill" /> Expedition earned — chart a region in your Realm
                </motion.div>
              )}

              {celebration.ticket && (
                <motion.div
                  className="celebrate-ticket"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
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
