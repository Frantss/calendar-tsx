import { Temporal } from 'temporal-polyfill';

import { calendarPeriods_groups } from '#calendar-periods';
import { calendarEvents_dateSpan, calendarEvents_isAllDay, calendarEvents_overlaps } from '#calendar-events';
import type {
  Calendar_BackgroundEventSegment,
  Calendar_BackgroundEventSpan,
  Calendar_BarSegment,
  Calendar_Event,
  Calendar_FirstDayOfWeek,
  Calendar_Range,
  Calendar_Resource,
  Calendar_TimeGridColumn,
  Calendar_TimeGridLayout,
  Calendar_TimeGridOverlap,
  Calendar_TimeGridViewSettings,
} from '#calendar.types';
import { layoutBars_background, layoutBars_build, layoutBars_rows } from '#layout/layout-bars';
import {
  layoutCoordinates_bounds,
  layoutCoordinates_coverFragments,
  layoutCoordinates_length,
  layoutCoordinates_plan,
  layoutCoordinates_projectInstant,
  layoutCoordinates_projectTime,
  layoutCoordinates_slots,
} from '#layout/layout-coordinates';
import type { LayoutCoordinates_Fragment, LayoutCoordinates_Plan } from '#layout/layout-coordinates';
import { layoutIntervals_complement } from '#layout/layout-intervals';
import { layoutLanes_assign } from '#layout/layout-lanes';
import {
  layoutColumns_matches as matchesResource,
  layoutColumns_matchesBackground as matchesBackgroundResource,
  layoutColumns_place as placeAllDay,
} from '#layout/layout-columns';

const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_MIN_EVENT_MINUTES = 15;
const DEFAULT_SHORT_EVENT_MINUTES = 30;
const MS_PER_MINUTE = 60_000;

type Projected<TData> = { event: Calendar_Event<TData>; fragments: readonly LayoutCoordinates_Fragment[] };

const buildColumn = <TData, TResourceData>({
  dateIndex,
  resource,
  events,
  backgroundEvents,
  availability,
  plan,
  now,
  overlap,
  minEventMs,
  shortEventMs,
}: {
  dateIndex: number;
  resource?: Calendar_Resource<TResourceData>;
  events: Projected<TData>[];
  backgroundEvents: Projected<TData>[];
  availability: readonly LayoutCoordinates_Fragment[];
  plan: LayoutCoordinates_Plan;
  now: Temporal.ZonedDateTime;
  overlap: Calendar_TimeGridOverlap;
  minEventMs: number;
  shortEventMs: number;
}): Calendar_TimeGridColumn<TData, TResourceData> => {
  const date = plan.dates.dates[dateIndex];
  const length = layoutCoordinates_length(plan);
  const key = `${resource?.id ?? 'all'}:${date.toString()}`;
  const localBounds = { startMs: 0, endMs: length };
  const timed = events.flatMap(({ event, fragments }) => {
    if (!matchesResource(event, resource)) return [];
    const parts = fragments.filter(part => part.dateIndex === dateIndex);
    const [bounds] = layoutCoordinates_bounds(parts);
    if (!bounds) return [];
    const startMs = Number(bounds.clock.start - plan.dates.clock.start) / 1_000_000;
    const endMs = Number(bounds.clock.end - plan.dates.clock.start) / 1_000_000;
    return [
      {
        event,
        fragments: parts,
        startMs,
        endMs: Math.min(Math.max(endMs, startMs + minEventMs), length),
        continuesBefore:
          event.kind === 'timed' && Temporal.Instant.compare(event.start.toInstant(), parts[0].source.start) < 0,
        continuesAfter:
          event.kind === 'timed' &&
          Temporal.Instant.compare(event.end.toInstant(), parts[parts.length - 1].source.end) > 0,
      },
    ];
  });
  const backgroundSegments = backgroundEvents.flatMap(
    ({ event, fragments }): Calendar_BackgroundEventSegment<TData>[] => {
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
      const parts = fragments.filter(part => part.dateIndex === dateIndex);
      if (!parts.length) return [];
      return layoutCoordinates_coverFragments(plan, parts, dateIndex).map((interval, index) => ({
        key: index === 0 ? `${key}:background:${event.id}` : `${key}:background-part:${index}:${event.id}`,
        event,
        start: interval.startMs / length,
        span: (interval.endMs - interval.startMs) / length,
        continuesBefore: Temporal.Instant.compare(event.start.toInstant(), parts[0].source.start) < 0,
        continuesAfter: Temporal.Instant.compare(event.end.toInstant(), parts[parts.length - 1].source.end) > 0,
      }));
    },
  );
  const covered = layoutCoordinates_coverFragments(plan, availability, dateIndex);
  const placed = layoutLanes_assign(timed, overlap);
  const clock = layoutCoordinates_projectInstant(plan, now.toInstant());
  return {
    key,
    date,
    resource,
    isToday: date.equals(now.toPlainDate()),
    isUnavailable: !!resource && covered.length === 0,
    lanes: Math.max(0, ...placed.map(item => item.lanes)),
    segments: placed.map(item => ({
      key: `${key}:${item.event.id}`,
      event: item.event,
      fragments: item.fragments,
      start: item.startMs / length,
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
      ? layoutIntervals_complement(covered, localBounds).map(gap => ({
          key: `${key}:unavailable:${gap.startMs}`,
          start: gap.startMs / length,
          span: (gap.endMs - gap.startMs) / length,
        }))
      : [],
    now: clock?.dateIndex === dateIndex ? clock.position : undefined,
  };
};

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
  firstDayOfWeek,
}: {
  definition: Calendar_TimeGridViewSettings;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_TimeGridLayout<TData, TResourceData> => {
  const plan = layoutCoordinates_plan(range, definition, timeZone, firstDayOfWeek);
  const dates = plan.dates.dates;
  const project = (event: Calendar_Event<TData>): Projected<TData> => ({
    event,
    fragments:
      event.kind === 'timed'
        ? layoutCoordinates_projectTime(plan, { start: event.start.toInstant(), end: event.end.toInstant() }, event.id)
        : [],
  });
  const timed = events.filter(event => event.kind === 'timed').map(project);
  const backgrounds = backgroundEvents.map(project);
  const availability = new Map(
    resources.map(resource => [
      resource,
      resource.availability.flatMap((period, index) =>
        layoutCoordinates_projectTime(
          plan,
          { start: period.start.toInstant(), end: period.end.toInstant() },
          `${resource.id}:${index}`,
        ),
      ),
    ]),
  );
  const groups: (Calendar_Resource<TResourceData> | undefined)[] =
    calendarPeriods_groups(definition.groupBy).includes('resource') ? resources : [undefined];

  const pairs =
    definition.groupOrder === 'date-first'
      ? dates.flatMap(date => groups.map(resource => ({ date, resource })))
      : groups.flatMap(resource => dates.map(date => ({ date, resource })));

  const columns = pairs.map(({ date, resource }) =>
    buildColumn({
      dateIndex: plan.dates.indexByDate.get(date.toString()) as number,
      resource,
      events: timed,
      backgroundEvents: backgrounds,
      availability: resource ? (availability.get(resource) ?? []) : [],
      plan,
      now,
      overlap: definition.overlap ?? 'side-by-side',
      minEventMs: (definition.minEventMinutes ?? DEFAULT_MIN_EVENT_MINUTES) * MS_PER_MINUTE,
      shortEventMs: (definition.shortEventMinutes ?? DEFAULT_SHORT_EVENT_MINUTES) * MS_PER_MINUTE,
    }),
  );
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;

  return {
    kind: 'timeGrid',
    coordinates: plan,
    slotUnits: layoutCoordinates_length(plan) / MS_PER_MINUTE / slotMinutes,
    slots: layoutCoordinates_slots(plan.dates, slotMinutes).map(({ position, ...slot }) => ({
      ...slot,
      key: slot.dayOffset ? `${slot.dayOffset}:${slot.time.toString()}` : slot.time.toString(),
      ...position,
    })),
    columns,
    allDay: definition.allDay === false ? undefined : buildAllDay(columns, groups, events, backgroundEvents),
    minColumnWidth: definition.minColumnWidth,
  };
};
