import { Temporal } from 'temporal-polyfill';
import { calendarPeriods_groups } from '#calendar-periods';
import { calendarEvents_dateSpan, calendarEvents_isAllDay } from '#calendar-events';
import type {
  Calendar_BackgroundEventSegment,
  Calendar_Event,
  Calendar_FirstDayOfWeek,
  Calendar_Range,
  Calendar_Resource,
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineViewSettings,
} from '#calendar.types';
import type { LayoutIntervals_Interval as Interval } from '#layout/layout-intervals';
import { layoutIntervals_complement } from '#layout/layout-intervals';
import {
  layoutCoordinates_bounds,
  layoutCoordinates_coverage,
  layoutCoordinates_coverFragments,
  layoutCoordinates_dateColumns,
  layoutCoordinates_length,
  layoutCoordinates_plan,
  layoutCoordinates_projectInstant,
  layoutCoordinates_projectTime,
  layoutCoordinates_slots,
} from '#layout/layout-coordinates';
import type { LayoutCoordinates_Fragment, LayoutCoordinates_Plan } from '#layout/layout-coordinates';

const DEFAULT_SLOT_MINUTES = 60;
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

type Projected<TData> = { event: Calendar_Event<TData>; fragments: readonly LayoutCoordinates_Fragment[] };

const buildRow = <TData, TResourceData>({
  resource,
  events,
  backgroundEvents,
  plan,
}: {
  resource?: Calendar_Resource<TResourceData>;
  events: Projected<TData>[];
  backgroundEvents: Projected<TData>[];
  plan: LayoutCoordinates_Plan;
}): Calendar_TimelineRow<TData, TResourceData> => {
  const length = layoutCoordinates_length(plan);
  const total = length * plan.dates.dates.length;
  const key = resource?.id ?? 'all';
  const items = events.flatMap(
    ({
      event,
      fragments,
    }): (Projected<TData> & Interval & { isAllDay: boolean; continuesBefore: boolean; continuesAfter: boolean })[] => {
      if (!matchesResource(event, resource)) return [];
      if (calendarEvents_isAllDay(event)) {
        const span = layoutCoordinates_dateColumns(plan.dates.dates, calendarEvents_dateSpan(event));
        return span
          ? [
              {
                event,
                fragments,
                isAllDay: true,
                startMs: span.colStart * length,
                endMs: (span.colEnd + 1) * length,
                continuesBefore: span.continuesBefore,
                continuesAfter: span.continuesAfter,
              },
            ]
          : [];
      }
      const bounds = layoutCoordinates_bounds(fragments);
      if (!bounds.length) return [];
      const starts = bounds.map(
        part => part.dateIndex * length + Number(part.clock.start - plan.dates.clock.start) / 1_000_000,
      );
      const ends = bounds.map(
        part => part.dateIndex * length + Number(part.clock.end - plan.dates.clock.start) / 1_000_000,
      );
      return [
        {
          event,
          fragments,
          isAllDay: false,
          startMs: Math.min(...starts),
          endMs: Math.max(...ends),
          continuesBefore: event.start.epochNanoseconds < fragments[0].source.start.epochNanoseconds,
          continuesAfter: event.end.epochNanoseconds > fragments[fragments.length - 1].source.end.epochNanoseconds,
        },
      ];
    },
  );
  const segments = stack(items).map(item => ({
    key: `${key}:${item.event.id}`,
    event: item.event,
    fragments: item.fragments,
    start: item.startMs / total,
    span: (item.endMs - item.startMs) / total,
    row: item.row,
    isAllDay: item.isAllDay,
    continuesBefore: item.continuesBefore,
    continuesAfter: item.continuesAfter,
  }));
  const availability = layoutCoordinates_coverage(
    plan,
    (resource?.availability ?? []).map(period => ({ start: period.start.toInstant(), end: period.end.toInstant() })),
  );
  return {
    key,
    resource,
    isUnavailable: !!resource && availability.length === 0,
    segments,
    backgroundEvents: backgroundEvents.flatMap(({ event, fragments }): Calendar_BackgroundEventSegment<TData>[] => {
      if (resource && event.resourceIds && !event.resourceIds.includes(resource.id)) return [];
      if (calendarEvents_isAllDay(event)) {
        const span = layoutCoordinates_dateColumns(plan.dates.dates, calendarEvents_dateSpan(event));
        return span
          ? [
              {
                key: `${key}:background:${event.id}`,
                event,
                start: span.colStart / plan.dates.dates.length,
                span: (span.colEnd - span.colStart + 1) / plan.dates.dates.length,
                continuesBefore: span.continuesBefore,
                continuesAfter: span.continuesAfter,
              },
            ]
          : [];
      }
      return plan.dates.dates.flatMap((_date, dateIndex) => {
        const parts = fragments.filter(part => part.dateIndex === dateIndex);
        return layoutCoordinates_coverFragments(plan, parts, dateIndex).map((interval, index) => ({
          key: `${key}:background:${event.id}:${dateIndex}:${index}`,
          event,
          start: (dateIndex * length + interval.startMs) / total,
          span: (interval.endMs - interval.startMs) / total,
          continuesBefore: Temporal.Instant.compare(event.start.toInstant(), parts[0].source.start) < 0,
          continuesAfter: Temporal.Instant.compare(event.end.toInstant(), parts[parts.length - 1].source.end) > 0,
        }));
      });
    }),
    rows: Math.max(0, ...segments.map(segment => segment.row + 1)),
    unavailable: resource
      ? layoutIntervals_complement(availability, { startMs: 0, endMs: total }).map(gap => ({
          key: `${key}:unavailable:${gap.startMs}`,
          start: gap.startMs / total,
          span: (gap.endMs - gap.startMs) / total,
        }))
      : [],
  };
};

export const layoutTimeline_build = <TData, TResourceData>({
  definition,
  range,
  events,
  backgroundEvents,
  resources,
  timeZone,
  now,
  firstDayOfWeek,
}: {
  definition: Calendar_TimelineViewSettings;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_TimelineLayout<TData, TResourceData> => {
  const plan = layoutCoordinates_plan(range, definition, timeZone, firstDayOfWeek);
  const dates = plan.dates.dates;
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const slots = layoutCoordinates_slots(plan.dates, slotMinutes);
  const groups = calendarPeriods_groups(definition.groupBy).includes('resource') ? resources : [undefined];
  const clock = layoutCoordinates_projectInstant(plan, now.toInstant());
  const project = (event: Calendar_Event<TData>) => ({
    event,
    fragments:
      event.kind === 'timed'
        ? layoutCoordinates_projectTime(plan, { start: event.start.toInstant(), end: event.end.toInstant() }, event.id)
        : [],
  });
  const projected = events.map(project);
  const projectedBackgrounds = backgroundEvents.map(project);
  return {
    kind: 'timeline',
    coordinates: plan,
    slotUnits: (dates.length * layoutCoordinates_length(plan)) / 60_000 / slotMinutes,
    days: dates.map((date, index) => ({
      key: date.toString(),
      date,
      isToday: date.equals(now.toPlainDate()),
      colStart: index * slots.length,
      colSpan: slots.length,
      start: index / dates.length,
      span: 1 / dates.length,
    })),
    slots: dates.flatMap((date, day) =>
      slots.map((slot, index) => ({
        key: `${date.toString()}T${slot.time.toString()}`,
        date,
        time: slot.time,
        dayOffset: slot.dayOffset,
        col: day * slots.length + index,
        start: (day + slot.position.start) / dates.length,
        span: slot.position.span / dates.length,
      })),
    ),
    rows: groups.map(resource =>
      buildRow({ resource, events: projected, backgroundEvents: projectedBackgrounds, plan }),
    ),
    now: clock ? (clock.dateIndex + clock.position) / dates.length : undefined,
    minSlotWidth: definition.minSlotWidth,
  };
};
