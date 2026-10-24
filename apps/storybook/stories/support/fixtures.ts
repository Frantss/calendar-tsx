import {
  backgroundFeature,
  calendarFeatures,
  calendarViews,
  createWeeklyRanges,
  dayGridView,
  fixedClock,
  listView,
  recurrenceFeature,
  timeGridView,
  timelineView,
} from '@calendar-tsx/core';
import type {
  Calendar_BackgroundLayer,
  Calendar_Clock,
  Calendar_EventDefinition,
  Calendar_EventInput,
  Calendar_Resource,
  Calendar_View,
  Calendar_Options,
  Calendar_Views,
} from '@calendar-tsx/core';
import { rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';
import type { CSSProperties } from 'react';

export type EventData = { title: string };
export type ResourceData = { capacity: number };
export const zone = 'America/New_York';
export const date = '2026-03-11';
export const at = (value: string, timeZone = zone) => Temporal.ZonedDateTime.from(`${value}[${timeZone}]`);
export const timed = (
  id: string,
  start: string,
  end: string,
  resourceIds?: string[],
): Calendar_EventInput<EventData> => ({
  id,
  kind: 'timed',
  start: at(start),
  end: at(end),
  resourceIds,
  data: { title: id },
});
export const allDay = (
  id: string,
  start: string,
  end = start,
  resourceIds?: string[],
): Calendar_EventInput<EventData> => ({
  id,
  kind: 'allDay',
  start: Temporal.PlainDate.from(start),
  end: Temporal.PlainDate.from(end),
  resourceIds,
  data: { title: id },
});
export const background = (event: Calendar_EventInput<EventData>): Calendar_EventInput<EventData> => ({
  ...event,
  display: 'background',
});
export const bookings = [
  timed('Planning', `${date}T09:00`, `${date}T10:00`, ['a']),
  timed('Review', `${date}T09:30`, `${date}T11:00`, ['a', 'b']),
  timed('Support', `${date}T13:00`, `${date}T14:00`, ['b']),
  allDay('Offsite', '2026-03-12', '2026-03-13', ['a', 'b']),
];
export const overlaps = [
  timed('Long meeting', `${date}T09:00`, `${date}T12:00`),
  timed('First review', `${date}T09:00`, `${date}T10:00`),
  timed('Second review', `${date}T09:30`, `${date}T10:30`),
  timed('Expanded lane', `${date}T10:30`, `${date}T11:30`),
  timed('Touching meeting', `${date}T12:00`, `${date}T13:00`),
];
export const brief = [
  timed('Five minutes', `${date}T09:00`, `${date}T09:05`),
  timed('Next five minutes', `${date}T09:05`, `${date}T09:10`),
];
export const spanning = [
  allDay('Before range', '2026-02-25', '2026-03-03'),
  allDay('Across weeks', '2026-03-06', '2026-03-17'),
  allDay('After range', '2026-03-28', '2026-04-10'),
  timed('Across midnight', '2026-03-11T22:00', '2026-03-12T02:00'),
];
export const dense = Array.from({ length: 7 }, (_, index) =>
  allDay(`Booking ${index + 1}`, date, index < 2 ? '2026-03-13' : date, ['a']),
);
export const resources: Calendar_Resource<ResourceData>[] = [
  {
    id: 'a',
    title: 'Room A',
    availability: [{ start: at(`${date}T08:00`), end: at(`${date}T18:00`) }],
    data: { capacity: 8 },
  },
  {
    id: 'b',
    title: 'Room B',
    availability: [{ start: at(`${date}T10:00`), end: at(`${date}T16:00`) }],
    data: { capacity: 4 },
  },
];
export const holiday: Calendar_BackgroundLayer = {
  id: 'holiday',
  kind: 'holiday',
  ranges: [{ allDay: true, start: Temporal.PlainDate.from(date) }],
};
export const businessHours: Calendar_BackgroundLayer = {
  id: 'business-hours',
  kind: 'closed',
  inverse: true,
  ranges: createWeeklyRanges([
    {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: Temporal.PlainTime.from('09:00'),
      endTime: Temporal.PlainTime.from('17:00'),
    },
  ]),
};
export const dayWindow = { startMinutes: 480, endMinutes: 1080 };
export const overnightWindow = { startMinutes: 1320, endMinutes: 1800 };
export const standardViews = {
  month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
  week: timeGridView({ weeks: 1, timeWindow: dayWindow }),
  day: timeGridView({ days: 1, timeWindow: dayWindow }),
  agenda: listView({ weeks: 1 }),
  timeline: timelineView({ days: 1, timeWindow: dayWindow, groupBy: 'resource', minSlotWidth: '4rem' }),
};
const defaultClock = fixedClock(Temporal.Instant.from('2026-03-11T14:40:00Z'));
export type ScenarioInput = {
  view?: Calendar_View;
  events?: Calendar_EventDefinition<EventData>[];
  date?: string;
  timeZone?: string;
  resources?: Calendar_Resource<ResourceData>[];
  backgrounds?: Calendar_BackgroundLayer[];
  locale?: string;
  firstDayOfWeek?: 1 | 7;
  clock?: Calendar_Clock;
  controls?: boolean;
  eventControls?: boolean;
  clockControls?: boolean;
  clockStart?: string;
  clockNext?: string;
  controlledNavigation?: boolean;
  preventDayNavigation?: boolean;
  eventContent?: 'custom' | 'element' | 'function';
  accessibleLabel?: string;
  caption?: string;
  colorScheme?: 'light' | 'dark';
  style?: CSSProperties;
  eventOrder?: Calendar_Options<EventData, ResourceData, Calendar_Views>['eventOrder'];
};
export const scenario = (input: ScenarioInput = {}) => {
  const features = calendarFeatures({
    background: backgroundFeature(input.backgrounds ?? []),
    recurrence: recurrenceFeature(),
    rrule: rruleFeature(),
  });
  const views = calendarViews({ features, views: { ...standardViews, example: input.view ?? standardViews.month } });
  return { ...input, features, views, events: input.events ?? bookings, clock: input.clock ?? defaultClock };
};
export type Scenario = ReturnType<typeof scenario>;
export const manuallyAdvancedClock = (initial: string) => {
  let current = Temporal.Instant.from(initial);
  const listeners = new Set<() => void>();
  const clock: Calendar_Clock = {
    now: () => current,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    clock,
    advance: (next: string) => {
      current = Temporal.Instant.from(next);
      for (const listener of listeners) listener();
    },
  };
};
