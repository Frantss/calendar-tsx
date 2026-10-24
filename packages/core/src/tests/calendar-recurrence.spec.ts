import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';

import { createCalendar } from '#calendar';
import { fixedClock } from '#calendar-clock';
import { createEventStore } from '#calendar-event-store';
import { createEvent } from '#calendar-events';
import { createCalendarViews, listView, dayGridView, timeGridView, timelineView } from '#calendar-views';
import { createRecurringEvent, recurrenceFeature } from '#calendar-recurrence';
import type { Calendar_Event, Calendar_EventDefinition, Calendar_Feature, Calendar_Clock } from '#calendar.types';
import type {
  Calendar_RecurrenceOptions,
  Calendar_RecurringTimedEventInput,
  Calendar_RecurringAllDayEventInput,
  Calendar_RecurrenceExclusion,
} from '#calendar-recurrence.types';

const zdt = (value: string) => Temporal.ZonedDateTime.from(value.includes('[') ? value : `${value}[America/New_York]`);
const date = (value: string) => Temporal.PlainDate.from(value);
const duration = (value: Parameters<typeof Temporal.Duration.from>[0]) => Temporal.Duration.from(value);
const timed = (overrides: Partial<Omit<Calendar_RecurringTimedEventInput<{ title: string }>, '~source'>> = {}) =>
  createRecurringEvent({
    id: 'series',
    kind: 'timed',
    start: zdt('2026-01-01T09:00'),
    duration: duration({ minutes: 30 }),
    rrule: { freq: 'DAILY', count: 3 },
    data: { title: 'Review' },
    ...overrides,
  });
const allDay = (overrides: Partial<Omit<Calendar_RecurringAllDayEventInput<{ title: string }>, '~source'>> = {}) =>
  createRecurringEvent({
    id: 'all',
    kind: 'allDay',
    start: date('2026-01-01'),
    rrule: { freq: 'DAILY', count: 3 },
    data: { title: 'Holiday' },
    ...overrides,
  });
const expand = (
  source: ReturnType<typeof timed> | ReturnType<typeof allDay>,
  start = '2026-01-01',
  end = '2026-12-31',
  timeZone = 'America/New_York',
) => recurrenceFeature.resolveEvents(source, { range: { start: date(start), end: date(end) }, timeZone });
const starts = (events: Calendar_Event<unknown>[]) => events.map(event => event.start.toString());
const dates = (events: Calendar_Event<unknown>[]) =>
  events.map(event => (event.kind === 'timed' ? event.start.toPlainDate().toString() : event.start.toString()));
it('gates native definitions by their feature and infers store source keys and data', () => {
  const source = timed();
  expectTypeOf(source.data).toEqualTypeOf<{ title: string }>();
  const store = createEventStore([source]);
  expectTypeOf<(typeof store.store.state.events)[number]['~source']>().toEqualTypeOf<'recurrenceFeature' | undefined>();
  store.add([allDay(), createEvent({ id: 'one', kind: 'allDay', start: date('2026-01-01'), data: { title: 'One' } })]);
  expectTypeOf(source).toExtend<Calendar_EventDefinition<{ title: string }, { recurrenceFeature: typeof recurrenceFeature }>>();
  expectTypeOf(source).not.toExtend<Calendar_EventDefinition<{ title: string }, {}>>();
  expectTypeOf<{ freq: 'DAILY'; byDay: ['MO'] }>().not.toExtend<Calendar_RecurrenceOptions>();
  expectTypeOf<{ freq: 'MONTHLY' }>().not.toExtend<Calendar_RecurrenceOptions>();
  expectTypeOf<{ freq: 'WEEKLY'; byDay: ['2FR'] }>().not.toExtend<Calendar_RecurrenceOptions>();
  expectTypeOf<{ freq: 'DAILY'; until: Temporal.PlainDate }>().not.toExtend<Calendar_RecurrenceOptions<Temporal.ZonedDateTime>>();
  expectTypeOf<{ freq: 'DAILY'; start: Temporal.PlainDate }>().not.toExtend<Calendar_RecurrenceExclusion<Temporal.ZonedDateTime>>();
});

it('expands daily intervals and applies inclusive UNTIL together with COUNT', () => {
  const source = timed({ rrule: { freq: 'DAILY', interval: 2, count: 5, until: zdt('2026-01-05T09:00') } });
  expect(dates(expand(source))).toEqual(['2026-01-01', '2026-01-03', '2026-01-05']);
  expect(expand(timed({ rrule: { freq: 'DAILY', count: 0 } }))).toEqual([]);
  expect(expand(timed({ rrule: { freq: 'DAILY', until: zdt('2025-12-31T09:00') } }))).toEqual([]);
});

it('anchors weekly intervals to WKST and defaults to the seed weekday', () => {
  const options = { freq: 'WEEKLY' as const, interval: 2, count: 4, byDay: ['SU', 'MO'] as ('SU' | 'MO')[] };
  const monday = allDay({ start: date('2026-01-04'), rrule: options });
  const sunday = allDay({ start: date('2026-01-04'), rrule: { ...options, wkst: 'SU' } });
  expect(dates(expand(monday))).toEqual(['2026-01-04', '2026-01-12', '2026-01-18', '2026-01-26']);
  expect(dates(expand(sunday))).toEqual(['2026-01-04', '2026-01-05', '2026-01-18', '2026-01-19']);
  expect(dates(expand(allDay({ rrule: { freq: 'WEEKLY', count: 3 } })))).toEqual(['2026-01-01', '2026-01-08', '2026-01-15']);
});

it('sorts and deduplicates weekdays without forcing DTSTART into the occurrence set', () => {
  const source = allDay({ rrule: { freq: 'WEEKLY', byDay: ['WE', 'MO', 'MO'], count: 3 } });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-01-07', '2026-01-12']);
});

it('keeps wall times and nominal COUNT through DST gaps and folds', () => {
  const gap = timed({ start: zdt('2026-03-07T02:30') });
  expect(starts(expand(gap))).toEqual([
    '2026-03-07T02:30:00-05:00[America/New_York]',
    '2026-03-08T03:30:00-04:00[America/New_York]',
    '2026-03-09T02:30:00-04:00[America/New_York]',
  ]);
  const fold = timed({ start: zdt('2026-10-31T01:30') });
  expect(expand(fold)[1]?.start.toString()).toBe('2026-11-01T01:30:00-04:00[America/New_York]');
  const weekly = timed({ start: zdt('2026-03-02T09:00'), rrule: { freq: 'WEEKLY', count: 3 } });
  expect(expand(weekly)[1]?.start.toString()).toBe('2026-03-09T09:00:00-04:00[America/New_York]');
});

it('preserves seed nanoseconds and an explicitly selected later fold offset', () => {
  const seed = zdt('2026-11-01T01:30:00.123456789-05:00[America/New_York]');
  const source = timed({ start: seed });
  expect(expand(source)[0]?.start.equals(seed)).toBe(true);
  expect(expand(source)[1]?.start.toString()).toBe('2026-11-02T01:30:00.123456789-05:00[America/New_York]');
});

it('checks inclusive UNTIL against resolved instants in another zone', () => {
  const seed = zdt('2026-03-07T09:00');
  const inclusive = timed({ start: seed, rrule: { freq: 'DAILY', until: zdt('2026-03-09T13:00[UTC]') } });
  const exclusive = timed({ start: seed, rrule: { freq: 'DAILY', until: zdt('2026-03-09T12:59:59.999999999[UTC]') } });
  expect(dates(expand(inclusive))).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
  expect(dates(expand(exclusive))).toEqual(['2026-03-07', '2026-03-08']);
});

it('merges exception dates by instant and applies exclusions after COUNT without replenishment', () => {
  const source = timed({
    rrule: { freq: 'DAILY', count: 4 },
    rdate: [zdt('2026-01-03T14:00[UTC]'), zdt('2026-01-07T09:00')],
    exdate: [zdt('2026-01-02T14:00[UTC]')],
    exrule: { freq: 'DAILY', interval: 3, count: 2 },
  });
  expect(dates(expand(source))).toEqual(['2026-01-03', '2026-01-07']);
  const onlyDates = allDay({ rrule: { freq: 'DAILY', count: 0 }, rdate: [date('2025-12-31'), date('2026-01-02')] });
  expect(dates(expand(onlyDates, '2025-12-01'))).toEqual(['2025-12-31', '2026-01-02']);
});

it('supports independently bounded all-day exclusions and arrays with inherited seeds', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'WEEKLY', count: 4 },
    exrule: [
      { freq: 'WEEKLY', start: date('2026-01-19'), until: date('2026-01-26') },
      { freq: 'DAILY', count: 1 },
    ],
    rdate: [date('2026-01-19')],
  });
  expect(dates(expand(source))).toEqual(['2026-01-12']);
});

it('counts exclusions from their own earlier seed and retains independent interval phase', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'DAILY', count: 7 },
    exrule: { freq: 'DAILY', start: date('2026-01-01'), interval: 2, count: 4 },
  });
  expect(dates(expand(source))).toEqual(['2026-01-06', '2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11']);
});

it('keeps exclusion zones independent across DST and compares matching instants', () => {
  const source = timed({
    start: zdt('2026-03-06T09:00'),
    rrule: { freq: 'DAILY', count: 5 },
    exrule: { freq: 'DAILY', start: zdt('2026-03-07T14:00[UTC]'), until: zdt('2026-03-09T14:00[UTC]') },
  });
  expect(dates(expand(source))).toEqual(['2026-03-06', '2026-03-08', '2026-03-09', '2026-03-10']);
  const empty = timed({ exrule: { freq: 'DAILY', start: zdt('2026-01-03T09:00'), until: zdt('2026-01-02T09:00') } });
  expect(dates(expand(empty))).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
});

it('uses elapsed timed durations, exclusive ends and prior-start overlap lookback across DST', () => {
  const source = timed({ start: zdt('2026-03-07T23:30'), duration: duration({ hours: 4 }), rrule: { freq: 'DAILY', count: 2 } });
  expect(dates(expand(source, '2026-03-08', '2026-03-08'))).toEqual(['2026-03-07', '2026-03-08']);
  expect(expand(source, '2026-03-08', '2026-03-08')[0]?.end?.toString()).toBe('2026-03-08T04:30:00-04:00[America/New_York]');
  const day = timed({ start: zdt('2026-03-07T09:00'), duration: duration({ days: 1 }), rrule: { freq: 'DAILY', count: 1 } });
  expect(expand(day)[0]?.end?.toString()).toBe('2026-03-08T10:00:00-04:00[America/New_York]');
  expect(
    expand(timed({ start: zdt('2026-01-01T23:00'), duration: duration({ hours: 1 }), rrule: { freq: 'DAILY', count: 1 } }), '2026-01-02'),
  ).toEqual([]);
});

it('uses inclusive all-day ends, whole weeks and prior-start overlap lookback', () => {
  const source = allDay({ duration: duration({ days: 3 }), rrule: { freq: 'WEEKLY', count: 1 } });
  expect(dates(expand(source, '2026-01-03', '2026-01-03'))).toEqual(['2026-01-01']);
  expect(expand(source)[0]?.end?.toString()).toBe('2026-01-03');
});

it('deduplicates nominal candidates shifted onto the same instant by a skipped date', () => {
  const source = timed({ start: zdt('2011-12-29T09:00[Pacific/Apia]'), rrule: { freq: 'DAILY', count: 4 } });
  expect(dates(expand(source, '2011-12-29', '2012-01-02', 'Pacific/Apia'))).toEqual(['2011-12-29', '2011-12-31', '2012-01-01']);
});

it('seeks into old finite and infinite series without replaying historical dates', () => {
  const source = allDay({ start: date('0001-01-01'), rrule: { freq: 'DAILY' } });
  expect(dates(expand(source, '2026-01-02', '2026-01-02'))).toEqual(['2026-01-02']);
  expect(expand(allDay({ start: source.start, rrule: { freq: 'DAILY', count: 100 } }), '2026-01-02')).toEqual([]);
  const weekly = allDay({ start: date('2000-01-05'), rrule: { freq: 'WEEKLY', byDay: ['MO', 'FR'], interval: 3, count: 2 } });
  expect(expand(weekly, '2026-01-01', '2026-02-01')).toEqual([]);
  expect(dates(expand(allDay({ rrule: { freq: 'DAILY', interval: Number.MAX_SAFE_INTEGER } })))).toEqual(['2026-01-01']);
});

it('keeps IDs and original starts stable across display zones, ranges and cache eviction', () => {
  const source = timed({ rrule: { freq: 'DAILY' } });
  const initial = expand(source, '2026-01-01', '2026-01-02');
  const other = expand(source, '2026-01-02', '2026-01-03', 'Asia/Tokyo');
  expect(initial[1]?.id).toBe(other[0]?.id);
  expect(initial[1]?.occurrence?.originalStart.equals(zdt('2026-01-02T09:00'))).toBe(true);
  for (let day = 3; day < 10; day++) expand(source, `2026-01-0${day}`, `2026-01-0${day}`);
  expect(expand(source, '2026-01-01', '2026-01-02')[1]?.id).toBe(initial[1]?.id);
});

it('bounds work per query after seeking and applying COUNT and UNTIL', () => {
  expect(() => expand(allDay({ rrule: { freq: 'DAILY' } }), '2026-01-01', '2056-01-01')).toThrow(/10000 recurrence periods/);
  expect(dates(expand(allDay(), '2026-01-01', '2056-01-01'))).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  expect(dates(expand(allDay({ rrule: { freq: 'DAILY', until: date('2026-01-02') } }), '2026-01-01', '2056-01-01'))).toEqual([
    '2026-01-01',
    '2026-01-02',
  ]);
});

it('rejects unsupported options, strings, malformed bounds, selectors and durations explicitly', () => {
  const invalidRules = [
    'FREQ=DAILY',
    null,
    new Map(),
    { freq: 'MONTHLY' },
    { freq: 'HOURLY' },
    { freq: 'DAILY', byDay: ['MO'] },
    { freq: 'DAILY', wkst: 'MO' },
    { freq: 'DAILY', byMonth: [1] },
    { freq: 'DAILY', maxIterations: 10 },
    { freq: 'DAILY', interval: 0 },
    { freq: 'DAILY', count: -1 },
    { freq: 'DAILY', count: 1.5 },
    { freq: 'WEEKLY', byDay: [] },
    { freq: 'WEEKLY', byDay: ['2FR'] },
    { freq: 'WEEKLY', byDay: ['mo'] },
    { freq: 'WEEKLY', wkst: 'XX' },
    { freq: 'DAILY', until: date('2026-01-02') },
    { freq: 'DAILY', start: zdt('2026-01-01T09:00') },
  ];
  for (const rrule of invalidRules) expect(() => expand(timed({ rrule: rrule as never }))).toThrowError(/\[calendar\/recurrence\]/);
  const invalid = [
    timed({ start: date('2026-01-01') as never }),
    timed({ start: zdt('2026-01-01T09:00').withCalendar('hebrew') }),
    timed({ duration: duration({ minutes: 0 }) }),
    timed({ duration: duration({ months: 1 }) }),
    timed({ duration: undefined }),
    allDay({ duration: duration({ hours: 1 }) }),
    timed({ exdate: [date('2026-01-02')] as never }),
    allDay({ rdate: [zdt('2026-01-02T09:00')] as never }),
    timed({ exrule: { freq: 'DAILY', start: date('2026-01-02') } as never }),
    allDay({ exrule: { freq: 'DAILY', until: zdt('2026-01-02T09:00') } as never }),
    timed({ exrule: 'FREQ=DAILY' as never }),
    timed({ exrule: { freq: 'MONTHLY' } as never }),
  ];
  for (const source of invalid) expect(() => expand(source)).toThrowError(/\[calendar\/recurrence\]/);
});

const views = createCalendarViews({
  list: listView({ days: 3 }),
  month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
  grid: timeGridView({ days: 3, allDay: true, groupBy: 'resource' }),
  timeline: timelineView({ days: 3, groupBy: 'resource' }),
});
const calendar = (
  events: Calendar_EventDefinition<{ title: string }, { recurrenceFeature: typeof recurrenceFeature }>[],
  feature: Calendar_Feature = recurrenceFeature,
  clock?: Calendar_Clock,
) =>
  createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features, recurrenceFeature: feature },
    view: 'list',
    date: date('2026-01-01'),
    events,
    onNavigate: () => {},
    clock: clock ?? fixedClock(Temporal.Instant.from('2026-01-01T00:00Z')),
    resources: [{ id: 'room', title: 'Room', data: null, availability: [] }],
  });

it('retains definitions in stores and resolves before normalization, filtering and event stages', () => {
  const source = timed();
  const store = createEventStore([source]);
  expect(store.store.state.events).toEqual([source]);
  const stage = vi.fn((events: Calendar_Event<unknown>[]) => events);
  const instance = createCalendar({
    ...calendar(store.store.state.events).options,
    features: { ...views.features, recurrenceFeature, stage: { events: { run: stage } } },
    eventOrder: (a, b) => a.start.toString().localeCompare(b.start.toString()),
  });
  expect(instance.store.state.layout.kind === 'list' && instance.store.state.layout.days.flatMap(day => day.events).length).toBe(3);
  expect(stage.mock.calls[0]?.[0].every(event => event.occurrence?.seriesId === source.id)).toBe(true);
  store.update(source.id, event => ({ ...event, data: { title: 'Changed' } }));
  instance['~update']({ ...instance.options, events: store.store.state.events, timeZone: 'UTC' });
  const layout = instance.store.state.layout;
  expect(layout.kind === 'list' && layout.days[0]?.events[0]?.start.toString()).toBe('2026-01-01T14:00:00+00:00[UTC]');
  expect(layout.kind === 'list' && layout.days[0]?.events[0]?.data.title).toBe('Changed');
});

it('feeds all layouts, resources and background splitting through the existing source hook', () => {
  const foreground = timed({ resourceIds: ['room'] });
  const background = allDay({ display: 'background', resourceIds: ['room'] });
  const oneOff = createEvent({ id: 'one', kind: 'allDay', start: date('2026-01-01'), data: { title: 'One' } });
  const instance = createCalendar({
    ...calendar([foreground, background]).options,
    features: { ...views.features, recurrenceFeature },
    events: [foreground, background, oneOff],
  });
  for (const view of ['list', 'month', 'grid', 'timeline'] as const) {
    instance['~update']({ ...instance.options, view });
    const layout = instance.store.state.layout;
    if (layout.kind === 'list') {
      expect(layout.days.flatMap(day => day.events).some(event => event.id === 'one')).toBe(true);
      expect(layout.days.flatMap(day => day.events).some(event => event.display === 'background')).toBe(false);
    } else if (layout.kind === 'dayGrid')
      expect(layout.sections.flatMap(section => section.rows.flatMap(row => row.backgroundEvents)).length).toBeGreaterThan(0);
    else if (layout.kind === 'timeGrid') {
      expect(layout.columns.some(column => column.segments.length > 0)).toBe(true);
      expect(layout.columns[0]?.backgroundEvents.length).toBeGreaterThan(0);
    } else if (layout.kind === 'timeline') expect(layout.rows.some(row => row.segments.length > 0)).toBe(true);
  }
});

it('memoizes queries across clock ticks and refreshes after range, zone and immutable definition changes', () => {
  let tick = () => {};
  let instant = Temporal.Instant.from('2026-01-01T00:00Z');
  const resolver = vi.fn(recurrenceFeature.resolveEvents);
  const clock: Calendar_Clock = {
    now: () => instant,
    subscribe: callback => {
      tick = callback;
      return () => {};
    },
  };
  const instance = calendar([timed()], { resolveEvents: resolver }, clock);
  const dispose = instance['~mount']();
  const before = instance.store.state.layout;
  const calls = resolver.mock.calls.length;
  instant = instant.add({ minutes: 1 });
  tick();
  expect(instance.store.state.now.epochNanoseconds).toBe(instant.epochNanoseconds);
  expect(resolver.mock.calls.length).toBe(calls);
  expect(instance.store.state.layout).toEqual(before);
  instance['~update']({ ...instance.options, date: date('2026-01-02') });
  expect(instance.store.state.layout).not.toBe(before);
  expect(resolver.mock.calls.length).toBe(calls + 1);
  instance['~update']({ ...instance.options, timeZone: 'UTC' });
  const converted = instance.store.state.layout;
  expect(converted.kind === 'list' && converted.days[0]?.events[0]?.start.toString()).toBe('2026-01-02T14:00:00+00:00[UTC]');
  expect(resolver.mock.calls.length).toBe(calls + 2);
  instance['~update']({ ...instance.options, events: [timed({ id: 'replacement' })] });
  const replaced = instance.store.state.layout;
  expect(replaced.kind === 'list' && replaced.days[0]?.events[0]?.occurrence?.seriesId).toBe('replacement');
  expect(resolver.mock.calls.length).toBe(calls + 3);
  dispose();
});

it('rejects definitions at runtime when the native feature is absent', () => {
  expect(() => createCalendar({ ...calendar([]).options, features: views.features, events: [timed()] as never }).store.state).toThrow(
    /no registered resolver/,
  );
});
