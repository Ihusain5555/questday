import { ShieldCheck } from '@phosphor-icons/react'

interface Props {
  appName: string
  questTitle: string | null
  /** Length of the break pass, minutes. */
  breakMinutes: number
  onBack: () => void
  onBreak: () => void
}

/**
 * Hard-block screen (§8, tier 4). The flagged app was minimized behind this
 * window. Firm but never punishing: it's the user's own rule, and the timed
 * break pass is always one click away — a real break, not a guilt trip.
 */
export function BlockScreen({ appName, questTitle, breakMinutes, onBack, onBreak }: Props): JSX.Element {
  return (
    <div className="modal-backdrop">
      <div className="modal friction-modal block-modal">
        <div className="friction-emoji">
          <ShieldCheck size={52} weight="fill" color="var(--brand-bright)" />
        </div>
        <h2>{appName} is paused right now</h2>
        <p className="friction-app">
          You asked QuestDay to hold the line here — this is your rule, working.
        </p>
        {questTitle ? (
          <p className="friction-quest">
            Your current quest is <strong>{questTitle}</strong>.
          </p>
        ) : (
          <p className="friction-quest">You don't have a current quest right now.</p>
        )}
        <div className="modal-actions">
          <button className="primary" onClick={onBack}>
            Back to my quest
          </button>
          <button onClick={onBreak} title="A real break — your app comes back, no guilt attached.">
            Take a {breakMinutes}-min break
          </button>
        </div>
      </div>
    </div>
  )
}
