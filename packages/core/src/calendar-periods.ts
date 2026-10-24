import { Temporal } from 'temporal-polyfill';

import { calendarNavigation_days, calendarNavigation_startOfWeek } from '#calendar-navigation';
import type {
  Calendar_DurationSettings,
  Calendar_NavigationOptions,
  Calendar_Range,
  Calendar_VisibilitySettings,
} from '#calendar.types';

export const calendarPeriods_groups = (groupBy?: string | readonly string[]) =>
  typeof groupBy === 'string' ? [groupBy] : (groupBy ?? []);

export const calendarPeriods_validate = (settings: Calendar_DurationSettings & Calendar_VisibilitySettings) => {
  const counts = [settings.days, settings.weeks, settings.months];
  if (counts.filter(value => value !== undefined).length + Number(settings.period !== undefined) !== 1)
    throw new Error('[calendar] provide exactly one of days, weeks, months or period');
  if (counts.some(value => value !== undefined && (!Number.isSafeInteger(value) || value < 1)))
    throw new Error('[calendar] duration counts must be positive integers');
  if (settings.period !== undefined && !['month', 'quarter', 'year'].includes(settings.period))
    throw new Error('[calendar] unknown calendar period');
  const hidden = settings.hiddenDays ?? [];
  if (hidden.some(day => !Number.isInteger(day) || day < 1 || day > 7) || new Set(hidden).size === 7)
    throw new Error('[calendar] hiddenDays must leave at least one ISO weekday visible');
};

export const calendarPeriods_months = (range: Calendar_Range) => {
  const months: Temporal.PlainDate[] = [];
  for (
    let month = range.start.with({ day: 1 });
    Temporal.PlainDate.compare(month, range.end) <= 0;
    month = month.add({ months: 1 })
  )
    months.push(month);
  return months;
};

export const calendarPeriods_resolve = (
  date: Temporal.PlainDate,
  settings: Calendar_DurationSettings,
  { firstDayOfWeek }: Calendar_NavigationOptions,
): Calendar_Range => {
  if (settings.days !== undefined) {
    const start = settings.days === 7 ? calendarNavigation_startOfWeek(date, firstDayOfWeek) : date;
    return { start, end: start.add({ days: settings.days - 1 }) };
  }
  if (settings.weeks !== undefined) {
    const start = calendarNavigation_startOfWeek(date, firstDayOfWeek);
    return { start, end: start.add({ weeks: settings.weeks }).subtract({ days: 1 }) };
  }
  let start = date.with({ day: 1 });
  if (settings.period === 'year') start = start.with({ month: 1 });
  if (settings.period === 'quarter') start = start.with({ month: Math.floor((start.month - 1) / 3) * 3 + 1 });
  const end =
    settings.period === 'year'
      ? start.add({ years: 1 }).subtract({ days: 1 })
      : start.add({ months: settings.months ?? (settings.period === 'quarter' ? 3 : 1) }).subtract({ days: 1 });
  return { start, end };
};

export const calendarPeriods_step = (
  date: Temporal.PlainDate,
  settings: Calendar_DurationSettings,
  direction: 1 | -1,
) => {
  if (settings.days !== undefined) return date.add({ days: settings.days * direction });
  if (settings.weeks !== undefined) return date.add({ weeks: settings.weeks * direction });
  const start = calendarPeriods_resolve(date, settings, { firstDayOfWeek: 7 }).start;
  return settings.period === 'year'
    ? start.add({ years: direction })
    : start.add({ months: (settings.months ?? (settings.period === 'quarter' ? 3 : 1)) * direction });
};

export const calendarPeriods_visibleDays = (range: Calendar_Range, settings: Calendar_VisibilitySettings) =>
  calendarNavigation_days(range).filter(date => !settings.hiddenDays?.some(day => day === date.dayOfWeek));

export const calendarPeriods_pad = (
  period: Calendar_Range,
  firstDayOfWeek: number,
  fixedWeekCount = false,
): Calendar_Range => {
  const start = calendarNavigation_startOfWeek(period.start, firstDayOfWeek);
  return {
    start,
    end: fixedWeekCount
      ? start.add({ days: 41 })
      : calendarNavigation_startOfWeek(period.end, firstDayOfWeek).add({ days: 6 }),
  };
};
