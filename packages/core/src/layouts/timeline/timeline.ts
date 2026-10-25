import type { Temporal } from 'temporal-polyfill';
import { calendarPeriods_groups } from '#views/periods';
import { calendarEvents_isAllDay, calendarEvents_isMultiDay } from '#events/events';
import type { Calendar_BackgroundEventSegment } from '#layouts/layout.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_ResourceNode } from '#resources/resource.types';
import { calendarResources_build, calendarResources_visible } from '#resources/resources';
import type {
  Calendar_TimelineLayout,
  Calendar_TimelineRow,
  Calendar_TimelineViewSettings,
} from '#layouts/timeline/timeline.types';
import { layoutIntervals_complement, layoutIntervals_stack } from '#layouts/shared/intervals';
import {
  layoutCoordinates_coverage,
  layoutCoordinates_hourOffset,
  layoutCoordinates_length,
  layoutCoordinates_plan,
  layoutCoordinates_projectInstant,
  layoutCoordinates_slots,
} from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import { layoutProjection_events, layoutProjection_enclose, layoutProjection_cover } from '#layouts/shared/projection';
import type { LayoutProjection_Event } from '#layouts/shared/projection';
import { layoutColumns_matches as matchesResource, layoutColumns_matchesBackground } from '#layouts/shared/columns';

const DEFAULT_SLOT_MINUTES = 60;
const buildRow = <TData, TResourceData>({
  node,
  events,
  backgroundEvents,
  plan,
  minEventMs,
}: {
  node?: Calendar_ResourceNode<TResourceData>;
  events: LayoutProjection_Event<TData>[];
  backgroundEvents: LayoutProjection_Event<TData>[];
  plan: LayoutCoordinates_Plan;
  minEventMs: number;
}): Calendar_TimelineRow<TData, TResourceData> => {
  const resource = node?.resource;
  const length = layoutCoordinates_length(plan);
  const total = length * plan.dates.dates.length;
  const key = resource?.id ?? 'all';
  const items = events.flatMap(projected =>
    matchesResource(projected.event, resource) ? layoutProjection_enclose(plan, projected, minEventMs) : [],
  );
  const rows = layoutIntervals_stack(items, item => item);
  const segments = items.map((item, index) => ({
    key: `${key}:${item.event.id}`,
    event: item.event,
    fragments: item.fragments,
    start: item.startMs / total,
    span: (item.endMs - item.startMs) / total,
    row: rows[index],
    isAllDay: calendarEvents_isAllDay(item.event),
    isMultiDay: calendarEvents_isMultiDay(item.event),
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
    depth: node?.depth ?? 0,
    hasChildren: node?.hasChildren ?? false,
    isExpanded: node?.isExpanded ?? false,
    isUnavailable: !!resource && availability.length === 0,
    segments,
    backgroundEvents: backgroundEvents.flatMap((projected): Calendar_BackgroundEventSegment<TData>[] => {
      const { event } = projected;
      if (!layoutColumns_matchesBackground(event, resource)) return [];
      if (calendarEvents_isAllDay(event))
        return layoutProjection_enclose(plan, projected, 0).map(interval => ({
          key: `${key}:background:${event.id}`,
          event,
          start: interval.startMs / total,
          span: (interval.endMs - interval.startMs) / total,
          continuesBefore: interval.continuesBefore,
          continuesAfter: interval.continuesAfter,
        }));
      return plan.dates.dates.flatMap((_date, dateIndex) =>
        layoutProjection_cover(plan, projected, dateIndex).map((interval, index) => ({
          key: `${key}:background:${event.id}:${dateIndex}:${index}`,
          event,
          start: (dateIndex * length + interval.startMs) / total,
          span: (interval.endMs - interval.startMs) / total,
          continuesBefore: interval.continuesBefore,
          continuesAfter: interval.continuesAfter,
        })),
      );
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
  resourceNodes,
  timeZone,
  now,
  firstDayOfWeek,
}: {
  definition: Calendar_TimelineViewSettings;
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  resourceNodes?: Calendar_ResourceNode<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_TimelineLayout<TData, TResourceData> => {
  const plan = layoutCoordinates_plan(range, definition, timeZone, firstDayOfWeek);
  const dates = plan.dates.dates;
  const slotMinutes = definition.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const slots = layoutCoordinates_slots(plan.dates, slotMinutes);
  const groups = calendarPeriods_groups(definition.groupBy).includes('resource')
    ? calendarResources_visible(resourceNodes ?? calendarResources_build(resources))
    : [undefined];
  const clock = layoutCoordinates_projectInstant(plan, now.toInstant());
  const projected = layoutProjection_events(plan, events);
  const projectedBackgrounds = layoutProjection_events(plan, backgroundEvents);
  return {
    kind: 'timeline',
    coordinates: plan,
    slotUnits: (dates.length * layoutCoordinates_length(plan)) / 60_000 / slotMinutes,
    slotMinutes,
    hourOffset: layoutCoordinates_hourOffset(plan.dates, slotMinutes),
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
    rows: groups.map(node =>
      buildRow({
        node,
        events: projected,
        backgroundEvents: projectedBackgrounds,
        plan,
        minEventMs: (definition.minEventMinutes ?? slotMinutes / 2) * 60_000,
      }),
    ),
    now: clock ? (clock.dateIndex + clock.position) / dates.length : undefined,
    minSlotWidth: definition.minSlotWidth,
  };
};
