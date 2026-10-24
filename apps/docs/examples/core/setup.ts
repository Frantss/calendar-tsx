import type { Calendar_EventInput, Calendar_Resource, Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, listView, monthView, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

export type Booking = { title: string; color?: string };
export type Room = { capacity: number };

// #region views
// module scope: views and features are compared by reference
export const views = createCalendarViews({
  month: monthView({ maxEventsPerDay: 3 }),
  week: timeGridView({ days: 7 }),
  day: timeGridView({ days: 1 }),
  rooms: timeGridView({ days: 1, groupBy: 'resource' }),
  agenda: listView({ days: 7 }),
});
// #endregion views

export type ViewKey = keyof typeof views.views;

// #region state
// the context erases the instance's types; annotate selectors with this to get them back
export type State = Calendar_State<Booking, Room, typeof views.views>;
// #endregion state

export const timeZone = 'America/New_York';

const at = (value: string) => Temporal.ZonedDateTime.from(`${value}[${timeZone}]`);

// #region events
export const bookings: Calendar_EventInput<Booking>[] = [
  {
    id: 'standup',
    kind: 'timed',
    start: at('2026-03-11T09:00'),
    end: at('2026-03-11T09:15'),
    resourceIds: ['room-a'],
    data: { title: 'Standup' },
  },
  {
    id: 'offsite',
    kind: 'allDay',
    start: Temporal.PlainDate.from('2026-03-12'),
    end: Temporal.PlainDate.from('2026-03-13'),
    data: { title: 'Offsite' },
  },
];
// #endregion events

// #region resources
export const rooms: Calendar_Resource<Room>[] = [
  {
    id: 'room-a',
    title: 'Room A',
    availability: [{ start: at('2026-03-11T09:00'), end: at('2026-03-11T17:00') }],
    data: { capacity: 8 },
  },
  {
    id: 'room-b',
    title: 'Room B',
    availability: [],
    data: { capacity: 4 },
  },
];
// #endregion resources
