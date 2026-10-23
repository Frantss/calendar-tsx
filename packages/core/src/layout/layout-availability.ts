import type { Calendar_Event, Calendar_Resource } from '#calendar.types';

export type LayoutAvailability_Interval = { startMs: number; endMs: number };

export const layoutAvailability_matches = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || (event.resourceIds ?? []).includes(resource.id);

/** The resource's availability clipped to `within`, in start order. */
export const layoutAvailability_clip = <TResourceData>(
  resource: Calendar_Resource<TResourceData> | undefined,
  within: LayoutAvailability_Interval,
) =>
  (resource?.availability ?? [])
    .map(period => ({
      startMs: Math.max(period.start.epochMilliseconds, within.startMs),
      endMs: Math.min(period.end.epochMilliseconds, within.endMs),
    }))
    .filter(period => period.endMs > period.startMs)
    .sort((a, b) => a.startMs - b.startMs);

/** Gaps between sorted intervals within `within`; no intervals leave it all unavailable (D12). */
export const layoutAvailability_complement = (
  intervals: LayoutAvailability_Interval[],
  within: LayoutAvailability_Interval,
) => {
  const gaps: LayoutAvailability_Interval[] = [];
  let cursor = within.startMs;

  for (const interval of intervals) {
    if (interval.startMs > cursor) gaps.push({ startMs: cursor, endMs: interval.startMs });
    cursor = Math.max(cursor, interval.endMs);
  }

  if (cursor < within.endMs) gaps.push({ startMs: cursor, endMs: within.endMs });

  return gaps;
};
