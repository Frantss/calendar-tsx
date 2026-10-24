import { Temporal } from 'temporal-polyfill';

import { calendarEvents_dateSpan, calendarEvents_isAllDay, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_days } from '#calendar-navigation';
import type {
  Calendar_BackgroundEventSegment,
  Calendar_BackgroundEventSpan,
  Calendar_BarSegment,
  Calendar_Event,
  Calendar_Range,
  Calendar_Resource,
  Calendar_TimeGridColumn,
  Calendar_TimeGridLayout,
  Calendar_TimeGridOverlap,
  Calendar_TimeGridViewSettings,
} from '#calendar.types';
import { layoutBars_background, layoutBars_build, layoutBars_rows } from '#layout/layout-bars';
import { layoutAxis_coverage, layoutAxis_create } from '#layout/layout-axis';
import type { LayoutAxis } from '#layout/layout-axis';
import { layoutIntervals_complement } from '#layout/layout-intervals';
import { layoutLanes_assign } from '#layout/layout-lanes';

const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_MIN_EVENT_MINUTES = 15;
const DEFAULT_SHORT_EVENT_MINUTES = 30;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;

const matchesResource = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || (event.resourceIds ?? []).includes(resource.id);

/** Unlike events, a background event without `resourceIds` covers every resource column (D37). */
const matchesBackgroundResource = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || !event.resourceIds || event.resourceIds.includes(resource.id);

const buildColumn = <TData, TResourceData>({
  date,
  resource,
  events,
  backgroundEvents,
  axis,
  now,
  overlap,
  minEventMs,
  shortEventMs,
}: {
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  axis: LayoutAxis;
  now: Temporal.ZonedDateTime;
  overlap: Calendar_TimeGridOverlap;
  minEventMs: number;
  shortEventMs: number;
}): Calendar_TimeGridColumn<TData, TResourceData> => {
  const day = axis.range;
  const length = axis.endMs - axis.startMs;
  const fraction = axis.fraction;
  const key = `${resource?.id ?? 'all'}:${date}`;

  const timed = events.flatMap(event => {
    if (calendarEvents_isAllDay(event) || !matchesResource(event, resource)) return [];

    const startMs = event.start.epochMilliseconds;
    const endMs = event.end.epochMilliseconds;

    if (endMs <= day.startMs || startMs >= day.endMs) return [];

    const projected = axis.project({ startMs: Math.max(startMs, day.startMs), endMs: Math.min(endMs, day.endMs) });

    // Laid out at least `minEventMs` long, so a brief event stays visible and gets its own lane (D39)
    return [
      {
        event,
        startMs: projected.startMs,
        endMs: Math.min(Math.max(projected.endMs, projected.startMs + minEventMs), axis.endMs),
        continuesBefore: startMs < day.startMs,
        continuesAfter: endMs > day.endMs,
      },
    ];
  });

  const backgroundSegments = backgroundEvents.flatMap((event): Calendar_BackgroundEventSegment<TData>[] => {
    if (!matchesBackgroundResource(event, resource)) return [];

    if (calendarEvents_isAllDay(event)) {
      if (!calendarEvents_overlaps(event, { start: date, end: date })) return [];

      const span = calendarEvents_dateSpan(event);

      return [
        {
          key: `${key}:background:${event.id}`,
          event,
          start: 0,
          span: 1,
          continuesBefore: Temporal.PlainDate.compare(span.start, date) < 0,
          continuesAfter: Temporal.PlainDate.compare(span.end, date) > 0,
        },
      ];
    }

    const startMs = event.start.epochMilliseconds;
    const endMs = event.end.epochMilliseconds;

    if (endMs <= day.startMs || startMs >= day.endMs) return [];

    const projected = axis.project({ startMs: Math.max(startMs, day.startMs), endMs: Math.min(endMs, day.endMs) });

    return [
      {
        key: `${key}:background:${event.id}`,
        event,
        start: fraction(projected.startMs),
        span: (projected.endMs - projected.startMs) / length,
        continuesBefore: startMs < day.startMs,
        continuesAfter: endMs > day.endMs,
      },
    ];
  });

  // Its gaps are the unavailable segments; a resource with none is unavailable all day (D12).
  const availability = layoutAxis_coverage(
    axis,
    (resource?.availability ?? []).map(period => ({
      startMs: period.start.epochMilliseconds,
      endMs: period.end.epochMilliseconds,
    })),
  );

  const isToday = date.equals(now.toPlainDate());
  const placed = layoutLanes_assign(timed, overlap);

  return {
    key,
    date,
    resource,
    isToday,
    isUnavailable: !!resource && availability.length === 0,
    lanes: Math.max(0, ...placed.map(item => item.lanes)),
    segments: placed.map(item => ({
      key: `${key}:${item.event.id}`,
      event: item.event,
      start: fraction(item.startMs),
      span: (item.endMs - item.startMs) / length,
      lane: item.lane,
      lanes: item.lanes,
      inlineStart: item.inlineStart,
      inlineSize: item.inlineSize,
      isShort: item.endMs - item.startMs < shortEventMs,
      continuesBefore: item.continuesBefore,
      continuesAfter: item.continuesAfter,
    })),
    backgroundEvents: backgroundSegments,
    unavailable: resource
      ? layoutIntervals_complement(availability, axis).map(gap => ({
          key: `${key}:unavailable:${gap.startMs}`,
          start: fraction(gap.startMs),
          span: (gap.endMs - gap.startMs) / length,
        }))
      : [],
    now: isToday ? fraction(axis.point(now.epochMilliseconds)) : undefined,
  };
};

/**
 * Places all-day spans per resource group. Resource-first order keeps a resource's days adjacent
 * (D19), so a span crosses them; otherwise each column gets its own single-day spans.
 */
const placeAllDay = <TData, TResourceData, TSpan extends { colStart: number }>(
  columns: Calendar_TimeGridColumn<TData, TResourceData>[],
  groups: (Calendar_Resource<TResourceData> | undefined)[],
  eventsOf: (resource?: Calendar_Resource<TResourceData>) => Calendar_Event<TData>[],
  place: (events: Calendar_Event<TData>[], dates: Temporal.PlainDate[], keyPrefix: string) => TSpan[],
) =>
  groups.flatMap(resource => {
    const groupColumns = columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => column.resource === resource);
    const offset = groupColumns[0]?.index ?? 0;
    const isContiguous = groupColumns.every(({ index }, position) => index === offset + position);
    const groupEvents = eventsOf(resource);

    if (isContiguous) {
      return place(
        groupEvents,
        groupColumns.map(({ column }) => column.date),
        `all-day:${resource?.id ?? 'all'}`,
      ).map(span => ({ ...span, colStart: span.colStart + offset }));
    }

    return groupColumns.flatMap(({ column, index }) =>
      place(
        groupEvents.filter(event => calendarEvents_overlaps(event, { start: column.date, end: column.date })),
        [column.date],
        `all-day:${column.key}`,
      ).map(span => ({ ...span, colStart: index })),
    );
  });

const buildAllDay = <TData, TResourceData>(
  columns: Calendar_TimeGridColumn<TData, TResourceData>[],
  groups: (Calendar_Resource<TResourceData> | undefined)[],
  events: Calendar_Event<TData>[],
  backgroundEvents: Calendar_Event<TData>[],
) => {
  const allDayEvents = events.filter(calendarEvents_isAllDay);
  const allDayBackground = backgroundEvents.filter(calendarEvents_isAllDay);

  const segments: Calendar_BarSegment<TData>[] = placeAllDay(
    columns,
    groups,
    resource => allDayEvents.filter(event => matchesResource(event, resource)),
    layoutBars_build,
  );
  const backgroundSpans: Calendar_BackgroundEventSpan<TData>[] = placeAllDay(
    columns,
    groups,
    resource => allDayBackground.filter(event => matchesBackgroundResource(event, resource)),
    layoutBars_background,
  );

  return { segments, backgroundEvents: backgroundSpans, rows: layoutBars_rows(segments) };
};

export const layoutTimeGrid_build = <TData, TResourceData>({
  definition,
  range,
  events,
  backgroundEvents,
  resources,
  timeZone,
  now,
}: {
  definition: Calendar_TimeGridViewSettings;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
}): Calendar_TimeGridLayout<TData, TResourceData> => {
  const dates = calendarNavigation_days(range);
  const axes = new Map(dates.map(date => [date, layoutAxis_create({ start: date, end: date }, timeZone)]));
  const groups: (Calendar_Resource<TResourceData> | undefined)[] =
    definition.groupBy === 'resource' ? resources : [undefined];

  const pairs =
    definition.groupOrder === 'date-first'
      ? dates.flatMap(date => groups.map(resource => ({ date, resource })))
      : groups.flatMap(resource => dates.map(date => ({ date, resource })));

  const columns = pairs.map(({ date, resource }) =>
    buildColumn({
      date,
      resource,
      events,
      backgroundEvents,
      axis: axes.get(date) as LayoutAxis,
      now,
      overlap: definition.overlap ?? 'side-by-side',
      minEventMs: (definition.minEventMinutes ?? DEFAULT_MIN_EVENT_MINUTES) * MS_PER_MINUTE,
      shortEventMs: (definition.shortEventMinutes ?? DEFAULT_SHORT_EVENT_MINUTES) * MS_PER_MINUTE,
    }),
  );
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;

  return {
    kind: 'timeGrid',
    slots: Array.from({ length: MINUTES_PER_DAY / slotMinutes }, (_, index) => {
      const time = Temporal.PlainTime.from('00:00').add({ minutes: index * slotMinutes });

      return { key: time.toString(), time };
    }),
    columns,
    allDay: definition.allDay === false ? undefined : buildAllDay(columns, groups, events, backgroundEvents),
    minColumnWidth: definition.minColumnWidth,
  };
};
