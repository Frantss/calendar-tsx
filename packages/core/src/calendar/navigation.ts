import type { Temporal } from 'temporal-polyfill';

import type { Calendar_FirstDayOfWeek } from '#dates/date.types';
import type { Calendar_Navigation } from '#calendar/calendar.types';
import type { Calendar_View, Calendar_Views } from '#views/view.types';
import type { Calendar_LayoutFeature } from '#features/feature.types';

const DEFAULT_FIRST_DAY_OF_WEEK = 7;

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
  const range = layout.range(period, definition, navigation);

  return { period, range, inputRange: layout.inputRange?.(range, definition) ?? range };
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
  } as Calendar_Navigation<TViews>;
};
