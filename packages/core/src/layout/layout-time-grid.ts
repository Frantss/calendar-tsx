import { Temporal } from 'temporal-polyfill';

import { calendarEvents_isAllDay, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_days } from '#calendar-navigation';
import type {
  Calendar_BarSegment,
  Calendar_Event,
  Calendar_Range,
  Calendar_Resource,
  Calendar_TimeGridColumn,
  Calendar_TimeGridLayout,
  Calendar_TimeGridViewDefinition,
} from '#calendar.types';
import { layoutBars_build, layoutBars_rows } from '#layout/layout-bars';
import { layoutLanes_assign } from '#layout/layout-lanes';

const DEFAULT_SLOT_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

type Interval = { startMs: number; endMs: number };

const matchesResource = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || (event.resourceIds ?? []).includes(resource.id);

/** Gaps between the day's availability intervals; a resource with none is unavailable all day (D12). */
const complement = (intervals: Interval[], day: Interval) => {
  const gaps: Interval[] = [];
  let cursor = day.startMs;

  for (const interval of intervals) {
    if (interval.startMs > cursor) gaps.push({ startMs: cursor, endMs: interval.startMs });
    cursor = Math.max(cursor, interval.endMs);
  }

  if (cursor < day.endMs) gaps.push({ startMs: cursor, endMs: day.endMs });

  return gaps;
};

const buildColumn = <TData, TResourceData>({
  date,
  resource,
  events,
  timeZone,
  now,
}: {
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
}): Calendar_TimeGridColumn<TData, TResourceData> => {
  // Real wall-clock day length in `timeZone`, so DST days are 23 or 25 hours long.
  const day = {
    startMs: date.toZonedDateTime({ timeZone }).epochMilliseconds,
    endMs: date.add({ days: 1 }).toZonedDateTime({ timeZone }).epochMilliseconds,
  };
  const length = day.endMs - day.startMs;
  const fraction = (ms: number) => (ms - day.startMs) / length;
  const key = `${resource?.id ?? 'all'}:${date}`;

  const timed = events.flatMap(event => {
    if (calendarEvents_isAllDay(event) || !matchesResource(event, resource)) return [];

    const startMs = event.start.epochMilliseconds;
    const endMs = event.end.epochMilliseconds;

    if (endMs <= day.startMs || startMs >= day.endMs) return [];

    return [
      {
        event,
        startMs: Math.max(startMs, day.startMs),
        endMs: Math.min(endMs, day.endMs),
        continuesBefore: startMs < day.startMs,
        continuesAfter: endMs > day.endMs,
      },
    ];
  });

  const availability = (resource?.availability ?? [])
    .map(period => ({
      startMs: Math.max(period.start.epochMilliseconds, day.startMs),
      endMs: Math.min(period.end.epochMilliseconds, day.endMs),
    }))
    .filter(period => period.endMs > period.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const isToday = date.equals(now.toPlainDate());

  return {
    key,
    date,
    resource,
    isToday,
    isUnavailable: !!resource && availability.length === 0,
    segments: layoutLanes_assign(timed).map(item => ({
      key: `${key}:${item.event.id}`,
      event: item.event,
      start: fraction(item.startMs),
      span: (item.endMs - item.startMs) / length,
      lane: item.lane,
      lanes: item.lanes,
      continuesBefore: item.continuesBefore,
      continuesAfter: item.continuesAfter,
    })),
    unavailable: resource
      ? complement(availability, day).map(gap => ({
          key: `${key}:unavailable:${gap.startMs}`,
          start: fraction(gap.startMs),
          span: (gap.endMs - gap.startMs) / length,
        }))
      : [],
    now: isToday ? fraction(now.epochMilliseconds) : undefined,
  };
};

/**
 * All-day bars span contiguous columns of the same resource. Resource-first order keeps a
 * resource's days adjacent (D19); otherwise each column gets its own single-day bars.
 */
const buildAllDay = <TData, TResourceData>(
  columns: Calendar_TimeGridColumn<TData, TResourceData>[],
  groups: (Calendar_Resource<TResourceData> | undefined)[],
  events: Calendar_Event<TData>[],
) => {
  const allDayEvents = events.filter(calendarEvents_isAllDay);

  const segments = groups.flatMap((resource): Calendar_BarSegment<TData>[] => {
    const groupColumns = columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => column.resource === resource);
    const offset = groupColumns[0]?.index ?? 0;
    const isContiguous = groupColumns.every(({ index }, position) => index === offset + position);
    const groupEvents = allDayEvents.filter(event => matchesResource(event, resource));

    if (isContiguous) {
      return layoutBars_build(
        groupEvents,
        groupColumns.map(({ column }) => column.date),
        `all-day:${resource?.id ?? 'all'}`,
      ).map(segment => ({ ...segment, colStart: segment.colStart + offset }));
    }

    return groupColumns.flatMap(({ column, index }) =>
      layoutBars_build(
        groupEvents.filter(event => calendarEvents_overlaps(event, { start: column.date, end: column.date })),
        [column.date],
        `all-day:${column.key}`,
      ).map(segment => ({ ...segment, colStart: index })),
    );
  });

  return { segments, rows: layoutBars_rows(segments) };
};

export const layoutTimeGrid_build = <TData, TResourceData>({
  definition,
  range,
  events,
  resources,
  timeZone,
  now,
}: {
  definition: Calendar_TimeGridViewDefinition;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
}): Calendar_TimeGridLayout<TData, TResourceData> => {
  const dates = calendarNavigation_days(range);
  const groups: (Calendar_Resource<TResourceData> | undefined)[] =
    definition.groupBy === 'resource' ? resources : [undefined];

  const pairs =
    definition.groupOrder === 'date-first'
      ? dates.flatMap(date => groups.map(resource => ({ date, resource })))
      : groups.flatMap(resource => dates.map(date => ({ date, resource })));

  const columns = pairs.map(({ date, resource }) => buildColumn({ date, resource, events, timeZone, now }));
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;

  return {
    kind: 'timeGrid',
    slots: Array.from({ length: MINUTES_PER_DAY / slotMinutes }, (_, index) => {
      const time = Temporal.PlainTime.from('00:00').add({ minutes: index * slotMinutes });

      return { key: time.toString(), time };
    }),
    columns,
    allDay: definition.allDay === false ? undefined : buildAllDay(columns, groups, events),
    minColumnWidth: definition.minColumnWidth,
  };
};
