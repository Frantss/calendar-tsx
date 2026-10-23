import { Temporal } from 'temporal-polyfill';

import type { Calendar_AllDayEventInput, Calendar_Event, Calendar_EventInput, Calendar_Range } from '#calendar.types';

const MIDNIGHT = Temporal.PlainTime.from('00:00');

// bundlers replace `process.env.NODE_ENV` statically; declared here so the core needs no Node types
declare const process: { env: Record<string, string | undefined> };

const isDevelopment = () => typeof process === 'undefined' || process.env.NODE_ENV !== 'production';

export const calendarEvents_isAllDay = <TData>(
  event: Calendar_Event<TData>,
): event is Calendar_AllDayEventInput<TData> => 'allDay' in event && event.allDay === true;

/** Inclusive date span; a timed event ending exactly at midnight ends on the previous day. */
export const calendarEvents_dateSpan = <TData>(event: Calendar_Event<TData>): Calendar_Range => {
  if (calendarEvents_isAllDay(event)) return { start: event.start, end: event.end ?? event.start };

  const start = event.start.toPlainDate();
  const end = event.end.toPlainDate();
  const endsAtMidnight = event.end.toPlainTime().equals(MIDNIGHT) && Temporal.PlainDate.compare(end, start) > 0;

  return { start, end: endsAtMidnight ? end.subtract({ days: 1 }) : end };
};

export const calendarEvents_overlaps = <TData>(event: Calendar_Event<TData>, range: Calendar_Range) => {
  const span = calendarEvents_dateSpan(event);

  return (
    Temporal.PlainDate.compare(span.start, range.end) <= 0 && Temporal.PlainDate.compare(span.end, range.start) >= 0
  );
};

/** Earlier start first, then longer spans, then all-day before timed, then start time. */
export const calendarEvents_defaultOrder = <TData>(a: Calendar_Event<TData>, b: Calendar_Event<TData>) => {
  const spanA = calendarEvents_dateSpan(a);
  const spanB = calendarEvents_dateSpan(b);
  const byStartDate = Temporal.PlainDate.compare(spanA.start, spanB.start);

  if (byStartDate !== 0) return byStartDate;

  const byLength = spanB.start.until(spanB.end).days - spanA.start.until(spanA.end).days;

  if (byLength !== 0) return byLength;

  const allDayA = calendarEvents_isAllDay(a);
  const allDayB = calendarEvents_isAllDay(b);

  if (allDayA || allDayB) return allDayA === allDayB ? 0 : allDayA ? -1 : 1;

  return Temporal.ZonedDateTime.compare(a.start, b.start);
};

/** Converts timed events to `timeZone` (D7) and reports duplicate ids in development (D2). */
export const calendarEvents_normalize = <TData>(
  events: Calendar_EventInput<TData>[],
  timeZone: string,
): Calendar_Event<TData>[] => {
  if (isDevelopment()) {
    const seen = new Set<string>();

    for (const event of events) {
      if (seen.has(event.id)) console.error(`[calendar] duplicate event id "${event.id}"; event ids must be unique`);
      seen.add(event.id);
    }
  }

  return events.map(event =>
    calendarEvents_isAllDay(event)
      ? event
      : { ...event, start: event.start.withTimeZone(timeZone), end: event.end.withTimeZone(timeZone) },
  );
};
