import { Temporal } from 'temporal-polyfill';
import type { Calendar_Range } from '#dates/date.types';

export const calendarDates_startOfWeek = (date: Temporal.PlainDate, firstDayOfWeek: number) =>
  date.subtract({ days: (date.dayOfWeek - firstDayOfWeek + 7) % 7 });

export const calendarDates_days = (range: Calendar_Range) => {
  const days: Temporal.PlainDate[] = [];

  for (let day = range.start; Temporal.PlainDate.compare(day, range.end) <= 0; day = day.add({ days: 1 }))
    days.push(day);

  return days;
};

export const calendarDates_contains = (range: Calendar_Range, date: Temporal.PlainDate) =>
  Temporal.PlainDate.compare(date, range.start) >= 0 && Temporal.PlainDate.compare(date, range.end) <= 0;
