import { Temporal } from 'temporal-polyfill';

export type RecurrenceDate = Temporal.PlainDate | Temporal.ZonedDateTime;
export type RecurrenceSeed =
  | { kind: 'timed'; start: Temporal.ZonedDateTime }
  | { kind: 'allDay'; start: Temporal.PlainDate };

export const fail = (message: string): never => {
  throw new RangeError(`[calendar/recurrence] ${message}`);
};

export const dateKey = (date: RecurrenceDate): string =>
  date instanceof Temporal.ZonedDateTime ? date.epochNanoseconds.toString() : date.toString();

export const dateCompare = (a: RecurrenceDate, b: RecurrenceDate): number => {
  if (a instanceof Temporal.ZonedDateTime && b instanceof Temporal.ZonedDateTime)
    return Temporal.ZonedDateTime.compare(a, b);
  if (a instanceof Temporal.PlainDate && b instanceof Temporal.PlainDate) return Temporal.PlainDate.compare(a, b);
  return fail('date kind must match the series kind');
};

export const checkDate = (date: RecurrenceDate, source: RecurrenceSeed): RecurrenceDate => {
  if (!date || date.calendarId !== 'iso8601') return fail('recurrence dates must use the ISO 8601 calendar');
  if (source.kind === 'timed' && date instanceof Temporal.ZonedDateTime)
    return date.withTimeZone(source.start.timeZoneId);
  if (source.kind === 'allDay' && date instanceof Temporal.PlainDate) return date;
  return fail('date kind must match the series kind');
};

export const occurrenceDate = (date: Temporal.PlainDate, seed: RecurrenceSeed): RecurrenceDate => {
  if (seed.kind === 'allDay') return date;
  const nominal = date.toPlainDateTime(seed.start.toPlainTime());
  return nominal.equals(seed.start.toPlainDateTime())
    ? seed.start
    : nominal.toZonedDateTime(seed.start.timeZoneId, { disambiguation: 'compatible' });
};
