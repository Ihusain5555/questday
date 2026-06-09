import { motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'

interface Props {
  message: string
  onClose: () => void
}

/** Warm, dismissible carry-over message shown at a new day (§6). Never punitive. */
export function RolloverBanner({ message, onClose }: Props): JSX.Element {
  return (
    <motion.div
      className="rollover-banner"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <span className="rollover-text">{message}</span>
      <button className="ghost" aria-label="Dismiss" onClick={onClose} title="Dismiss">
        <X size={14} weight="bold" />
      </button>
    </motion.div>
  )
}
