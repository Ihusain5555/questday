// QuestDay — active-mode timing helpers (§8). Pure + testable.

import type { TimeFrame } from '../types'
import { minuteOfDay } from './selectCurrentQuest'

/** Minutes from `now` until `frame` ends, accounting for midnight-wrapping frames. */
export function minutesUntilFrameEnd(frame: TimeFrame, now: Date): number {
  const cur = minuteOfDay(now)
  let diff = frame.endMinute - cur
  if (diff < 0) diff += 1440
  return diff
}
