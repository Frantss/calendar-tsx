import { CalendarProvider, useCalendar } from '@calendar-tsx/solid';
import type { JSX } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone, views } from '../core/setup';

// #region app
// the server picks `now` once per request and passes it, with `date`, as strings
export const Schedule = (props: { now: string; date: string; children: JSX.Element }) => {
  const calendar = useCalendar(() => ({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: 'week',
    date: Temporal.PlainDate.from(props.date),
    events: bookings,
    onNavigate: () => {},
    initialNow: Temporal.Instant.from(props.now),
  }));

  return <CalendarProvider value={calendar}>{props.children}</CalendarProvider>;
};
// #endregion app
