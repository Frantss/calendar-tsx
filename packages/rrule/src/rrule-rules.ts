import { RRuleTemporal, allowedFreq, allowedWeekdays } from 'rrule-temporal';
import { Temporal } from 'temporal-polyfill';

import { checkDate, dateCompare, fail, parseDate, parseDateParts, plain, toEngine } from '#rrule-dates';
import type { RecurrenceDate, RecurrenceSeed } from '#rrule-dates';
import type {
  Calendar_RRule,
  Calendar_RRuleEventInput,
  Calendar_RRuleOptions,
  Calendar_RRuleExclusion,
} from '#rrule.types';

export type CompiledRule = {
  engine: RRuleTemporal<Temporal.ZonedDateTime>;
  until?: RecurrenceDate;
  seed: RecurrenceSeed;
};
export type RuleSet = {
  rules: CompiledRule[];
  exclusions: CompiledRule[];
  dates: RecurrenceDate[];
  excludedDates: RecurrenceDate[];
};

type ValidatableOptions = Omit<Calendar_RRuleOptions, 'byMonth'> & { byMonth?: (number | string)[] };

const ranges = {
  byMonth: [1, 12],
  byMonthDay: [-31, 31],
  byYearDay: [-366, 366],
  byWeekNo: [-53, 53],
  bySetPos: [-366, 366],
  byHour: [0, 23],
  byMinute: [0, 59],
  bySecond: [0, 59],
} as const;
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;

const validateParts = (options: Partial<ValidatableOptions>) => {
  if (
    options.wkst !== undefined &&
    !allowedWeekdays.includes(options.wkst.toUpperCase() as (typeof allowedWeekdays)[number])
  )
    fail('invalid wkst');
  if (
    options.byDay !== undefined &&
    (!Array.isArray(options.byDay) ||
      !options.byDay.length ||
      options.byDay.some(
        value =>
          typeof value !== 'string' ||
          !/^(?:[+-]?[1-9]\d?)?(?:MO|TU|WE|TH|FR|SA|SU)$/i.test(value) ||
          Math.abs(parseInt(value, 10)) > 53,
      ))
  )
    fail('invalid byDay');
  for (const [key, min] of [
    ['interval', 1],
    ['count', 0],
    ['maxIterations', 1],
    ['maxCandidateEvaluations', 1],
  ] as const)
    if (options[key] !== undefined && !integer(options[key], min, Number.MAX_SAFE_INTEGER)) fail(`invalid ${key}`);
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const values = options[key as keyof typeof ranges];
    if (values === undefined) continue;
    if (
      !Array.isArray(values) ||
      !values.length ||
      values.some(value => !integer(value, min, max) || (min < 0 && value === 0))
    )
      fail(`invalid ${key}`);
  }
};

const validate = (options: ValidatableOptions, source: RecurrenceSeed) => {
  validateParts(options);
  if (!allowedFreq.includes(options.freq)) fail('freq must be an rrule-temporal frequency');
  if (
    source.kind === 'allDay' &&
    (['HOURLY', 'MINUTELY', 'SECONDLY'].includes(options.freq) ||
      [options.byHour, options.byMinute, options.bySecond].some(values => values?.some(value => value !== 0)))
  )
    fail('all-day rules must use daily or coarser frequencies and midnight selectors');
};

const parseRule = (value: Calendar_RRule, source: RecurrenceSeed): CompiledRule => {
  const dtstart = toEngine(plain(source.start));
  if (dtstart.year < 1 || dtstart.year > 9999) fail('recurrence supports start years 1 through 9999');
  const shared = { dtstart, tzid: 'UTC', temporal: Temporal, cache: false };
  if (typeof value === 'string') {
    if (/\b(?:DTSTART|TZID)=/i.test(value)) fail('put DTSTART on its own line; start owns the series zone');
    const fields = value
      .toUpperCase()
      .replace(/^(?:RRULE|EXRULE):/, '')
      .split(';');
    const parts: Partial<Calendar_RRuleOptions> = {};
    let until: RecurrenceDate | undefined;
    let bound: Temporal.ZonedDateTime | undefined;
    const ruleFields: string[] = [];
    for (const field of fields) {
      const [key, text] = field.split('=');
      if (key === 'UNTIL') {
        until = parseDate(text, source);
        bound = text.endsWith('Z')
          ? toEngine(plain(checkDate(until, source)).add({ days: 1 }))
          : toEngine(parseDateParts(text).date);
        continue;
      }
      const selector = Object.keys(ranges).find(name => name.toUpperCase() === key) as keyof typeof ranges | undefined;
      if (selector) parts[selector] = text.split(',').map(Number);
      else if (key === 'COUNT' || key === 'INTERVAL') parts[key === 'COUNT' ? 'count' : 'interval'] = Number(text);
      else if (key === 'BYDAY') parts.byDay = text.split(',');
      else if (key === 'WKST') parts.wkst = text;
      else if (key !== 'FREQ') fail(`unsupported RRULE property "${key}"`);
      ruleFields.push(field);
    }
    // The engine sanitizes invalid numeric selectors by dropping them; reject before it can broaden a rule.
    validateParts(parts);
    const engine = new RRuleTemporal({ ...shared, rruleString: ruleFields.join(';'), until: bound });
    validate(engine.options(), source);
    return { engine, until, seed: source };
  }
  if (!value || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null))
    return fail('rrule must be a string or plain options object, not a rule instance');
  const allowed = [
    'freq',
    'interval',
    'count',
    'until',
    'wkst',
    'byDay',
    ...Object.keys(ranges),
    'maxIterations',
    'maxCandidateEvaluations',
    'includeDtstart',
    'strict',
  ];
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`unsupported rule option "${key}"`);
  validate(value, source);
  const { until, ...options } = value;
  if (until !== undefined) checkDate(until, source);
  const bound = until
    ? toEngine(plain(checkDate(until, source)).add({ days: source.kind === 'timed' ? 1 : 0 }))
    : undefined;
  return { engine: new RRuleTemporal({ ...options, ...shared, until: bound }), until, seed: source };
};

const parseExclusion = (value: Calendar_RRuleExclusion, source: RecurrenceSeed): CompiledRule => {
  if (typeof value === 'string') return parseRule(value, source);
  if (!value || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null))
    return fail('exrule must be a string or plain options object, not a rule instance');
  const { start, ...options } = value;
  if (start === undefined) return parseRule(options, source);
  checkDate(start, source);
  const seed: RecurrenceSeed =
    start instanceof Temporal.ZonedDateTime ? { kind: 'timed', start } : { kind: 'allDay', start };
  return parseRule(options, seed);
};

const lines = (value: string) =>
  value
    .replace(/\r?\n[ \t]/g, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

export const compileRules = (source: Calendar_RRuleEventInput<unknown>): RuleSet => {
  const result: RuleSet = { rules: [], exclusions: [], dates: [], excludedDates: [] };
  if (typeof source.rrule !== 'string') result.rules.push(parseRule(source.rrule, source));
  else
    for (const line of lines(source.rrule)) {
      if (/^RRULE:/i.test(line) || (!line.includes(':') && /(?:^|;)FREQ=/i.test(line))) {
        result.rules.push(parseRule(line, source));
        continue;
      }
      if (/^EXRULE:/i.test(line)) {
        result.exclusions.push(parseRule(line, source));
        continue;
      }
      const colon = line.indexOf(':');
      if (colon < 0) fail(`invalid recurrence line "${line}"`);
      const [name, ...parameters] = line.slice(0, colon).split(';');
      const property = name.toUpperCase();
      const value = line.slice(colon + 1);
      let tzid: string | undefined;
      let dateType: string | undefined;
      for (const parameter of parameters) {
        const [name, field] = parameter.split('=');
        const key = name.toUpperCase();
        if (key === 'TZID' && field) tzid = field;
        else if (key === 'VALUE' && (field === 'DATE' || field === 'DATE-TIME')) dateType = field;
        else fail(`unsupported recurrence parameter "${parameter}"`);
      }
      if (!['DTSTART', 'RDATE', 'EXDATE'].includes(property)) fail(`unsupported recurrence property "${property}"`);
      if (dateType && dateType !== (source.kind === 'allDay' ? 'DATE' : 'DATE-TIME'))
        fail('VALUE must match the series kind');
      if (property === 'DTSTART' && tzid && (source.kind === 'allDay' || source.start.timeZoneId !== tzid))
        fail('DTSTART TZID conflicts with start');
      for (const field of value.split(',')) {
        const date = parseDate(field, source, tzid);
        if (property === 'DTSTART') {
          if (
            dateCompare(date, source.start) !== 0 ||
            (!field.endsWith('Z') &&
              field !==
                (source.kind === 'allDay'
                  ? source.start.toString().replaceAll('-', '')
                  : source.start
                      .toPlainDateTime()
                      .toString({ smallestUnit: 'second' })
                      .replaceAll('-', '')
                      .replaceAll(':', '')))
          )
            fail('DTSTART conflicts with start');
        } else (property === 'RDATE' ? result.dates : result.excludedDates).push(checkDate(date, source));
      }
    }
  if (!result.rules.length) fail('rrule must contain at least one RRULE');
  for (const value of source.exrule === undefined ? [] : Array.isArray(source.exrule) ? source.exrule : [source.exrule])
    result.exclusions.push(parseExclusion(value, source));
  for (const date of source.rdate ?? []) result.dates.push(checkDate(date, source));
  for (const date of source.exdate ?? []) result.excludedDates.push(checkDate(date, source));
  return result;
};
