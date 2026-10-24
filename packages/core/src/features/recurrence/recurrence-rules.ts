import { Temporal } from 'temporal-polyfill';

import { checkDate, dateCompare, fail, occurrenceDate } from '#features/recurrence/recurrence-dates';
import type { RecurrenceDate, RecurrenceSeed } from '#features/recurrence/recurrence-dates';
import type { Calendar_RecurrenceExclusion, Calendar_RecurrenceOptions } from '#features/recurrence/recurrence.types';

const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export type CompiledRule = {
  seed: RecurrenceSeed;
  anchor: Temporal.PlainDate;
  step: number;
  offsets: number[];
  firstOffsets: number[];
  count?: number;
  until?: RecurrenceDate;
};

export const compileRule = (
  value: Calendar_RecurrenceOptions | Calendar_RecurrenceExclusion,
  parent: RecurrenceSeed,
  exclusion = false,
): CompiledRule => {
  if (!value || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null))
    return fail('rrule and exrule must be plain options objects');
  const allowed = ['freq', 'interval', 'count', 'until'];
  if (value.freq === 'WEEKLY') allowed.push('byDay', 'wkst');
  if (exclusion) allowed.push('start');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`unsupported rule option "${key}"`);
  if (value.freq !== 'DAILY' && value.freq !== 'WEEKLY') fail('freq must be DAILY or WEEKLY');
  for (const [key, min] of [
    ['interval', 1],
    ['count', 0],
  ] as const)
    if (value[key] !== undefined && (!Number.isSafeInteger(value[key]) || value[key]! < min)) fail(`invalid ${key}`);
  const start = 'start' in value && value.start !== undefined ? value.start : parent.start;
  checkDate(start, parent);
  const seed: RecurrenceSeed =
    start instanceof Temporal.ZonedDateTime ? { kind: 'timed', start } : { kind: 'allDay', start };
  if (start.year < 1 || start.year > 9999) fail('recurrence supports start years 1 through 9999');
  if (value.until !== undefined) checkDate(value.until, seed);
  const interval = value.interval ?? 1;
  const seedDate = start instanceof Temporal.ZonedDateTime ? start.toPlainDate() : start;
  let anchor = seedDate;
  let offsets = [0];
  let firstOffsets = offsets;
  if (value.freq === 'WEEKLY') {
    if (value.wkst !== undefined && !weekdays.includes(value.wkst)) fail('invalid wkst');
    if (
      value.byDay !== undefined &&
      (!Array.isArray(value.byDay) || !value.byDay.length || value.byDay.some(day => !weekdays.includes(day)))
    )
      fail('byDay must contain non-ordinal weekdays');
    const weekStart = weekdays.indexOf(value.wkst ?? 'MO') + 1;
    const seedOffset = (seedDate.dayOfWeek - weekStart + 7) % 7;
    anchor = seedDate.subtract({ days: seedOffset });
    offsets =
      value.byDay === undefined
        ? [seedOffset]
        : [...new Set(value.byDay.map(day => (weekdays.indexOf(day) + 1 - weekStart + 7) % 7))].sort((a, b) => a - b);
    firstOffsets = offsets.filter(offset => offset >= seedOffset);
  }
  return {
    seed,
    anchor,
    offsets,
    firstOffsets,
    step: interval * (value.freq === 'WEEKLY' ? 7 : 1),
    count: value.count,
    until: value.until,
  };
};

export const expandRule = (
  rule: CompiledRule,
  lower: Temporal.ZonedDateTime,
  upper: Temporal.ZonedDateTime,
): RecurrenceDate[] => {
  if (rule.count === 0) return [];
  // Padding admits nominal dates shifted across midnight by compatible DST resolution.
  const from =
    rule.seed.kind === 'allDay'
      ? lower.toPlainDate()
      : lower.withTimeZone(rule.seed.start.timeZoneId).toPlainDate().subtract({ days: 1 });
  let to =
    rule.seed.kind === 'allDay'
      ? upper.toPlainDate()
      : upper.withTimeZone(rule.seed.start.timeZoneId).toPlainDate().add({ days: 1 });
  if (rule.until) {
    const bound =
      rule.until instanceof Temporal.PlainDate
        ? rule.until
        : rule.until
            .withTimeZone(rule.seed.kind === 'timed' ? rule.seed.start.timeZoneId : 'UTC')
            .toPlainDate()
            .add({ days: 1 });
    if (Temporal.PlainDate.compare(bound, to) < 0) to = bound;
  }
  const distanceToEnd = rule.anchor.until(to).days;
  const first = Math.max(0, Math.floor(rule.anchor.until(from).days / rule.step));
  let last = Math.floor(distanceToEnd / rule.step);
  if (rule.count !== undefined) {
    const lastCountPeriod =
      rule.count <= rule.firstOffsets.length
        ? 0
        : 1 + Math.floor((rule.count - rule.firstOffsets.length - 1) / rule.offsets.length);
    last = Math.min(last, lastCountPeriod);
  }
  if (last - first + 1 > 10_000) fail('query exceeds 10000 recurrence periods');
  const dates: RecurrenceDate[] = [];
  for (let period = first; period <= last; period++) {
    const offsets = period === 0 ? rule.firstOffsets : rule.offsets;
    const before = period === 0 ? 0 : rule.firstOffsets.length + (period - 1) * rule.offsets.length;
    for (let index = 0; index < offsets.length; index++) {
      if (rule.count !== undefined && before + index >= rule.count) break;
      const distance = period * rule.step + offsets[index];
      if (distance > distanceToEnd) break;
      const date = rule.anchor.add({ days: distance });
      if (Temporal.PlainDate.compare(date, from) < 0) continue;
      const start = occurrenceDate(date, rule.seed);
      if (!rule.until || dateCompare(start, rule.until) <= 0) dates.push(start);
    }
  }
  return dates;
};
