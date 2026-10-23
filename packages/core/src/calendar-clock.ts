import { Temporal } from 'temporal-polyfill';

import type { Calendar_Clock } from '#calendar.types';

export const calendarClock_interval = (options: { every: Temporal.Duration }): Calendar_Clock => ({
  now: () => Temporal.Now.instant(),
  subscribe: onTick => {
    const id = setInterval(onTick, options.every.total({ unit: 'milliseconds' }));

    return () => clearInterval(id);
  },
});

export const calendarClock_fixed = (instant: Temporal.Instant): Calendar_Clock => ({
  now: () => instant,
  subscribe: () => () => {},
});
