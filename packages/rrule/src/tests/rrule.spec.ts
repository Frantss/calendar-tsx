import {
  createCalendar,
  createCalendarViews,
  createEvent,
  createEventStore,
  fixedClock,
  listView,
  monthView,
  timeGridView,
  timelineView,
} from '@calendar-tsx/core';
import type { Calendar_Event, Calendar_EventDefinition, Calendar_Feature, Calendar_Range, Calendar_Clock } from '@calendar-tsx/core';
import { RRuleTemporal } from 'rrule-temporal';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';

import { createRRuleEvent, rruleFeature } from '#rrule';
import type { Calendar_RRuleTimedEventInput, Calendar_RRuleAllDayEventInput, Calendar_RRuleExclusion } from '#rrule.types';

const zdt = (value: string) => Temporal.ZonedDateTime.from(value.includes('[') ? value : `${value}[America/New_York]`);
const date = (value: string) => Temporal.PlainDate.from(value);
const now = Temporal.Instant.from('2026-01-01T00:00Z');
const duration = (value: Parameters<typeof Temporal.Duration.from>[0]) => Temporal.Duration.from(value);
const timed = (overrides: Partial<Omit<Calendar_RRuleTimedEventInput<{ title: string }>, '~source'>> = {}) =>
  createRRuleEvent({
    id: 'series',
    kind: 'timed',
    start: zdt('2026-01-01T09:00'),
    duration: duration({ minutes: 30 }),
    rrule: 'FREQ=DAILY;COUNT=3',
    data: { title: 'Review' },
    ...overrides,
  });
const allDay = (overrides: Partial<Omit<Calendar_RRuleAllDayEventInput<{ title: string }>, '~source'>> = {}) =>
  createRRuleEvent({
    id: 'all',
    kind: 'allDay',
    start: date('2026-01-01'),
    rrule: 'FREQ=DAILY;COUNT=3',
    data: { title: 'Holiday' },
    ...overrides,
  });
const range = (start: string, end = start): Calendar_Range => ({ start: date(start), end: date(end) });
const expand = (
  source: ReturnType<typeof timed> | ReturnType<typeof allDay>,
  start = '2026-01-01',
  end = '2026-12-31',
  timeZone = 'America/New_York',
) => rruleFeature.resolveEvents(source, { range: range(start, end), timeZone });
const starts = (events: Calendar_Event<unknown>[]) => events.map(event => event.start.toString());
const dates = (events: Calendar_Event<unknown>[]) =>
  events.map(event => (event.kind === 'timed' ? event.start.toPlainDate().toString() : event.start.toString()));

it('accepts strings and native selector options, including last weekdays and ordinal weekdays', () => {
  const string = timed({ rrule: 'FREQ=MONTHLY;COUNT=3;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1' });
  const object = timed({ rrule: { freq: 'MONTHLY', count: 3, byDay: ['MO', 'TU', 'WE', 'TH', 'FR'], bySetPos: [-1] } });
  expect(dates(expand(string))).toEqual(['2026-01-30', '2026-02-27', '2026-03-31']);
  expect(starts(expand(object))).toEqual(starts(expand(string)));
  expect(dates(expand(timed({ rrule: { freq: 'MONTHLY', count: 2, byDay: ['2FR'] } })))).toEqual(['2026-01-09', '2026-02-13']);
  expect(dates(expand(timed({ start: zdt('2024-02-29T09:00'), rrule: 'FREQ=YEARLY;COUNT=2' }), '2024-01-01', '2030-12-31'))).toEqual([
    '2024-02-29',
    '2028-02-29',
  ]);
});

it('applies COUNT before EXDATE and EXRULE and merges/deduplicates RDATE', () => {
  const source = timed({
    rrule: 'FREQ=DAILY;COUNT=4',
    exdate: [zdt('2026-01-02T14:00[UTC]')],
    exrule: { freq: 'DAILY', interval: 3, count: 2 },
    rdate: [zdt('2026-01-03T09:00'), zdt('2026-01-07T09:00')],
  });
  expect(dates(expand(source))).toEqual(['2026-01-03', '2026-01-07']);
  expect(dates(expand(timed({ rrule: 'FREQ=DAILY;COUNT=0' })))).toEqual([]);
});

it('parses multiline recurrence sets with floating, TZID and UTC exception dates', () => {
  const source = timed({
    rrule:
      'DTSTART;TZID=America/New_York:20260101T090000\nRRULE:BYDAY=MO,TU,WE,TH,FR;FREQ=DAILY;COUNT=4\nEXDATE:20260102T140000Z\nRDATE;TZID=America/New_York:20260110T090000\nEXRULE:FREQ=WEEKLY;BYDAY=MO',
  });
  expect(dates(expand(source))).toEqual(['2026-01-01', '2026-01-06', '2026-01-10']);
  expect(
    dates(expand(allDay({ rrule: 'DTSTART;VALUE=DATE:20260101\nRRULE:FREQ=DAILY;COUNT=2\nRDATE;VALUE=DATE:20260105\nEXDATE;VALUE=DATE:20260102' }))),
  ).toEqual(['2026-01-01', '2026-01-05']);
});

it('honors local UNTIL and exact UTC UNTIL across DST, including typed Temporal bounds', () => {
  const source = timed({ start: zdt('2026-03-07T09:00'), rrule: 'FREQ=DAILY;UNTIL=20260309T125959Z' });
  expect(dates(expand(source))).toEqual(['2026-03-07', '2026-03-08']);
  expect(dates(expand(timed({ start: source.start, rrule: 'FREQ=DAILY;UNTIL=20260309T130000Z' })))).toEqual([
    '2026-03-07',
    '2026-03-08',
    '2026-03-09',
  ]);
  expect(dates(expand(timed({ start: source.start, rrule: { freq: 'DAILY', until: zdt('2026-03-09T09:00') } })))).toEqual([
    '2026-03-07',
    '2026-03-08',
    '2026-03-09',
  ]);
  expect(dates(expand(timed({ rrule: 'FREQ=DAILY;UNTIL=20260102T090000' })))).toEqual(['2026-01-01', '2026-01-02']);
  expect(dates(expand(allDay({ rrule: { freq: 'DAILY', until: date('2026-01-02') } })))).toEqual(['2026-01-01', '2026-01-02']);
});

it('keeps weekly wall times across DST and uses compatible gap/fold resolution without changing COUNT', () => {
  expect(starts(expand(timed({ start: zdt('2026-03-02T09:00'), rrule: 'FREQ=WEEKLY;COUNT=3' })))).toEqual([
    '2026-03-02T09:00:00-05:00[America/New_York]',
    '2026-03-09T09:00:00-04:00[America/New_York]',
    '2026-03-16T09:00:00-04:00[America/New_York]',
  ]);
  expect(starts(expand(timed({ start: zdt('2026-03-07T02:30'), rrule: 'FREQ=DAILY;COUNT=3' })))).toEqual([
    '2026-03-07T02:30:00-05:00[America/New_York]',
    '2026-03-08T03:30:00-04:00[America/New_York]',
    '2026-03-09T02:30:00-04:00[America/New_York]',
  ]);
  const folded = expand(timed({ start: zdt('2026-10-31T01:30'), rrule: 'FREQ=DAILY;COUNT=3' }));
  expect(folded[1]?.start.toString()).toBe('2026-11-01T01:30:00-04:00[America/New_York]');
});

it('retains an explicitly offset seed and Temporal nanoseconds, even for hourly rules', () => {
  const seed = zdt('2026-11-01T01:30:00.123456789-05:00[America/New_York]');
  const events = expand(timed({ start: seed, rrule: 'FREQ=HOURLY;COUNT=2' }));
  expect(events[0]?.start.equals(seed)).toBe(true);
  expect(events[1]?.start.toString()).toBe('2026-11-01T02:30:00.123456789-05:00[America/New_York]');
});

it('uses elapsed duration and includes prior starts overlapping the view, with exclusive timed ends', () => {
  const events = expand(
    timed({ start: zdt('2026-03-07T23:30'), duration: duration({ hours: 4 }), rrule: 'FREQ=DAILY;COUNT=2' }),
    '2026-03-08',
    '2026-03-08',
  );
  expect(dates(events)).toEqual(['2026-03-07', '2026-03-08']);
  expect(events[0]?.end?.toString()).toBe('2026-03-08T04:30:00-04:00[America/New_York]');
  expect(expand(timed({ start: zdt('2026-01-01T23:00'), duration: duration({ hours: 1 }), rrule: 'FREQ=DAILY;COUNT=1' }), '2026-01-02')).toEqual([]);
  const day = expand(timed({ start: zdt('2026-03-07T09:00'), duration: duration({ days: 1 }), rrule: 'FREQ=DAILY;COUNT=1' }))[0];
  expect(day?.end?.toString()).toBe('2026-03-08T10:00:00-04:00[America/New_York]');
});

it('uses inclusive all-day ends and includes multi-day starts before the view', () => {
  const events = expand(allDay({ duration: duration({ days: 3 }), rrule: 'FREQ=WEEKLY;COUNT=1' }), '2026-01-03');
  expect(starts(events)).toEqual(['2026-01-01']);
  expect(events[0]?.end?.toString()).toBe('2026-01-03');
  expect(expand(allDay({ rrule: 'FREQ=DAILY;COUNT=1' }), '2026-01-02')).toEqual([]);
});

it('keeps stable IDs across overlapping ranges, display zones, navigation and cache eviction', () => {
  const source = timed({ rrule: 'FREQ=DAILY' });
  const initial = expand(source, '2026-01-01', '2026-01-02');
  const other = expand(source, '2026-01-02', '2026-01-03', 'Asia/Tokyo');
  expect(initial[1]?.id).toBe(other[0]?.id);
  expect(initial[1]?.occurrence?.seriesId).toBe(source.id);
  expect(initial[1]?.occurrence?.originalStart.equals(zdt('2026-01-02T09:00'))).toBe(true);
  for (let day = 3; day < 10; day++) expand(source, `2026-01-0${day}`, `2026-01-0${day}`);
  expect(expand(source, '2026-01-01', '2026-01-02')[1]?.id).toBe(initial[1]?.id);
});

it('queries older finite and infinite rules without storing their historical occurrences', () => {
  const recent = expand(timed({ start: zdt('2000-01-01T09:00'), rrule: 'FREQ=DAILY' }), '2026-01-02', '2026-01-02');
  expect(dates(recent)).toEqual(['2026-01-02']);
  expect(expand(timed({ start: zdt('2000-01-01T09:00'), rrule: 'FREQ=DAILY;COUNT=10' }), '2026-01-02')).toEqual([]);
  expect(expand(timed({ start: zdt('2025-12-01T09:00'), rrule: 'FREQ=MINUTELY' }), '2026-01-02', '2026-01-02').length).toBe(1469);
});

it('rejects conflicting seeds, raw instances, malformed selectors and mismatched durations/dates', () => {
  const invalid = [
    timed({ rrule: 'DTSTART:20260102T090000\nRRULE:FREQ=DAILY' }),
    timed({ start: zdt('2026-03-08T03:30'), rrule: 'DTSTART:20260308T023000\nRRULE:FREQ=DAILY' }),
    timed({ rrule: 'DTSTART;TZID=Europe/Paris:20260101T090000\nRRULE:FREQ=DAILY' }),
    timed({ rrule: new RRuleTemporal({ freq: 'DAILY', dtstart: zdt('2026-01-01T09:00') }) as never }),
    timed({ rrule: { freq: 'DAILY', interval: -1 } }),
    timed({ rrule: 'FREQ=DAILY;BYHOUR=24' }),
    timed({ rrule: 'FREQ=DAILY;BYDAY=XX' }),
    timed({ rrule: 'FREQ=DAILY;BYDAY=' }),
    timed({ rrule: { freq: 'DAILY', byweekday: [0] } as never }),
    timed({ rrule: { freq: 'DAILY', byDay: ['99MO'] } }),
    timed({ rrule: { freq: 'DAILY', byHour: [24] } }),
    timed({ duration: duration({ minutes: 0 }) }),
    timed({ duration: duration({ months: 1 }) }),
    allDay({ duration: duration({ hours: 12 }) }),
    allDay({ rrule: 'FREQ=HOURLY' }),
    timed({ exdate: [date('2026-01-02')] as never }),
    timed({ rrule: { freq: 'DAILY', until: new Date() } as never }),
  ];
  for (const source of invalid) expect(() => expand(source)).toThrow();
});

const views = createCalendarViews({
  list: listView({ days: 3 }),
  grid: timeGridView({ days: 3, allDay: true, groupBy: 'resource' }),
  month: monthView({ maxEventsPerDay: 4 }),
  timeline: timelineView({ days: 3, groupBy: 'resource' }),
});
const calendar = (events: Calendar_EventDefinition<{ title: string }>[], feature: Calendar_Feature = rruleFeature, clock?: Calendar_Clock) =>
  createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features, rruleFeature: feature },
    view: 'list',
    date: date('2026-01-01'),
    events,
    onNavigate: () => {},
    clock: clock ?? fixedClock(now),
    resources: [{ id: 'room', title: 'Room', data: null, availability: [] }],
  });

it('resolves before normalization, filtering, ordering and feature events; input stores keep definitions', () => {
  const series = timed();
  const store = createEventStore([series]);
  expectTypeOf(store.store.state.events[0]!.data).toEqualTypeOf<{ title: string }>();
  expectTypeOf(series).toExtend<Calendar_EventDefinition<{ title: string }, { rruleFeature: typeof rruleFeature }>>();
  expectTypeOf(series).not.toExtend<Calendar_EventDefinition<{ title: string }, {}>>();
  const instance = calendar(store.store.state.events);
  const state = instance.store.state;
  expect(state.layout.kind === 'list' && state.layout.days.flatMap(day => day.events).length).toBe(3);
  expect(store.store.state.events).toEqual([series]);
  expectTypeOf(state.layout.kind === 'list' ? state.layout.days[0]?.events[0]?.data : undefined).toEqualTypeOf<{ title: string } | undefined>();
  store.update(series.id, event => ({ ...event, data: { title: 'Changed' } }));
  instance['~update']({ ...instance.options, events: store.store.state.events, timeZone: 'UTC' });
  const layout = instance.store.state.layout;
  expect(layout.kind === 'list' && layout.days[0]?.events[0]?.start.toString()).toBe('2026-01-01T14:00:00+00:00[UTC]');
  expect(layout.kind === 'list' && layout.days[0]?.events[0]?.data.title).toBe('Changed');
});

it('memoizes resolution across clock ticks, while range, zone and definition changes resolve again', () => {
  let tick = () => {};
  let instant = now;
  const resolver = vi.fn(rruleFeature.resolveEvents);
  const clock: Calendar_Clock = {
    now: () => instant,
    subscribe: listener => {
      tick = listener;
      return () => {};
    },
  };
  const instance = calendar([timed()], { resolveEvents: resolver }, clock);
  const dispose = instance['~mount']();
  expect(instance.store.state.layout.kind).toBe('list');
  const count = resolver.mock.calls.length;
  instant = instant.add({ minutes: 1 });
  tick();
  expect(instance.store.state.now.epochNanoseconds).toBe(instant.epochNanoseconds);
  expect(resolver).toHaveBeenCalledTimes(count);
  instance['~update']({ ...instance.options, date: date('2026-01-02') });
  expect(instance.store.state.context.range.start.toString()).toBe('2026-01-02');
  expect(resolver).toHaveBeenCalledTimes(count + 1);
  instance['~update']({ ...instance.options, timeZone: 'UTC' });
  expect(instance.store.state.layout.kind).toBe('list');
  expect(resolver).toHaveBeenCalledTimes(count + 2);
  instance['~update']({ ...instance.options, events: [timed({ id: 'new' })] });
  expect(instance.store.state.layout.kind).toBe('list');
  expect(resolver).toHaveBeenCalledTimes(count + 3);
  dispose();
});

it('renders foreground and background occurrences through all layouts with resource IDs', () => {
  const ordinary = createEvent({ id: 'one-off', kind: 'allDay', start: date('2026-01-01'), data: { title: 'One-off' } });
  const instance = calendar([
    ordinary,
    timed({ resourceIds: ['room'] }),
    timed({ id: 'shade', display: 'background', resourceIds: ['room'] }),
    allDay({ id: 'holiday', display: 'background', resourceIds: ['room'] }),
  ]);
  let layout = instance.store.state.layout;
  expect(layout.kind === 'list' && layout.days.flatMap(day => day.events).length).toBe(4);
  instance['~update']({ ...instance.options, view: 'grid' });
  layout = instance.store.state.layout;
  expect(layout.kind === 'timeGrid' && layout.columns.every(column => column.backgroundEvents.length === 2 && column.segments.length === 1)).toBe(
    true,
  );
  instance['~update']({ ...instance.options, view: 'month' });
  layout = instance.store.state.layout;
  expect(layout.kind === 'month' && layout.weeks.flatMap(week => week.backgroundEvents).length).toBeGreaterThan(0);
  instance['~update']({ ...instance.options, view: 'timeline' });
  layout = instance.store.state.layout;
  expect(layout.kind === 'timeline' && layout.rows[0]?.segments.length).toBe(3);
});

it('fails explicitly when a recurring definition has no registered resolver', () => {
  expect(() => calendar([timed()], {}).store.state).toThrow('has no registered resolver');
});

it('passes only sorted visible foreground occurrences to later feature stages', () => {
  const source = timed({ rrule: 'FREQ=DAILY;COUNT=4' });
  const spy = vi.fn((events: Calendar_Event<unknown>[]) => events);
  const base = calendar([source, timed({ id: 'background', display: 'background' })]);
  const instance = createCalendar({
    ...base.options,
    features: { ...base.options.features, inspectFeature: { events: { run: spy } } },
    eventOrder: (a, b) => b.id.localeCompare(a.id),
  });
  expect(instance.store.state.layout.kind).toBe('list');
  const events = spy.mock.calls[0]?.[0] ?? [];
  expect(events).toHaveLength(3);
  expect(events.every(event => event.occurrence?.seriesId === source.id && event.display !== 'background')).toBe(true);
  expect(events.map(event => event.id)).toEqual(events.map(event => event.id).toSorted((a, b) => b.localeCompare(a)));
});

it('supports RFC property order, folded lines and case-insensitive rules', () => {
  const source = timed({ rrule: 'dtstart;TZID=America/New_York:20260101T090000\nrrule:byday=th,fr;\n freq=weekly;count=2' });
  expect(dates(expand(source))).toEqual(['2026-01-01', '2026-01-02']);
});

it('does not round subsecond candidates into an inclusive UNTIL', () => {
  const source = timed({ start: zdt('2026-01-01T09:00:00.000000001'), rrule: 'FREQ=DAILY;UNTIL=20260102T090000' });
  expect(dates(expand(source))).toEqual(['2026-01-01']);
});

it('returns an empty set for unreachable subdaily interval selectors', () => {
  const source = timed({ rrule: { freq: 'HOURLY', interval: 24, byHour: [10] } });
  expect(expand(source, '2026-01-01', '2026-01-03')).toEqual([]);
  expect(expand(timed({ rrule: 'FREQ=HOURLY;INTERVAL=24;BYHOUR=10' }), '2026-01-01', '2026-01-03')).toEqual([]);
});

it('propagates work-budget exhaustion instead of returning a partial recurrence set', () => {
  const source = timed({ rrule: { freq: 'MONTHLY', count: 10, byDay: ['2FR'], maxIterations: 1 } });
  expect(() => expand(source)).toThrow(/Maximum iterations/);
});

it('bounds all-day exclusions independently and keeps the parent seed when start is omitted', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'WEEKLY', count: 4 },
    exrule: { freq: 'WEEKLY', start: date('2026-01-19'), until: date('2026-01-26') },
  });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-01-12']);
  expect(dates(expand(allDay({ ...source, exrule: { freq: 'WEEKLY', until: date('2026-01-26') } })))).toEqual([]);
});

it('counts and aligns exclusions from their own seed, including candidates before the parent', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'WEEKLY', count: 6 },
    exrule: { freq: 'WEEKLY', interval: 2, start: date('2026-01-12'), count: 2 },
  });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-09']);
  expect(dates(expand(source, '2026-01-19', '2026-02-09'))).toEqual(['2026-01-19', '2026-02-02', '2026-02-09']);
  expect(
    dates(expand(allDay({ ...source, rrule: { freq: 'WEEKLY', count: 4 }, exrule: { freq: 'WEEKLY', start: date('2025-12-29'), count: 2 } }))),
  ).toEqual(['2026-01-12', '2026-01-19', '2026-01-26']);
});

it('unions independently seeded exclusions and applies them to RDATE without replenishing parent COUNT', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'WEEKLY', count: 4 },
    rdate: [date('2026-01-19'), date('2026-02-02')],
    exrule: [
      { freq: 'WEEKLY', start: date('2026-01-19'), count: 2 },
      { freq: 'WEEKLY', start: date('2026-01-12'), until: date('2026-01-12') },
    ],
  });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-02-02']);
});

it('keeps a timed exclusion in its own zone across DST and display-zone changes', () => {
  const source = timed({
    start: zdt('2026-03-02T09:00'),
    rrule: { freq: 'WEEKLY', count: 4 },
    exrule: { freq: 'WEEKLY', start: zdt('2026-03-02T14:00[UTC]'), until: zdt('2026-03-16T14:00[UTC]') },
  });
  const expected = ['2026-03-09', '2026-03-16', '2026-03-23'];
  expect(dates(expand(source))).toEqual(expected);
  expect(dates(expand(source, '2026-03-01', '2026-03-31', 'Asia/Tokyo'))).toEqual(expected);
});

it('checks an independent timed UNTIL inclusively at nanosecond precision', () => {
  const start = zdt('2026-01-19T09:00:00.123456789');
  const until = start.add({ weeks: 1 });
  const source = timed({
    start: zdt('2026-01-05T09:00:00.123456789'),
    rrule: { freq: 'WEEKLY', count: 4 },
    exrule: { freq: 'WEEKLY', start, until },
  });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-01-12']);
  expect(dates(expand(timed({ ...source, exrule: { freq: 'WEEKLY', start, until: until.subtract({ nanoseconds: 1 }) } })))).toEqual([
    '2026-01-05',
    '2026-01-12',
    '2026-01-26',
  ]);
});

it('excludes overlapping prior starts using bounds in the exclusion zone', () => {
  const start = zdt('2026-01-19T08:30[Asia/Tokyo]');
  const source = timed({
    start: zdt('2026-01-18T23:30[UTC]'),
    duration: duration({ hours: 2 }),
    rrule: { freq: 'WEEKLY', count: 2 },
    exrule: { freq: 'WEEKLY', start, until: start },
  });
  expect(expand(source, '2026-01-19', '2026-01-19', 'UTC')).toEqual([]);
  expect(dates(expand(source, '2026-01-26', '2026-01-26', 'UTC'))).toEqual(['2026-01-25']);
});

it('retains compatible gap resolution and exclusion COUNT with an independent seed', () => {
  const source = timed({
    start: zdt('2026-03-06T02:30'),
    rrule: { freq: 'DAILY', count: 5 },
    exrule: { freq: 'DAILY', start: zdt('2026-03-07T02:30'), count: 2 },
  });
  expect(dates(expand(source))).toEqual(['2026-03-06', '2026-03-09', '2026-03-10']);
  expect(expand(source, '2026-03-08', '2026-03-08')).toEqual([]);
});

it('returns no exclusions when their independent start is after UNTIL', () => {
  const source = allDay({
    start: date('2026-01-05'),
    rrule: { freq: 'WEEKLY', count: 2 },
    exrule: { freq: 'WEEKLY', start: date('2026-01-19'), until: date('2026-01-12') },
  });
  expect(dates(expand(source))).toEqual(['2026-01-05', '2026-01-12']);
});

it('requires exclusion starts and bounds to match the parent date kind and ISO calendar', () => {
  const invalid = [
    timed({ exrule: { freq: 'DAILY', start: date('2026-01-02') } as never }),
    allDay({ exrule: { freq: 'DAILY', start: zdt('2026-01-02T09:00') } as never }),
    timed({ exrule: { freq: 'DAILY', start: zdt('2026-01-02T09:00').withCalendar('gregory') } }),
    allDay({ exrule: { freq: 'DAILY', start: date('2026-01-02'), until: zdt('2026-01-03T09:00') } as never }),
    timed({ exrule: { freq: 'DAILY', start: null } as never }),
  ];
  for (const source of invalid) expect(() => expand(source)).toThrow();
  expectTypeOf<{ freq: 'WEEKLY'; start: Temporal.PlainDate; until: Temporal.PlainDate }>().toExtend<Calendar_RRuleExclusion<Temporal.PlainDate>>();
  expectTypeOf<{ freq: 'WEEKLY'; start: Temporal.ZonedDateTime }>().not.toExtend<Calendar_RRuleExclusion<Temporal.PlainDate>>();
});

it('preserves an exclusion seed choosing the later fold without excluding the earlier instant', () => {
  const later = zdt('2026-11-01T01:30-05:00[America/New_York]');
  const source = timed({
    start: zdt('2026-10-31T01:30'),
    rrule: { freq: 'DAILY', count: 3 },
    rdate: [later],
    exrule: { freq: 'DAILY', start: later, count: 1 },
  });
  expect(starts(expand(source))).toEqual([
    '2026-10-31T01:30:00-04:00[America/New_York]',
    '2026-11-01T01:30:00-04:00[America/New_York]',
    '2026-11-02T01:30:00-05:00[America/New_York]',
  ]);
});
