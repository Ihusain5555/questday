import { useState } from 'react'
import { useStore } from '../state/store'
import { isFeatureEnabled } from './features'
import { FocusView } from './FocusView'
import { EisenhowerView } from './EisenhowerView'
import { ActiveModeSettings } from './ActiveModeSettings'
import { Timer, Compass, Target } from '@phosphor-icons/react'
import { IS_MAC } from '../platform'

type Sub = 'focus' | 'matrix' | 'active'

// Sub-tools under the Productivity tab. Focus + Matrix follow their feature
// toggles (Data tab → Productivity features); Active mode is always available.
// Future productivity tools slot in here as one more entry.
const SUBS: { id: Sub; label: string; icon: JSX.Element; feature?: string }[] = [
  { id: 'focus', label: 'Focus', icon: <Timer size={15} weight="fill" />, feature: 'focus' },
  { id: 'matrix', label: 'Matrix', icon: <Compass size={15} weight="fill" />, feature: 'matrix' },
  { id: 'active', label: 'Active mode', icon: <Target size={15} weight="fill" /> }
]

/**
 * Productivity hub — groups the focus / prioritisation / distraction-guard tools
 * under ONE top-level tab so the nav stays lean. A small sub-nav switches between
 * them; toggled-off features (Data tab) drop out of the sub-nav automatically.
 */
export function ProductivityView(): JSX.Element {
  const { db } = useStore()
  const enabled = db?.settings.enabledFeatures
  // Active mode is Windows-only (its detector is Win32/PowerShell), so hide it on
  // macOS — the main process also never starts it there.
  const avail = SUBS.filter(
    (s) => (!s.feature || isFeatureEnabled(enabled, s.feature)) && !(s.id === 'active' && IS_MAC)
  )
  const [sub, setSub] = useState<Sub>('focus')
  // Fall back if the chosen sub-tool was just toggled off (never 'active' on Mac).
  const active = avail.some((s) => s.id === sub) ? sub : avail[0]?.id ?? (IS_MAC ? 'focus' : 'active')

  return (
    <div className="view productivity-view">
      <div className="subtabs">
        {avail.map((s) => (
          <button
            key={s.id}
            className={`subtab ${active === s.id ? 'on' : ''}`}
            onClick={() => setSub(s.id)}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>
      {active === 'focus' && <FocusView />}
      {active === 'matrix' && <EisenhowerView />}
      {active === 'active' && <ActiveModeSettings />}
    </div>
  )
}
