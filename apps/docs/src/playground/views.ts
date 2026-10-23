import type { Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, listView, monthView, timeGridView } from '@calendar-tsx/core';

import type { Booking, Room } from './sample-data';

export type PlaygroundViewSettings = { maxEventsPerDay: number; slotMinutes: number; allDay: boolean };

/** The playground's views. The preview rebuilds them only when a setting changes, since views compare by reference. */
export const createPlaygroundViews = ({ maxEventsPerDay, slotMinutes, allDay }: PlaygroundViewSettings) =>
  createCalendarViews({
    month: monthView({ maxEventsPerDay }),
    week: timeGridView({ days: 7, slotMinutes, allDay }),
    day: timeGridView({ days: 1, slotMinutes, allDay }),
    rooms: timeGridView({ days: 1, groupBy: 'resource', slotMinutes, allDay }),
    agenda: listView({ days: 7 }),
  });

/** For types and for ranges, which the settings above do not change. */
export const playgroundViews = createPlaygroundViews({ maxEventsPerDay: 3, slotMinutes: 30, allDay: true });

export type PlaygroundView = keyof typeof playgroundViews.views;

export type PlaygroundState = Calendar_State<Booking, Room, typeof playgroundViews.views>;
