import type { Temporal } from 'temporal-polyfill';

/** A half-open millisecond span: epoch instants before projection, clock coordinates after it (D40). */
export type LayoutIntervals_Interval = { startMs: number; endMs: number };

/** First-fit rows preserve input order; touching half-open spans can share a row. */
export const layoutIntervals_stack = <T>(items: T[], bounds: (item: T) => LayoutIntervals_Interval) => {
  const rows: LayoutIntervals_Interval[][] = [];
  return items.map(item => {
    const interval = bounds(item);
    let row = 0;
    while (rows[row]?.some(other => other.startMs < interval.endMs && interval.startMs < other.endMs)) row++;
    (rows[row] ??= []).push(interval);
    return row;
  });
};

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
