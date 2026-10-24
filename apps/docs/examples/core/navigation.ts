import { createCalendar, getCalendarNavigation } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import type { ViewKey } from './setup';
import { bookings, timeZone, views, features } from './setup';

// #region controlled
let navigation: { view: ViewKey; date: Temporal.PlainDate } = { view: 'week', date: Temporal.Now.plainDateISO() };

const calendar = createCalendar({
  timeZone,
  views,
  features,
  ...navigation,
  events: bookings,
  onNavigate: next => {
    navigation = { view: next.view, date: next.date };
    // `next.range` is known here, before the calendar changes: start fetching its events now
    calendar['~update']({ ...calendar.options, ...navigation });
  },
});

calendar.api.next(); // calls onNavigate, which applies the next week
// #endregion controlled

// #region title
const { context } = calendar.store.state;
export const title = context.period.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
// #endregion title

// #region range
// the visible range for any view and date, without a calendar: for example, to fetch on the server
export const range = getCalendarNavigation(views, 'month', Temporal.PlainDate.from('2026-03-11'), {
  firstDayOfWeek: 1,
}).range;
// #endregion range
