import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_ResourceNode } from '#resources/resource.types';
import {
  layoutCoordinates_length,
  layoutCoordinates_hourOffset,
  layoutCoordinates_slots,
} from '#layouts/shared/coordinates';
import { layoutSurfaces_compile } from '#layouts/shared/surfaces';
import type { Calendar_TimelineLayout, Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';

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
  const { plan, slotMinutes, surfaces, clock } = layoutSurfaces_compile(
    { range, events, backgroundEvents, resources, resourceNodes, timeZone, now, firstDayOfWeek },
    definition,
    'timeline',
  );
  const dates = plan.dates.dates;
  const slots = layoutCoordinates_slots(plan.dates, slotMinutes);
  return {
    kind: 'timeline',
    coordinates: plan,
    slotMinutes,
    slotUnits: (dates.length * layoutCoordinates_length(plan)) / 60_000 / slotMinutes,
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
    rows: surfaces.map(({ node, surface: { grid: _grid, stack: _stack, ...surface }, stack }) => ({
      ...surface,
      depth: node?.depth ?? 0,
      hasChildren: node?.hasChildren ?? false,
      isExpanded: node?.isExpanded ?? false,
      ...stack(),
    })),
    now: clock ? (clock.dateIndex + clock.position) / dates.length : undefined,
    minSlotWidth: definition.minSlotWidth,
  };
};
