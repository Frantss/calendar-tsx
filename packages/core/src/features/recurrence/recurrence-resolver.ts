import { Temporal } from 'temporal-polyfill';

import type { Calendar_Event, Calendar_EventSourceContext } from '#events/event.types';
import { checkDate, dateCompare, dateKey, fail } from '#features/recurrence/recurrence-dates';
import type { RecurrenceDate } from '#features/recurrence/recurrence-dates';
import { compileRule, expandRule } from '#features/recurrence/recurrence-rules';
import type { CompiledRule } from '#features/recurrence/recurrence-rules';
import type { Calendar_RecurringEventInput } from '#features/recurrence/recurrence.types';

type Compiled = {
  rule: CompiledRule;
  exclusions: CompiledRule[];
  dates: RecurrenceDate[];
  excludedDates: RecurrenceDate[];
  duration: Temporal.Duration;
  days: number;
  queries: Map<string, Calendar_Event<unknown>[]>;
};
const compiled = new WeakMap<Calendar_RecurringEventInput<unknown>, Compiled>();

const prepare = (source: Calendar_RecurringEventInput<unknown>): Compiled => {
  const cached = compiled.get(source);
  if (cached) return cached;
  if (
    source.kind === 'timed'
      ? !(source.start instanceof Temporal.ZonedDateTime)
      : !(source.start instanceof Temporal.PlainDate)
  )
    fail('start must be a Temporal date matching the series kind');
  if (source.start.calendarId !== 'iso8601') fail('recurrence requires the ISO 8601 calendar');
  if (source.kind === 'timed' && !source.duration) fail('timed recurrence requires duration');
  const duration = source.duration ?? Temporal.Duration.from({ days: 1 });
  if (!(duration instanceof Temporal.Duration) || duration.sign <= 0 || duration.years || duration.months)
    fail('duration must be positive with no years or months');
  const days = duration.weeks * 7 + duration.days;
  if (
    source.kind === 'allDay' &&
    (duration.hours ||
      duration.minutes ||
      duration.seconds ||
      duration.milliseconds ||
      duration.microseconds ||
      duration.nanoseconds)
  )
    fail('all-day duration must contain only whole weeks and days');
  // Balance days/weeks into hours so ZonedDateTime.add uses elapsed time across DST.
  const elapsed = Temporal.Duration.from({
    hours: duration.weeks * 168 + duration.days * 24 + duration.hours,
    minutes: duration.minutes,
    seconds: duration.seconds,
    milliseconds: duration.milliseconds,
    microseconds: duration.microseconds,
    nanoseconds: duration.nanoseconds,
  });
  const result = {
    rule: compileRule(source.rrule, source),
    exclusions: (source.exrule === undefined ? [] : Array.isArray(source.exrule) ? source.exrule : [source.exrule]).map(
      rule => compileRule(rule, source, true),
    ),
    dates: (source.rdate ?? []).map(date => checkDate(date, source)),
    excludedDates: (source.exdate ?? []).map(date => checkDate(date, source)),
    duration: elapsed,
    days,
    queries: new Map<string, Calendar_Event<unknown>[]>(),
  };
  compiled.set(source, result);
  return result;
};

export const recurrence_resolve = (
  source: Calendar_RecurringEventInput<unknown>,
  { range, timeZone }: Calendar_EventSourceContext,
): Calendar_Event<unknown>[] => {
  const plan = prepare(source);
  const key = `${range.start.toString()}/${range.end.toString()}/${timeZone}`;
  const cached = plan.queries.get(key);
  if (cached) return cached;
  const viewStart = range.start.toZonedDateTime(timeZone);
  const viewEnd = range.end.add({ days: 1 }).toZonedDateTime(timeZone);
  const lower =
    source.kind === 'allDay'
      ? range.start.subtract({ days: plan.days - 1 }).toZonedDateTime('UTC')
      : viewStart.subtract(plan.duration);
  const upper = source.kind === 'allDay' ? range.end.toZonedDateTime('UTC') : viewEnd;
  const exclusions = new Set(
    [...plan.excludedDates, ...plan.exclusions.flatMap(rule => expandRule(rule, lower, upper))].map(dateKey),
  );
  const dates = new Map<string, RecurrenceDate>();
  for (const date of [...expandRule(plan.rule, lower, upper), ...plan.dates])
    if (!exclusions.has(dateKey(date))) dates.set(dateKey(date), date);

  const common = { resourceIds: source.resourceIds, display: source.display, data: source.data };
  const events: Calendar_Event<unknown>[] = [];
  for (const start of [...dates.values()].sort(dateCompare)) {
    const occurrence = { seriesId: source.id, originalStart: start };
    // Keep occurrence IDs stable when a caller switches recurrence implementations.
    const id = `rrule:${JSON.stringify([source.id, dateKey(start)])}`;
    if (start instanceof Temporal.PlainDate) {
      const end = start.add({ days: plan.days - 1 });
      if (Temporal.PlainDate.compare(start, range.end) <= 0 && Temporal.PlainDate.compare(end, range.start) >= 0)
        events.push({ ...common, id, kind: 'allDay', start, end, occurrence });
    } else {
      const end = start.add(plan.duration);
      if (Temporal.ZonedDateTime.compare(start, viewEnd) < 0 && Temporal.ZonedDateTime.compare(end, viewStart) > 0)
        events.push({ ...common, id, kind: 'timed', start, end, occurrence });
    }
  }
  if (plan.queries.size >= 4) plan.queries.delete(plan.queries.keys().next().value!);
  plan.queries.set(key, events);
  return events;
};
