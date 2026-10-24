import { createCalendarViews, dayGridView, listView, timeGridView, timelineView } from '@calendar-tsx/core';

// #region day-grid
export const dayGrids = createCalendarViews({
  day: dayGridView({ days: 1, maxEventsPerDay: 3 }),
  threeDays: dayGridView({ days: 3, maxEventsPerDay: 3 }),
  workweek: dayGridView({ weeks: 1, hiddenDays: [6, 7], maxEventsPerDay: 3 }),
  year: dayGridView({ period: 'year', maxEventsPerDay: 3 }),
  months: dayGridView({ period: 'year', groupBy: 'month', fixedWeekCount: true, maxEventsPerDay: 3 }),
  rooms: dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay: 3 }),
  monthsThenRooms: dayGridView({ period: 'quarter', groupBy: ['month', 'resource'], maxEventsPerDay: 3 }),
  roomsThenMonths: dayGridView({ months: 3, groupBy: ['resource', 'month'], maxEventsPerDay: 3 }),
});
// #endregion day-grid

// #region periods
export const periods = createCalendarViews({
  workweek: timeGridView({ weeks: 1, hiddenDays: [6, 7] }),
  threeMonths: listView({ months: 3 }),
  quarter: listView({ period: 'quarter' }),
  monthTimeline: timelineView({ period: 'month', groupBy: 'resource', slotMinutes: 1440 }),
  yearTimeline: timelineView({ period: 'year', slotMinutes: 1440 }),
});
// #endregion periods
