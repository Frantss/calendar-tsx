import type { Calendar_DayOfWeek, Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, listView, dayGridView, timeGridView, timelineView } from '@calendar-tsx/core';

import type { Booking, Room } from './sample-data';

export type PlaygroundViewSettings = {
  maxEventsPerDay: number;
  slotMinutes: number;
  allDay: boolean;
  minColumnWidth: number;
  hiddenDays: readonly Calendar_DayOfWeek[];
  visibleStart: string;
  visibleEnd: string;
};

export const defaultPlaygroundViewSettings: PlaygroundViewSettings = {
  maxEventsPerDay: 3,
  slotMinutes: 30,
  allDay: true,
  minColumnWidth: 0,
  hiddenDays: [],
  visibleStart: '00:00',
  visibleEnd: '00:00',
};

const clockMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** The playground's views. The preview rebuilds them only when a setting changes, since views compare by reference. */
export const createPlaygroundViews = ({
  maxEventsPerDay,
  slotMinutes,
  allDay,
  minColumnWidth,
  hiddenDays,
  visibleStart,
  visibleEnd,
}: PlaygroundViewSettings) => {
  const startMinutes = clockMinutes(visibleStart);
  const endClockMinutes = clockMinutes(visibleEnd);
  const timed = {
    slotMinutes,
    allDay,
    hiddenDays,
    minColumnWidth: minColumnWidth > 0 ? `${minColumnWidth}px` : undefined,
    timeWindow: { startMinutes, endMinutes: endClockMinutes + (endClockMinutes <= startMinutes ? 1440 : 0) },
  };

  return createCalendarViews({
    month: dayGridView({ period: 'month', maxEventsPerDay, hiddenDays }),
    year: dayGridView({ period: 'year', groupBy: 'month', maxEventsPerDay, hiddenDays }),
    grid_days: dayGridView({ days: 3, maxEventsPerDay, hiddenDays }),
    grid_rooms: dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay, hiddenDays }),
    month_rooms: dayGridView({ period: 'quarter', groupBy: ['month', 'resource'], maxEventsPerDay, hiddenDays }),
    room_months: dayGridView({ period: 'quarter', groupBy: ['resource', 'month'], maxEventsPerDay, hiddenDays }),
    week: timeGridView({ days: 7, ...timed }),
    workweek: timeGridView({ weeks: 1, ...timed, hiddenDays: [6, 7] }),
    day: timeGridView({ days: 1, ...timed }),
    rooms: timeGridView({ days: 1, groupBy: 'resource', ...timed }),
    agenda: listView({ days: 7, hiddenDays }),
    timeline_month: timelineView({ period: 'month', groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '6rem', hiddenDays }),
    timeline_year: timelineView({ period: 'year', groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '6rem', hiddenDays }),
  });
};

export const playgroundViews = createPlaygroundViews(defaultPlaygroundViewSettings);

export type PlaygroundView = keyof typeof playgroundViews.views;

export type PlaygroundState = Calendar_State<Booking, Room, typeof playgroundViews.views>;
