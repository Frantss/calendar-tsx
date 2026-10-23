'use client';

import { CalendarProvider, useCalendar } from '@calendar-tsx/react';
import type { ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone, views } from '../core/setup';

// #region client
// the server picks `now` once per request and passes it, with `date`, as strings
export const Schedule = ({ now, date, children }: { now: string; date: string; children: ReactNode }) => {
  const calendar = useCalendar({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: 'week',
    date: Temporal.PlainDate.from(date),
    events: bookings,
    onNavigate: () => {},
    initialNow: Temporal.Instant.from(now),
  });

  return <CalendarProvider value={calendar}>{children}</CalendarProvider>;
};
// #endregion client
