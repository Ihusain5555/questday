import { useEffect, useState } from 'react'
import { FrictionPrompt } from '../app/FrictionPrompt'
import { BlockScreen } from '../app/BlockScreen'
import type { FrictionTrigger } from '../../preload'

/**
 * Contents of the dedicated, always-on-top friction window. It pops over
 * whatever app the user just opened — visible even when the main QuestDay
 * window is closed to the tray. Hosts BOTH the §8 tier-3 soft-friction prompt
 * and the tier-4 block screen (the trigger's `kind` picks which).
 */
export function FrictionWindow(): JSX.Element | null {
  const [data, setData] = useState<FrictionTrigger | null>(null)

  useEffect(() => {
    const off = window.questday.activeMode.onFriction(setData)
    // Cover the case where the prompt fired before this window's listener was ready.
    void window.questday.friction.requestPending().then((p) => {
      if (p) setData(p)
    })
    return off
  }, [])

  if (!data) return null

  const resolve = (proceeded: boolean) => {
    void window.questday.friction.dismiss(proceeded)
    setData(null)
  }

  if (data.kind === 'block') {
    return (
      <BlockScreen
        appName={data.appName}
        questTitle={data.questTitle}
        breakMinutes={data.breakMinutes}
        onBack={() => resolve(false)}
        onBreak={() => resolve(true)}
      />
    )
  }

  return (
    <FrictionPrompt
      appName={data.appName}
      questTitle={data.questTitle}
      onProceed={() => resolve(true)}
      onCancel={() => resolve(false)}
    />
  )
}
