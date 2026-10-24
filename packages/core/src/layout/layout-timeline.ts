import { Temporal } from 'temporal-polyfill';

import { calendarEvents_dateSpan, calendarEvents_isAllDay } from '#calendar-events';
import { calendarNavigation_days } from '#calendar-navigation';
import type {
  Calendar_Event,
  Calendar_Range,
  Calendar_Resource,
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineViewSettings,
} from '#calendar.types';
import type { LayoutIntervals_Interval as Interval } from '#layout/layout-intervals';
import { layoutIntervals_complement } from '#layout/layout-intervals';
import { layoutAxis_coverage, layoutAxis_create, layoutAxis_date } from '#layout/layout-axis';
import type { LayoutAxis } from '#layout/layout-axis';

const DEFAULT_SLOT_MINUTES = 60;
const MINUTES_PER_DAY = 24 * 60;

const matchesResource = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || (event.resourceIds ?? []).includes(resource.id);

/** Each item takes the lowest stack row where it overlaps nothing; touching intervals do not overlap (D34). */
const stack = <T extends Interval>(items: T[]) => {
  const rows: Interval[][] = [];

  return items.map(item => {
    let row = 0;

    while (rows[row]?.some(other => other.startMs < item.endMs && item.startMs < other.endMs)) row++;
    (rows[row] ??= []).push(item);

    return { ...item, row };
  });
};

const buildRow = <TData, TResourceData>({
  resource,
  events,
  axis,
}: {
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
  axis: LayoutAxis;
}): Calendar_TimelineRow<TData, TResourceData> => {
  const range = axis.range;
  const length = axis.endMs - axis.startMs;
  const fraction = axis.fraction;
  const key = resource?.id ?? 'all';

  const items = events.flatMap(event => {
    if (!matchesResource(event, resource)) return [];

    const isAllDay = calendarEvents_isAllDay(event);
    const span = calendarEvents_dateSpan(event);
    const startMs = isAllDay ? layoutAxis_date(span.start) : event.start.epochMilliseconds;
    const endMs = isAllDay ? layoutAxis_date(span.end.add({ days: 1 })) : event.end.epochMilliseconds;
    const bounds = isAllDay ? axis : range;

    if (endMs <= bounds.startMs || startMs >= bounds.endMs) return [];

    const clipped = { startMs: Math.max(startMs, bounds.startMs), endMs: Math.min(endMs, bounds.endMs) };

    return [
      {
        event,
        isAllDay,
        ...(isAllDay ? clipped : axis.project(clipped)),
        continuesBefore: startMs < bounds.startMs,
        continuesAfter: endMs > bounds.endMs,
      },
    ];
  });

  const segments = stack(items).map(item => ({
    key: `${key}:${item.event.id}`,
    event: item.event,
    start: fraction(item.startMs),
    span: (item.endMs - item.startMs) / length,
    row: item.row,
    isAllDay: item.isAllDay,
    continuesBefore: item.continuesBefore,
    continuesAfter: item.continuesAfter,
  }));

  // Its gaps are the unavailable segments; a resource with none is unavailable throughout (D12).
  const availability = layoutAxis_coverage(
    axis,
    (resource?.availability ?? []).map(period => ({
      startMs: period.start.epochMilliseconds,
      endMs: period.end.epochMilliseconds,
    })),
  );

  return {
    key,
    resource,
    isUnavailable: !!resource && availability.length === 0,
    segments,
    rows: Math.max(0, ...segments.map(segment => segment.row + 1)),
    unavailable: resource
      ? layoutIntervals_complement(availability, axis).map(gap => ({
          key: `${key}:unavailable:${gap.startMs}`,
          start: fraction(gap.startMs),
          span: (gap.endMs - gap.startMs) / length,
        }))
      : [],
  };
};

export const layoutTimeline_build = <TData, TResourceData>({
  definition,
  range,
  events,
  resources,
  timeZone,
  now,
}: {
  definition: Calendar_TimelineViewSettings;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
}): Calendar_TimelineLayout<TData, TResourceData> => {
  const dates = calendarNavigation_days(range);
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const slotsPerDay = MINUTES_PER_DAY / slotMinutes;
  const axis = layoutAxis_create(range, timeZone);
  const interval = axis.range;
  const today = now.toPlainDate();
  const groups = definition.groupBy === 'resource' ? resources : [undefined];
  const nowMs = now.epochMilliseconds;

  return {
    kind: 'timeline',
    days: dates.map((date, index) => ({
      key: date.toString(),
      date,
      isToday: date.equals(today),
      colStart: index * slotsPerDay,
      colSpan: slotsPerDay,
    })),
    slots: dates.flatMap((date, day) =>
      Array.from({ length: slotsPerDay }, (_, index) => {
        const time = Temporal.PlainTime.from('00:00').add({ minutes: index * slotMinutes });

        return { key: `${date.toString()}T${time.toString()}`, date, time, col: day * slotsPerDay + index };
      }),
    ),
    rows: groups.map(resource => buildRow({ resource, events, axis })),
    now: nowMs >= interval.startMs && nowMs < interval.endMs ? axis.fraction(axis.point(nowMs)) : undefined,
    minSlotWidth: definition.minSlotWidth,
  };
};
