import type { Temporal } from 'temporal-polyfill';

import { calendarNavigation_startOfWeek } from '#calendar-navigation';
import type {
  Calendar_DayGridViewSettings,
  Calendar_LayoutFeature,
  Calendar_ListViewSettings,
  Calendar_MonthViewSettings,
  Calendar_TimeGridViewSettings,
  Calendar_TimelineViewSettings,
} from '#calendar.types';
import { layoutList_build } from '#layout/layout-list';
import { layoutMonth_build } from '#layout/layout-month';
import { layoutTimeGrid_build } from '#layout/layout-time-grid';
import { layoutTimeline_build } from '#layout/layout-timeline';

/** A run of `days` days; a 7-day run starts on `firstDayOfWeek`. */
const days_period = (date: Temporal.PlainDate, days: number, firstDayOfWeek: number) => {
  const start = days === 7 ? calendarNavigation_startOfWeek(date, firstDayOfWeek) : date;

  return { start, end: start.add({ days: days - 1 }) };
};

export const monthLayout: Calendar_LayoutFeature<'month', Calendar_MonthViewSettings> = {
  kind: 'month',
  period: date => ({ start: date.with({ day: 1 }), end: date.with({ day: date.daysInMonth }) }),
  range: (period, settings, { firstDayOfWeek }) => {
    const start = calendarNavigation_startOfWeek(period.start, firstDayOfWeek);

    return {
      start,
      end: settings.fixedWeekCount
        ? start.add({ days: 6 * 7 - 1 })
        : calendarNavigation_startOfWeek(period.end, firstDayOfWeek).add({ days: 6 }),
    };
  },
  step: (date, _settings, direction) => date.with({ day: 1 }).add({ months: direction }),
  build: (input, settings) =>
    layoutMonth_build({
      definition: settings,
      range: input.range,
      period: input.period,
      events: input.events,
      today: input.now.toPlainDate(),
    }),
};

/** Whole weeks from the week containing the date, built as a month model (D34). */
export const dayGridLayout: Calendar_LayoutFeature<'dayGrid', Calendar_DayGridViewSettings> = {
  kind: 'dayGrid',
  period: (date, settings, { firstDayOfWeek }) => {
    const start = calendarNavigation_startOfWeek(date, firstDayOfWeek);

    return { start, end: start.add({ days: settings.weeks * 7 - 1 }) };
  },
  range: period => period,
  step: (date, settings, direction) => date.add({ weeks: settings.weeks * direction }),
  build: (input, settings) =>
    layoutMonth_build({
      definition: settings,
      range: input.range,
      period: input.period,
      events: input.events,
      today: input.now.toPlainDate(),
    }),
};

export const timeGridLayout: Calendar_LayoutFeature<'timeGrid', Calendar_TimeGridViewSettings> = {
  kind: 'timeGrid',
  period: (date, settings, { firstDayOfWeek }) => days_period(date, settings.days, firstDayOfWeek),
  range: period => period,
  step: (date, settings, direction) => date.add({ days: settings.days * direction }),
  build: (input, settings) =>
    layoutTimeGrid_build({
      definition: settings,
      range: input.range,
      events: input.events,
      resources: input.resources,
      timeZone: input.timeZone,
      now: input.now,
    }),
};

export const listLayout: Calendar_LayoutFeature<'list', Calendar_ListViewSettings> = {
  kind: 'list',
  period: (date, settings, { firstDayOfWeek }) => {
    if (settings.days !== undefined) return days_period(date, settings.days, firstDayOfWeek);
    if (settings.period === 'month') return { start: date.with({ day: 1 }), end: date.with({ day: date.daysInMonth }) };

    return { start: date.with({ month: 1, day: 1 }), end: date.with({ month: date.monthsInYear, day: 31 }) };
  },
  range: period => period,
  step: (date, settings, direction) => {
    if (settings.days !== undefined) return date.add({ days: settings.days * direction });
    if (settings.period === 'month') return date.with({ day: 1 }).add({ months: direction });

    return date.with({ month: 1, day: 1 }).add({ years: direction });
  },
  build: input => layoutList_build({ range: input.range, events: input.events }),
};

export const timelineLayout: Calendar_LayoutFeature<'timeline', Calendar_TimelineViewSettings> = {
  kind: 'timeline',
  period: (date, settings, { firstDayOfWeek }) => days_period(date, settings.days, firstDayOfWeek),
  range: period => period,
  step: (date, settings, direction) => date.add({ days: settings.days * direction }),
  build: (input, settings) =>
    layoutTimeline_build({
      definition: settings,
      range: input.range,
      events: input.events,
      resources: input.resources,
      timeZone: input.timeZone,
      now: input.now,
    }),
};
