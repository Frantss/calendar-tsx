import { Temporal } from 'temporal-polyfill';

import type { Calendar_Navigation, Calendar_Range, Calendar_ViewDefinition, Calendar_Views } from '#calendar.types';

const DEFAULT_FIRST_DAY_OF_WEEK = 7;

const startOfWeek = (date: Temporal.PlainDate, firstDayOfWeek: number) =>
  date.subtract({ days: (date.dayOfWeek - firstDayOfWeek + 7) % 7 });

export const calendarNavigation_days = (range: Calendar_Range) => {
  const days: Temporal.PlainDate[] = [];

  for (let day = range.start; Temporal.PlainDate.compare(day, range.end) <= 0; day = day.add({ days: 1 }))
    days.push(day);

  return days;
};

export const calendarNavigation_contains = (range: Calendar_Range, date: Temporal.PlainDate) =>
  Temporal.PlainDate.compare(date, range.start) >= 0 && Temporal.PlainDate.compare(date, range.end) <= 0;

/** Range and period for any view and date, without an instance (app R2.5). */
export const calendar_navigation = <TViews extends Calendar_Views>(
  views: TViews,
  view: keyof TViews & string,
  date: Temporal.PlainDate,
  options: { firstDayOfWeek?: number } = {},
): Calendar_Navigation<TViews> => {
  const definition = views[view];
  const firstDayOfWeek = options.firstDayOfWeek ?? DEFAULT_FIRST_DAY_OF_WEEK;

  if (!definition) throw new Error(`[calendar] unknown view "${view}"`);

  if (definition.kind === 'month') {
    const period = { start: date.with({ day: 1 }), end: date.with({ day: date.daysInMonth }) };
    const range = {
      start: startOfWeek(period.start, firstDayOfWeek),
      end: startOfWeek(period.end, firstDayOfWeek).add({ days: 6 }),
    };

    return { view, date, period, range };
  }

  const start = definition.days === 7 ? startOfWeek(date, firstDayOfWeek) : date;
  const period = { start, end: start.add({ days: definition.days - 1 }) };

  return { view, date, period, range: period };
};

/** The date one period before or after `date` in the given view. */
export const calendarNavigation_step = (
  definition: Calendar_ViewDefinition,
  date: Temporal.PlainDate,
  direction: 1 | -1,
) => {
  if (definition.kind === 'month') return date.with({ day: 1 }).add({ months: direction });

  return date.add({ days: definition.days * direction });
};
