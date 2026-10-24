import { Temporal } from 'temporal-polyfill';

export type RecurrenceDate = Temporal.PlainDate | Temporal.ZonedDateTime;
export type RecurrenceSeed =
  | { kind: 'timed'; start: Temporal.ZonedDateTime }
  | { kind: 'allDay'; start: Temporal.PlainDate };

export const fail = (message: string): never => {
  throw new RangeError(`[calendar/rrule] ${message}`);
};

export const plain = (date: RecurrenceDate): Temporal.PlainDateTime => date.toPlainDateTime();

/** UTC holds nominal wall fields so compatible DST resolution remains owned by the calendar (D50). */
export const toEngine = (date: Temporal.PlainDateTime): Temporal.ZonedDateTime => date.toZonedDateTime('UTC');

export const fromEngine = (date: Temporal.ZonedDateTime, source: RecurrenceSeed): RecurrenceDate => {
  const value = date.toPlainDateTime();
  if (source.kind === 'allDay') return value.toPlainDate();
  return value.equals(source.start.toPlainDateTime())
    ? source.start
    : value.toZonedDateTime(source.start.timeZoneId, { disambiguation: 'compatible' });
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

/** RFC basic dates are parsed by Temporal so invalid calendar fields cannot roll over silently. */
export const parseDateParts = (value: string) => {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) return fail(`invalid recurrence date "${value}"`);
  const [, year, month, day, hour, minute, second, utc] = match;
  const date = Temporal.PlainDateTime.from(
    `${year}-${month}-${day}T${hour ?? '00'}:${minute ?? '00'}:${second ?? '00'}`,
    { overflow: 'reject' },
  );
  return { date, hasTime: hour !== undefined, utc: !!utc };
};

export const parseDate = (value: string, source: RecurrenceSeed, tzid?: string): RecurrenceDate => {
  const { date, hasTime, utc } = parseDateParts(value);
  if (source.kind === 'allDay') {
    if (hasTime || tzid || utc) return fail('all-day recurrence dates must be DATE values');
    return date.toPlainDate();
  }
  if (!hasTime || (utc && tzid)) return fail('timed recurrence dates must be DATE-TIME values with one zone');
  return date.toZonedDateTime(utc ? 'UTC' : (tzid ?? source.start.timeZoneId), { disambiguation: 'compatible' });
};
