import type { Temporal } from 'temporal-polyfill';

/** A half-open span of epoch milliseconds. */
export type LayoutIntervals_Interval = { startMs: number; endMs: number };

/** Clips each interval to `day`, dropping the empty ones, sorted by start. */
export const layoutIntervals_clip = (intervals: LayoutIntervals_Interval[], day: LayoutIntervals_Interval) =>
  intervals
    .map(interval => ({ startMs: Math.max(interval.startMs, day.startMs), endMs: Math.min(interval.endMs, day.endMs) }))
    .filter(interval => interval.endMs > interval.startMs)
    .sort((a, b) => a.startMs - b.startMs);

/** Joins overlapping and touching intervals; expects them sorted by start. */
export const layoutIntervals_merge = (sorted: LayoutIntervals_Interval[]) => {
  const merged: LayoutIntervals_Interval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];

    if (last && interval.startMs <= last.endMs) last.endMs = Math.max(last.endMs, interval.endMs);
    else merged.push({ ...interval });
  }

  return merged;
};

/** Gaps in `day` that the intervals leave uncovered; expects them sorted by start. */
export const layoutIntervals_complement = (sorted: LayoutIntervals_Interval[], day: LayoutIntervals_Interval) => {
  const gaps: LayoutIntervals_Interval[] = [];
  let cursor = day.startMs;

  for (const interval of sorted) {
    if (interval.startMs > cursor) gaps.push({ startMs: cursor, endMs: interval.startMs });
    cursor = Math.max(cursor, interval.endMs);
  }

  if (cursor < day.endMs) gaps.push({ startMs: cursor, endMs: day.endMs });

  return gaps;
};

/** The wall-clock day in `timeZone`, so DST days are 23 or 25 hours long. */
export const layoutIntervals_day = (date: Temporal.PlainDate, timeZone: string): LayoutIntervals_Interval => ({
  startMs: date.toZonedDateTime({ timeZone }).epochMilliseconds,
  endMs: date.add({ days: 1 }).toZonedDateTime({ timeZone }).epochMilliseconds,
});
