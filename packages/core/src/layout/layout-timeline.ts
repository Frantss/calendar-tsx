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
import type { LayoutAvailability_Interval as Interval } from '#layout/layout-availability';
import {
  layoutAvailability_clip,
  layoutAvailability_complement,
  layoutAvailability_matches,
} from '#layout/layout-availability';

const DEFAULT_SLOT_MINUTES = 60;
const MINUTES_PER_DAY = 24 * 60;

const startOfDay = (date: Temporal.PlainDate, timeZone: string) => date.toZonedDateTime({ timeZone }).epochMilliseconds;

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
  range,
  timeZone,
}: {
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
  range: Interval;
  timeZone: string;
}): Calendar_TimelineRow<TData, TResourceData> => {
  const length = range.endMs - range.startMs;
  const fraction = (ms: number) => (ms - range.startMs) / length;
  const key = resource?.id ?? 'all';

  const items = events.flatMap(event => {
    if (!layoutAvailability_matches(event, resource)) return [];

    const isAllDay = calendarEvents_isAllDay(event);
    const span = calendarEvents_dateSpan(event);
    const startMs = isAllDay ? startOfDay(span.start, timeZone) : event.start.epochMilliseconds;
    const endMs = isAllDay ? startOfDay(span.end.add({ days: 1 }), timeZone) : event.end.epochMilliseconds;

    if (endMs <= range.startMs || startMs >= range.endMs) return [];

    return [
      {
        event,
        isAllDay,
        startMs: Math.max(startMs, range.startMs),
        endMs: Math.min(endMs, range.endMs),
        continuesBefore: startMs < range.startMs,
        continuesAfter: endMs > range.endMs,
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

  const availability = layoutAvailability_clip(resource, range);

  return {
    key,
    resource,
    isUnavailable: !!resource && availability.length === 0,
    segments,
    rows: Math.max(0, ...segments.map(segment => segment.row + 1)),
    unavailable: resource
      ? layoutAvailability_complement(availability, range).map(gap => ({
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
  const interval = {
    startMs: startOfDay(range.start, timeZone),
    endMs: startOfDay(range.end.add({ days: 1 }), timeZone),
  };
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
    rows: groups.map(resource => buildRow({ resource, events, range: interval, timeZone })),
    now:
      nowMs >= interval.startMs && nowMs < interval.endMs
        ? (nowMs - interval.startMs) / (interval.endMs - interval.startMs)
        : undefined,
    minSlotWidth: definition.minSlotWidth,
  };
};
