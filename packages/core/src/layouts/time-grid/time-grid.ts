import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import {
  layoutCoordinates_length,
  layoutCoordinates_hourOffset,
  layoutCoordinates_slots,
} from '#layouts/shared/coordinates';
import { layoutSurfaces_compile } from '#layouts/shared/surfaces';
import type { Calendar_TimeGridLayout, Calendar_TimeGridViewSettings } from '#layouts/time-grid/time-grid.types';

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
  const { plan, slotMinutes, surfaces, allDay, clock } = layoutSurfaces_compile(
    { range, events, backgroundEvents, resources, timeZone, now, firstDayOfWeek },
    definition,
    'timeGrid',
  );
  const columns = surfaces.map(({ date, dateIndex, surface: { grid: _grid, stack: _stack, ...surface }, grid }) => ({
    ...surface,
    date: date!,
    isToday: date!.equals(now.toPlainDate()),
    ...grid(),
    now: clock?.dateIndex === dateIndex ? clock?.position : undefined,
  }));
  return {
    kind: 'timeGrid',
    coordinates: plan,
    slotMinutes,
    slotUnits: layoutCoordinates_length(plan) / 60_000 / slotMinutes,
    hourOffset: layoutCoordinates_hourOffset(plan.dates, slotMinutes),
    slots: layoutCoordinates_slots(plan.dates, slotMinutes).map(({ position, ...slot }) => ({
      ...slot,
      key: slot.dayOffset ? `${slot.dayOffset}:${slot.time.toString()}` : slot.time.toString(),
      ...position,
    })),
    columns,
    minColumnWidth: definition.minColumnWidth,
    allDay: allDay(),
  };
};
