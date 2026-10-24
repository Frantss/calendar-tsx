import type { Calendar_State } from '@calendar-tsx/core';
import {
  backgroundFeature,
  createBackgroundLayer,
  createCalendar,
  createCalendarViews,
  createWeeklyRanges,
  dayGridView,
  timeGridView,
  timelineView,
} from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import type { Booking, Room } from './setup';
import { bookings, rooms, timeZone } from './setup';

// #region layers
// module scope: layers and their ranges functions are compared by reference
export const backgrounds = [
  createBackgroundLayer({
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
  }),
  createBackgroundLayer({
    id: 'holidays',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-12-25') }],
  }),
];
// #endregion layers

// #region views
export const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { backgroundFeature } }),
  month: dayGridView({ period: 'month', maxEventsPerDay: 3, features: { backgroundFeature } }),
  timeline: timelineView({ days: 7, groupBy: 'resource', features: { backgroundFeature } }),
});

export const calendar = createCalendar({
  timeZone,
  views: views.views,
  features: { ...views.features },
  backgrounds,
  view: 'week',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: bookings,
  resources: rooms,
  onNavigate: next => calendar['~update']({ ...calendar.options, view: next.view, date: next.date }),
});
// #endregion views

export type BackgroundState = Calendar_State<Booking, Room, typeof views.views>;
