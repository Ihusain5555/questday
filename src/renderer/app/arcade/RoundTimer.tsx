/**
 * RoundTimer — the shared, prominent countdown for every timed arcade game.
 *
 * Bug-list fix ("for all games make the timer more prominent — they can't see it"):
 * promotes the old tiny muted "12s" header text into a hero readout — a big
 * tabular number pinned top-centre of the play area, a thin shrinking bar, and a
 * calm→warn→urgent COLOUR shift (emerald most of the round, gold in the last ~6s,
 * warm coral in the last ~3s). Tone rule: warm coral (--fire), never alarm-red,
 * and the gentle pulse fires ONLY in the final seconds — motivating, not punishing.
 *
 * Pure presentational: it reads `timeLeft`/`total` and derives everything. One
 * source of truth for "what does N seconds left look like" across all 7 timed games.
 */
export function RoundTimer({ timeLeft, total }: { timeLeft: number; total: number }): JSX.Element {
  const t = Math.max(0, timeLeft)
  const frac = total > 0 ? Math.max(0, Math.min(1, t / total)) : 0
  // Seconds-based zones (research: 3s/6s is ideal for the ~12s rounds and still
  // reads correctly on the longer 30s/90s games — only the final stretch warms up).
  const zone = t <= 3 ? 'urgent' : t <= 6 ? 'warn' : 'calm'
  return (
    <div className={`round-timer ${zone}`} role="timer" aria-label={`${t} seconds left`}>
      <div className="round-timer-readout">
        <span className="round-timer-num">{t}</span>
        <span className="round-timer-unit">s</span>
      </div>
      <div className="round-timer-bar">
        {/* scaleX drains left→right; currentColor inherits the zone colour so the
            bar and number always agree. */}
        <i style={{ transform: `scaleX(${frac})` }} />
      </div>
    </div>
  )
}
