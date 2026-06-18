import { useEffect, useState } from 'react'
import type { PrayerReminderInfo } from '@shared/types'

/**
 * Gentle full-screen prayer reminder (v1.13). SILENT by design — no audio, just a calm
 * overlay with the prayer name and a dismiss. Pulls the current reminder on mount (the
 * main process may push before React subscribes) and listens for later ones. Esc or the
 * button dismisses it. Never punishing: it greets a prayer time, never marks a miss.
 */
export function PrayerReminder(): JSX.Element | null {
  const [info, setInfo] = useState<PrayerReminderInfo | null>(null)

  useEffect(() => {
    void window.questday.prayer.requestPending().then((d) => {
      if (d) setInfo(d)
    })
    return window.questday.prayer.onShow((d) => setInfo(d))
  }, [])

  const dismiss = (): void => {
    setInfo(null)
    void window.questday.prayer.dismiss()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!info) return null

  return (
    <div className="prayer-overlay" role="dialog" aria-label={`${info.prayer} prayer time`}>
      <div className="prayer-stars" aria-hidden="true">
        <span className="prayer-moon">🌙</span>
      </div>
      <div className="prayer-arabic" lang="ar" dir="rtl">
        {info.arabic}
      </div>
      <div className="prayer-name">{info.prayer}</div>
      <div className="prayer-msg">It&rsquo;s time for {info.prayer}. Take a quiet moment.</div>
      <div className="prayer-time">{info.timeLabel}</div>
      <button className="prayer-dismiss" onClick={dismiss} autoFocus>
        Dismiss
      </button>
      <div className="prayer-hint">Press Esc to dismiss</div>
    </div>
  )
}
