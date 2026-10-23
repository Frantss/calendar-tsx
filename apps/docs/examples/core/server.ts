import { createCalendar } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone, views } from './setup';

// #region initial-now
// the same instant on the server and the client: pick it once per request and send it as a string
export const createForRequest = (now: string, date: string) =>
  createCalendar({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: 'week',
    date: Temporal.PlainDate.from(date),
    events: bookings,
    onNavigate: () => {},
    initialNow: Temporal.Instant.from(now),
  });
// #endregion initial-now
