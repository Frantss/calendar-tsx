import { monthView } from '@calendar-tsx/core';
import type { Temporal } from 'temporal-polyfill';

// days whose events were truncated by the server, so the calendar shows "More" for them
declare const truncatedDays: Set<string>;

// #region hint
export const month = monthView({
  maxEventsPerDay: 3,
  dayOverflow: (date: Temporal.PlainDate) => truncatedDays.has(date.toString()),
});
// #endregion hint
