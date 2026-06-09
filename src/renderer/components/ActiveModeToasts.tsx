import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Hourglass, Bell, X } from '@phosphor-icons/react'
import type { ActiveModeNotice } from '../../preload'

const AUTO_DISMISS_MS = 12000

/**
 * In-app surface for active-mode reminders/nudges (§8). Non-blocking, dismissible,
 * snoozable. Rendered on the always-present widget so awareness stays ambient.
 */
export function ActiveModeToasts(): JSX.Element {
  const [toasts, setToasts] = useState<ActiveModeNotice[]>([])

  useEffect(() => {
    return window.questday.activeMode.onNotify((notice) => {
      setToasts((t) => [...t.filter((x) => x.id !== notice.id), notice])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== notice.id)), AUTO_DISMISS_MS)
    })
  }, [])

  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id))
  const snooze = (id: string) => {
    void window.questday.activeMode.snooze()
    dismiss(id)
  }

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((n) => (
          <motion.div
            key={n.id}
            className={`toast ${n.kind}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="toast-body">
              <div className="toast-title">
                {n.kind === 'nudge' ? (
                  <Hourglass size={15} weight="fill" />
                ) : (
                  <Bell size={15} weight="fill" />
                )}
                {n.title}
              </div>
              <div className="toast-text">{n.body}</div>
            </div>
            <div className="toast-actions">
              <button className="ghost" onClick={() => snooze(n.id)}>
                Snooze
              </button>
              <button className="ghost" aria-label="Dismiss" onClick={() => dismiss(n.id)} title="Dismiss">
                <X size={14} weight="bold" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
