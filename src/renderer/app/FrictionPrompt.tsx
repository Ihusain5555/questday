import { useEffect, useState } from 'react'
import { Compass } from '@phosphor-icons/react'

interface Props {
  appName: string
  questTitle: string | null
  /** Seconds of forced pause before "Proceed" unlocks (light friction, not a block). */
  delaySeconds?: number
  onProceed: () => void
  onCancel: () => void
}

/**
 * Soft-friction prompt (§8, tier 3). A dismissible "are you sure?" with a short
 * delay when opening something flagged distracting. Never a hard block — the
 * user can always proceed.
 */
export function FrictionPrompt({
  appName,
  questTitle,
  delaySeconds = 3,
  onProceed,
  onCancel
}: Props): JSX.Element {
  const [left, setLeft] = useState(delaySeconds)

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  return (
    <div className="modal-backdrop">
      <div className="modal friction-modal">
        <div className="friction-emoji">
          <Compass size={52} weight="fill" color="var(--brand-bright)" />
        </div>
        <h2>Hold on — is this worth it right now?</h2>
        <p className="friction-app">
          You're opening <strong>{appName}</strong>, which you flagged as distracting.
        </p>
        {questTitle ? (
          <p className="friction-quest">
            Your current quest is <strong>{questTitle}</strong>.
          </p>
        ) : (
          <p className="friction-quest">You don't have a current quest right now.</p>
        )}
        <div className="modal-actions">
          <button className="primary" onClick={onCancel}>
            Back to my quest
          </button>
          <button onClick={onProceed} disabled={left > 0}>
            {left > 0 ? `Proceed in ${left}…` : 'Proceed anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}
