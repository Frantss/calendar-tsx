import type { Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, listView, monthView, timeGridView } from '@calendar-tsx/core';

import type { Booking, Room } from './sample-data';

export const playgroundViews = createCalendarViews({
  month: monthView({ maxEventsPerDay: 3 }),
  week: timeGridView({ days: 7 }),
  day: timeGridView({ days: 1 }),
  rooms: timeGridView({ days: 1, groupBy: 'resource' }),
  agenda: listView({ days: 7 }),
});

export type PlaygroundView = keyof typeof playgroundViews.views;

export type PlaygroundState = Calendar_State<Booking, Room, typeof playgroundViews.views>;
