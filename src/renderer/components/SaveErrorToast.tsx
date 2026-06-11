import { useStore } from '../state/store'
import { WarningCircle } from '@phosphor-icons/react'

/**
 * Surfaces a failed save (e.g. a transient Windows file lock from AV/OneDrive) so
 * a dropped change is never silent. The last-good state is kept; the user can
 * dismiss and retry the action. Tone rule: informative, not punitive.
 */
export function SaveErrorToast(): JSX.Element | null {
  const saveError = useStore((s) => s.saveError)
  const clearSaveError = useStore((s) => s.clearSaveError)
  if (!saveError) return null
  return (
    <div className="save-toast" role="alert">
      <WarningCircle size={18} weight="fill" />
      <span className="save-toast-text">{saveError}</span>
      <button className="ghost" onClick={clearSaveError}>
        Dismiss
      </button>
    </div>
  )
}
