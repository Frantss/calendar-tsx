import type { Temporal } from 'temporal-polyfill';
import type { DayOfWeek } from '#dates/day-of-week';

export type Calendar_Range = { start: Temporal.PlainDate; end: Temporal.PlainDate };

/** ISO day of the week: 1 is Monday, 7 is Sunday. */
export type Calendar_DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export type Calendar_FirstDayOfWeek = Calendar_DayOfWeek;
