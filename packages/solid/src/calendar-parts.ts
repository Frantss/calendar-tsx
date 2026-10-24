import type { JSX } from 'solid-js';
import type { Temporal } from 'temporal-polyfill';

import { useCalendarContext } from '#use-calendar';

export const calendarParts_attributes = (name: string) => ({ 'data-scope': 'calendar', 'data-part': name });

/** Geometry as `--cal-*` custom properties (D9); undefined values are omitted. */
export const calendarParts_vars = (values: Record<string, number | string | undefined>) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [`--cal-${key}`, value]),
  ) as JSX.CSSProperties;

/** Boolean data attributes render as `data-x=""` when true and are omitted when false. */
export const calendarParts_flag = (value: boolean) => (value ? '' : undefined);

export const calendarParts_timelineGeometry = (slots: { start: number; span: number }[]) => {
  const uniform = slots.length > 0 && slots.every(slot => Math.abs(slot.span - slots[0]!.span) < 1e-12);
  return {
    'track-slots': slots.length ? 1 / slots.reduce((minimum, slot) => Math.min(minimum, slot.span), 1) : 0,
    'slot-tracks': uniform
      ? 'repeat(var(--cal-slots), minmax(0, 1fr))'
      : slots.length
        ? slots.map(slot => `minmax(0, ${slot.span}fr)`).join(' ')
        : 'minmax(0, 1fr)',
    'slot-lines': uniform
      ? 'repeating-linear-gradient(to right, black 0px, black 1px, transparent 1px, transparent calc(100% / var(--cal-slots)))'
      : slots.length
        ? `linear-gradient(to right, ${slots
            .map(slot => {
              const at = `${slot.start * 100}%`;
              return `transparent ${at}, black ${at}, black calc(${at} + 1px), transparent calc(${at} + 1px)`;
            })
            .join(', ')}, transparent 100%)`
        : 'none',
  };
};

export const calendarParts_dateLabel = (date: Temporal.PlainDate, locale: string) =>
  date.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/** Built-in trigger action (D22); merged after consumer handlers so `preventDefault()` skips it. */
export const useCalendarParts_NavigateTrigger = (view: () => string, date: () => Temporal.PlainDate) => {
  const { instance } = useCalendarContext();

  return (event: MouseEvent) => {
    if (!event.defaultPrevented) instance.api.navigate({ view: view(), date: date() });
  };
};
