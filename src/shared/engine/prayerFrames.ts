// ---------------------------------------------------------------------------
// QuestDay — prayer-aware time frames (v2 faith layer). PURE, zero-dependency.
//
// A TimeFrame may opt in to "anchor to prayer times" (`frame.prayerAnchor`). When
// it does, its EFFECTIVE window for a given day is derived from that day's on-device
// prayer times rather than its stored startMinute/endMinute — so e.g. a "Deep Work"
// frame anchored Fajr→Dhuhr shifts every day with the real prayer schedule.
//
// This is the ONLY place that turns an anchor into clock minutes. The selection
// engine (selectCurrentQuest.ts) stays prayer-agnostic: callers resolve their frames
// HERE first, then hand the resolved frames to the engine. The stored minutes remain
// the fallback for when prayer times aren't configured, so anchoring is purely
// additive and NEVER read by reward / ↩ Restore math.
// ---------------------------------------------------------------------------

import type { PrayerAnchorPoint, PrayerSettings, TimeFrame } from '../types'
import { prayerDayFor, type PrayerDayTimes } from './prayerTimes'

/** The anchor points in their daily order — used to resolve an omitted `end`
 *  (the frame runs until the NEXT point) and to wrap past Isha into next-day Fajr. */
const ORDER: PrayerAnchorPoint[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

/** Minute-of-day (0..1439) for an anchor point in a computed prayer day. */
function pointMinute(day: PrayerDayTimes, point: PrayerAnchorPoint): number {
  const d = day[point]
  return d.getHours() * 60 + d.getMinutes()
}

/** Resolve ONE frame's effective window from a prayer day. A non-anchored frame (or a
 *  null prayer day — no location configured) is returned unchanged. An anchored frame
 *  gets fresh startMinute/endMinute derived from the prayer times; every other field
 *  (id, name, order, manualOrder, the original anchor) is preserved. The existing
 *  midnight-wrap logic in selectCurrentQuest handles start > end (e.g. Isha→Fajr). */
export function effectiveFrame(frame: TimeFrame, day: PrayerDayTimes | null): TimeFrame {
  if (!frame.prayerAnchor || !day) return frame
  const start = frame.prayerAnchor.start
  let end = frame.prayerAnchor.end
  if (!end) {
    // No explicit end → run until the next anchor point (wrapping Isha → Fajr).
    end = ORDER[(ORDER.indexOf(start) + 1) % ORDER.length]
  }
  return { ...frame, startMinute: pointMinute(day, start), endMinute: pointMinute(day, end) }
}

/** Resolve EVERY frame's effective window for a prayer day. Null day → frames unchanged. */
export function resolveFrames(timeFrames: TimeFrame[], day: PrayerDayTimes | null): TimeFrame[] {
  if (!day) return timeFrames
  return timeFrames.map((f) => effectiveFrame(f, day))
}

/** One-call helper for renderers / the scheduler: take the raw frames + the user's prayer
 *  settings + `now`, and return frames with prayer-anchored windows resolved for today.
 *  Identity (returns the same frames) when no location is configured. This is what every
 *  selection call site should feed into the engine so widget / Dashboard / Quests agree. */
export function effectiveTimeFrames(
  timeFrames: TimeFrame[],
  settings: { prayerTimes?: PrayerSettings } | undefined | null,
  now: Date
): TimeFrame[] {
  return resolveFrames(timeFrames, prayerDayFor(settings?.prayerTimes, now))
}
