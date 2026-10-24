import type { Calendar_Features, Calendar_Options, Calendar_Views, Calendar_View } from '#calendar.types';

type AnyOptions = Calendar_Options<any, any, Calendar_Views, Calendar_Features>;

/** Every feature the calendar registers, then any a view declares that `features` leaves out (D29). */
export const calendarFeatures_collect = (options: AnyOptions) => {
  const all: Calendar_Features = { ...options.features };

  for (const view of Object.values(options.views))
    for (const [key, feature] of Object.entries(view['~features'])) all[key] ??= feature;

  return all;
};

/** The features that take part in a view: those it lists, plus calendar-wide ones no view lists. */
export const calendarFeatures_active = (all: Calendar_Features, views: Calendar_Views, view: Calendar_View) => {
  const declared = new Set(Object.values(views).flatMap(definition => Object.keys(definition['~features'])));

  return Object.entries(all).filter(([key]) => !declared.has(key) || key in view['~features']);
};
