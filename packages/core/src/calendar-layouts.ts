import type { Temporal } from 'temporal-polyfill';

import { calendarNavigation_startOfWeek } from '#calendar-navigation';
import type {
  Calendar_LayoutFeature,
  Calendar_ListViewSettings,
  Calendar_MonthViewSettings,
  Calendar_TimeGridViewSettings,
} from '#calendar.types';
import { layoutList_build } from '#layout/layout-list';
import { layoutMonth_build } from '#layout/layout-month';
import { layoutTimeGrid_build } from '#layout/layout-time-grid';

/** A run of `days` days; a 7-day run starts on `firstDayOfWeek`. */
const days_period = (date: Temporal.PlainDate, days: number, firstDayOfWeek: number) => {
  const start = days === 7 ? calendarNavigation_startOfWeek(date, firstDayOfWeek) : date;

  return { start, end: start.add({ days: days - 1 }) };
};

export const monthLayout: Calendar_LayoutFeature<'month', Calendar_MonthViewSettings> = {
  kind: 'month',
  period: date => ({ start: date.with({ day: 1 }), end: date.with({ day: date.daysInMonth }) }),
  range: (period, _settings, { firstDayOfWeek }) => ({
    start: calendarNavigation_startOfWeek(period.start, firstDayOfWeek),
    end: calendarNavigation_startOfWeek(period.end, firstDayOfWeek).add({ days: 6 }),
  }),
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
  period: (date, settings, { firstDayOfWeek }) => days_period(date, settings.days, firstDayOfWeek),
  range: period => period,
  step: (date, settings, direction) => date.add({ days: settings.days * direction }),
  build: input => layoutList_build({ range: input.range, events: input.events }),
};
