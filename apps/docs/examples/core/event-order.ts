import type { Calendar_Event } from '@calendar-tsx/core';

import type { Booking } from './setup';

// #region order
// shortest first on the time grid, alphabetical everywhere else
export const eventOrder = (a: Calendar_Event<Booking>, b: Calendar_Event<Booking>, context: { kind: string }) =>
  context.kind === 'timeGrid' && a.kind === 'timed' && b.kind === 'timed'
    ? a.start.until(a.end).total('minutes') - b.start.until(b.end).total('minutes')
    : a.data.title.localeCompare(b.data.title);
// #endregion order
