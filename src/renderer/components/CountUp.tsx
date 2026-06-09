import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  /** Animation length. Set 0 (or reduced-motion) to show the value instantly. */
  durationMs?: number
  prefix?: string
  suffix?: string
}

/**
 * Counts up from 0 to `value` with an ease-out — the "tiny felt reward" the
 * research flags as the retention driver. Respects prefers-reduced-motion.
 */
export function CountUp({ value, durationMs = 700, prefix = '', suffix = '' }: Props): JSX.Element {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || durationMs <= 0) {
      setDisplay(value)
      return
    }
    let start: number | null = null
    const tick = (t: number): void => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setDisplay(Math.round(value * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  return (
    <>
      {prefix}
      {display}
      {suffix}
    </>
  )
}
