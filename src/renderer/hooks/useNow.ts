import { useEffect, useState } from 'react'

/**
 * A `Date` that refreshes on an interval so time-dependent computations
 * (active time frame, current-quest urgency) stay live without a reload.
 */
export function useNow(intervalMs = 20000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
