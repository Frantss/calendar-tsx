import { Temporal } from 'temporal-polyfill';

import type {
  Calendar_FirstDayOfWeek,
  Calendar_LayoutFeature,
  Calendar_Navigation,
  Calendar_Range,
  Calendar_View,
  Calendar_Views,
} from '#calendar.types';

const DEFAULT_FIRST_DAY_OF_WEEK = 7;

export const calendarNavigation_startOfWeek = (date: Temporal.PlainDate, firstDayOfWeek: number) =>
  date.subtract({ days: (date.dayOfWeek - firstDayOfWeek + 7) % 7 });

export const calendarNavigation_days = (range: Calendar_Range) => {
  const days: Temporal.PlainDate[] = [];

  for (let day = range.start; Temporal.PlainDate.compare(day, range.end) <= 0; day = day.add({ days: 1 }))
    days.push(day);

  return days;
};

export const calendarNavigation_contains = (range: Calendar_Range, date: Temporal.PlainDate) =>
  Temporal.PlainDate.compare(date, range.start) >= 0 && Temporal.PlainDate.compare(date, range.end) <= 0;

/** The view's own layout feature; an instance resolves the key through its `features` first. */
export const calendarNavigation_layout = (view: Calendar_View) =>
  (view['~features'] as Record<string, Calendar_LayoutFeature>)[view['~layout']] as Calendar_LayoutFeature;

export const calendarNavigation_view = <TViews extends Calendar_Views>(views: TViews, view: keyof TViews & string) => {
  const definition = views[view];

  if (!definition) throw new Error(`[calendar] unknown view "${view}"`);

  return definition;
};

export const calendarNavigation_resolve = (
  layout: Calendar_LayoutFeature,
  definition: Calendar_View,
  date: Temporal.PlainDate,
  options: { firstDayOfWeek?: number },
) => {
  const navigation = {
    firstDayOfWeek: (options.firstDayOfWeek ?? DEFAULT_FIRST_DAY_OF_WEEK) as Calendar_FirstDayOfWeek,
  };
  const period = layout.period(date, definition, navigation);

  return { period, range: layout.range(period, definition, navigation) };
};

/** Range and period for any view and date, without an instance (app R2.5). */
export const getCalendarNavigation = <TViews extends Calendar_Views>(
  views: TViews,
  view: keyof TViews & string,
  date: Temporal.PlainDate,
  options: { firstDayOfWeek?: number } = {},
): Calendar_Navigation<TViews> => {
  const definition = calendarNavigation_view(views, view);

  return {
    view,
    date,
    ...calendarNavigation_resolve(calendarNavigation_layout(definition), definition, date, options),
  };
};
