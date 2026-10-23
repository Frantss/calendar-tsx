import { fixedClock } from '@calendar-tsx/core';
import { useCalendar } from '@calendar-tsx/solid';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone, views } from '../core/setup';

// #region fixed
// a frozen "now", for tests, stories and screenshots
export const useFrozenCalendar = () =>
  useCalendar(() => ({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: 'week',
    date: Temporal.PlainDate.from('2026-03-11'),
    events: bookings,
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-03-11T14:30:00Z')),
  }));
// #endregion fixed
