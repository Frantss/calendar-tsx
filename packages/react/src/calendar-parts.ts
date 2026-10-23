import type { CSSProperties, MouseEvent } from 'react';
import type { Temporal } from 'temporal-polyfill';

import { useCalendarContext } from '#use-calendar';

export const calendarParts_attributes = (name: string) => ({ 'data-scope': 'calendar', 'data-part': name });

/** Geometry as `--cal-*` custom properties (D9); undefined values are omitted. */
export const calendarParts_vars = (values: Record<string, number | string | undefined>) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [`--cal-${key}`, value]),
  ) as CSSProperties;

/** Boolean data attributes render as `data-x=""` when true and are omitted when false. */
export const calendarParts_flag = (value: boolean) => (value ? '' : undefined);

export const calendarParts_dateLabel = (date: Temporal.PlainDate, locale: string) =>
  date.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/** Built-in trigger action (D22); merged after consumer handlers so `preventDefault()` skips it. */
export const useCalendarParts_NavigateTrigger = (view: string, date: Temporal.PlainDate) => {
  const { instance } = useCalendarContext();

  return (event: MouseEvent) => {
    if (!event.defaultPrevented) instance.api.navigate({ view, date });
  };
};
