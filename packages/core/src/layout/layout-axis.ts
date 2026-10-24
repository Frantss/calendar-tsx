import { Temporal } from 'temporal-polyfill';

import type { Calendar_Range } from '#calendar.types';
import type { LayoutIntervals_Interval } from '#layout/layout-intervals';
import { layoutIntervals_clip, layoutIntervals_merge } from '#layout/layout-intervals';

export const layoutAxis_date = (date: Temporal.PlainDate) => date.toZonedDateTime('UTC').epochMilliseconds;

/** Fixed 24-hour days, with real instants retained for clipping (D40). */
export const layoutAxis_create = (range: Calendar_Range, timeZone: string) => {
  const start = range.start.toZonedDateTime(timeZone);
  const end = range.end.add({ days: 1 }).toZonedDateTime(timeZone);
  const startMs = layoutAxis_date(range.start);
  const endMs = layoutAxis_date(range.end.add({ days: 1 }));
  const transitions: { at: number; offset: number }[] = [];

  for (
    let next = start.getTimeZoneTransition('next');
    next && next.epochMilliseconds < end.epochMilliseconds;
    next = next.getTimeZoneTransition('next')
  )
    transitions.push({ at: next.epochMilliseconds, offset: next.offsetNanoseconds / 1_000_000 });

  const offsetAt = (ms: number) => {
    let offset = start.offsetNanoseconds / 1_000_000;

    for (const transition of transitions) {
      if (transition.at > ms) break;
      offset = transition.offset;
    }

    return offset;
  };

  const projectParts = (interval: LayoutIntervals_Interval): LayoutIntervals_Interval[] => {
    const parts: LayoutIntervals_Interval[] = [];
    let from = interval.startMs;
    let offset = offsetAt(from);

    for (const transition of transitions) {
      if (transition.at <= from) continue;
      if (transition.at >= interval.endMs) break;

      parts.push({ startMs: from + offset, endMs: transition.at + offset });
      from = transition.at;
      offset = transition.offset;
    }

    parts.push({ startMs: from + offset, endMs: interval.endMs + offset });

    return parts;
  };

  return {
    range: { startMs: start.epochMilliseconds, endMs: end.epochMilliseconds },
    startMs,
    endMs,
    point: (ms: number) => ms + offsetAt(ms),
    fraction: (ms: number) => (ms - startMs) / (endMs - startMs),
    projectParts,
    project: (interval: LayoutIntervals_Interval): LayoutIntervals_Interval => {
      const parts = projectParts(interval);

      // Enclose both sides of a rollback so a bar cannot acquire a negative span.
      return {
        startMs: Math.min(...parts.map(part => part.startMs)),
        endMs: Math.max(...parts.map(part => part.endMs)),
      };
    },
  };
};

export type LayoutAxis = ReturnType<typeof layoutAxis_create>;

export const layoutAxis_coverage = (axis: LayoutAxis, intervals: LayoutIntervals_Interval[]) =>
  layoutIntervals_merge(
    layoutIntervals_clip(layoutIntervals_clip(intervals, axis.range).flatMap(axis.projectParts), axis),
  );
