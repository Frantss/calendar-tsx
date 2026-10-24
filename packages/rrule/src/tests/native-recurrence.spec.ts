import {
  createCalendar,
  createCalendarViews,
  createEvent,
  createEventStore,
  createRecurringEvent,
  fixedClock,
  listView,
  recurrenceFeature,
  timeGridView,
  timelineView,
} from '@calendar-tsx/core';
import type {
  Calendar_Event,
  Calendar_RecurrenceOptions,
  Calendar_RecurringTimedEventInput,
  Calendar_RecurringAllDayEventInput,
  Calendar_RecurringEventInput,
  Calendar_RecurringEventDefinition,
} from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it } from 'vitest';

import { createRRuleEvent, rruleFeature } from '#rrule';
import type { Calendar_RRuleEventDefinition, Calendar_RRuleOptions } from '#rrule.types';

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
const parity = (source: Calendar_RecurringEventInput<{ title: string }>, start = '2026-01-01', end = '2026-12-31', timeZone = 'America/New_York') => {
  const context = { range: { start: date(start), end: date(end) }, timeZone };
  const advanced = source.kind === 'timed' ? createRRuleEvent(source) : createRRuleEvent(source);
  const snapshot = (events: Calendar_Event<unknown>[]) =>
    events.map(event => ({
      ...event,
      start: event.start.toString(),
      end: event.end?.toString(),
      occurrence: event.occurrence && { ...event.occurrence, originalStart: event.occurrence.originalStart.toString() },
    }));
  expect(snapshot(recurrenceFeature.resolveEvents(source, context))).toEqual(snapshot(rruleFeature.resolveEvents(advanced, context)));
};

it('accepts native rule and event definitions and retains each implementation in inferred stores', () => {
  expectTypeOf<Calendar_RecurrenceOptions>().toExtend<Calendar_RRuleOptions>();
  expectTypeOf<Calendar_RecurringEventDefinition<{ title: string }>>().toExtend<Calendar_RRuleEventDefinition<{ title: string }>>();
  const native = timed();
  const advanced = createRRuleEvent({ ...native, id: 'advanced' });
  const nativeStore = createEventStore([native]);
  const advancedStore = createEventStore([advanced]);
  const mixed = createEventStore([native, advanced]);
  expectTypeOf<(typeof nativeStore.store.state.events)[number]['~source']>().toEqualTypeOf<'recurrenceFeature' | undefined>();
  expectTypeOf<(typeof advancedStore.store.state.events)[number]['~source']>().toEqualTypeOf<'rruleFeature' | undefined>();
  expectTypeOf<(typeof mixed.store.state.events)[number]['~source']>().toEqualTypeOf<'recurrenceFeature' | 'rruleFeature' | undefined>();
});

it('matches partial first weeks, week starts, intervals and COUNT when seeking into a series', () => {
  for (const seed of ['2026-01-01', '2026-01-04', '2026-01-05'])
    for (const wkst of ['MO', 'SU', 'WE'] as const)
      for (const interval of [1, 2, 3])
        for (const count of [undefined, 1, 8])
          parity(
            allDay({ start: date(seed), rrule: { freq: 'WEEKLY', byDay: ['MO', 'WE', 'SU'], wkst, interval, count } }),
            '2026-01-13',
            '2026-02-04',
          );
});

it('matches starts, ends, exceptions, metadata and IDs for the shared daily/weekly subset', () => {
  const sources: Calendar_RecurringEventInput<{ title: string }>[] = [
    timed({ rrule: { freq: 'DAILY', interval: 2, count: 5, until: zdt('2026-01-05T09:00') } }),
    allDay({ start: date('2026-01-04'), rrule: { freq: 'WEEKLY', interval: 2, count: 4, byDay: ['SU', 'MO'] } }),
    allDay({ start: date('2026-01-04'), rrule: { freq: 'WEEKLY', interval: 2, count: 4, byDay: ['SU', 'MO'], wkst: 'SU' } }),
    allDay({ rrule: { freq: 'WEEKLY', byDay: ['WE', 'MO', 'MO'], count: 3 } }),
    timed({ start: zdt('2026-03-07T02:30') }),
    timed({ start: zdt('2026-10-31T01:30') }),
    timed({ start: zdt('2026-03-02T09:00'), rrule: { freq: 'WEEKLY', count: 3 } }),
    timed({ start: zdt('2026-11-01T01:30:00.123456789-05:00[America/New_York]') }),
    timed({ start: zdt('2026-03-07T09:00'), rrule: { freq: 'DAILY', until: zdt('2026-03-09T13:00[UTC]') } }),
    timed({ start: zdt('2026-03-07T09:00'), rrule: { freq: 'DAILY', until: zdt('2026-03-09T12:59:59.999999999[UTC]') } }),
    timed({
      rrule: { freq: 'DAILY', count: 4 },
      rdate: [zdt('2026-01-03T14:00[UTC]'), zdt('2026-01-07T09:00')],
      exdate: [zdt('2026-01-02T14:00[UTC]')],
      exrule: { freq: 'DAILY', interval: 3, count: 2 },
    }),
    allDay({
      start: date('2026-01-05'),
      rrule: { freq: 'WEEKLY', count: 4 },
      exrule: [
        { freq: 'WEEKLY', start: date('2026-01-19'), until: date('2026-01-26') },
        { freq: 'DAILY', count: 1 },
      ],
      rdate: [date('2026-01-19')],
    }),
    allDay({
      start: date('2026-01-05'),
      rrule: { freq: 'DAILY', count: 7 },
      exrule: { freq: 'DAILY', start: date('2026-01-01'), interval: 2, count: 4 },
    }),
    timed({
      start: zdt('2026-03-06T09:00'),
      rrule: { freq: 'DAILY', count: 5 },
      exrule: { freq: 'DAILY', start: zdt('2026-03-07T14:00[UTC]'), until: zdt('2026-03-09T14:00[UTC]') },
    }),
    timed({ exrule: { freq: 'DAILY', start: zdt('2026-01-03T09:00'), until: zdt('2026-01-02T09:00') } }),
    timed({ start: zdt('2026-03-07T09:00'), duration: duration({ days: 1 }), rrule: { freq: 'DAILY', count: 1 } }),
  ];
  for (const source of sources) parity(source);
  parity(allDay({ rrule: { freq: 'DAILY', count: 0 }, rdate: [date('2025-12-31'), date('2026-01-02')] }), '2025-12-01');
  parity(timed({ start: zdt('2026-03-07T23:30'), duration: duration({ hours: 4 }), rrule: { freq: 'DAILY', count: 2 } }), '2026-03-08', '2026-03-08');
  parity(allDay({ duration: duration({ days: 3 }), rrule: { freq: 'WEEKLY', count: 1 } }), '2026-01-03', '2026-01-03');
  parity(allDay({ duration: duration({ weeks: 1 }) }), '2026-01-06', '2026-01-07');
  parity(timed({ start: zdt('2011-12-29T09:00[Pacific/Apia]'), rrule: { freq: 'DAILY', count: 4 } }), '2011-12-29', '2012-01-02', 'Pacific/Apia');
  parity(allDay({ start: date('2000-01-05'), rrule: { freq: 'WEEKLY', byDay: ['MO', 'FR'], interval: 3, count: 1000 } }), '2026-01-01', '2026-02-01');
  parity(timed({ rrule: { freq: 'DAILY' } }), '2026-01-01', '2026-01-02', 'Asia/Tokyo');
});

it('resolves native, advanced and one-off definitions together and edits series through the same store', () => {
  const native = timed();
  const advanced = createRRuleEvent({
    id: 'advanced',
    kind: 'allDay',
    start: date('2026-01-01'),
    rrule: 'FREQ=MONTHLY;COUNT=1',
    data: { title: 'Advanced' },
  });
  const oneOff = createEvent({ id: 'one', kind: 'allDay', start: date('2026-01-01'), data: { title: 'One' } });
  const store = createEventStore([native, advanced, oneOff]);
  const views = createCalendarViews({ list: listView({ days: 3 }) });
  const instance = createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features, recurrenceFeature, rruleFeature },
    view: 'list',
    date: date('2026-01-01'),
    events: store.store.state.events,
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-01-01T00:00Z')),
  });
  const count = () => {
    const layout = instance.store.state.layout;
    return layout.kind === 'list' ? layout.days.flatMap(day => day.events).length : 0;
  };
  expect(count()).toBe(5);
  store.remove(advanced.id);
  instance['~update']({ ...instance.options, events: store.store.state.events });
  expect(count()).toBe(4);
  store.remove(native.id);
  instance['~update']({ ...instance.options, events: store.store.state.events });
  expect(count()).toBe(1);
});

it('resolves both implementations through overnight input coverage and refreshes when that coverage changes', () => {
  const native = timed({ id: 'native-night', start: zdt('2026-01-06T02:00'), rrule: { freq: 'DAILY', count: 1 } });
  const excluded = createRecurringEvent({ ...native, id: 'excluded', exrule: { freq: 'DAILY', count: 1 } });
  const events = [
    native,
    createRRuleEvent({ ...native, id: 'rrule-night' }),
    createRecurringEvent({ ...native, id: 'native-shade', display: 'background' }),
    createRRuleEvent({ ...native, id: 'rrule-shade', display: 'background' }),
    excluded,
    createRRuleEvent({ ...excluded, id: 'rrule-excluded' }),
  ];
  const night = { days: 1, hiddenDays: [2 as const], timeWindow: { startMinutes: 1320, endMinutes: 1800 } };
  const views = createCalendarViews({
    grid: timeGridView(night),
    timeline: timelineView(night),
    day: timeGridView({ days: 1 }),
  });
  const instance = createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features, recurrenceFeature, rruleFeature },
    view: 'grid',
    date: date('2026-01-05'),
    events,
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-01-05T00:00Z')),
  });
  for (const view of ['grid', 'timeline'] as const) {
    instance['~update']({ ...instance.options, view });
    const { context, layout } = instance.store.state;
    expect(context.range.end.toString()).toBe('2026-01-05');
    expect(context.inputRange.end.toString()).toBe('2026-01-06');
    if (layout.kind === 'timeGrid') {
      expect(layout.columns[0]?.segments).toHaveLength(2);
      expect(layout.columns[0]?.backgroundEvents).toHaveLength(2);
    } else if (layout.kind === 'timeline') {
      expect(layout.rows[0]?.segments).toHaveLength(2);
      expect(layout.rows[0]?.backgroundEvents).toHaveLength(2);
    }
    instance['~update']({ ...instance.options, view: 'day' });
    const day = instance.store.state.layout;
    expect(day.kind === 'timeGrid' && day.columns[0]?.segments.length).toBe(0);
    expect(day.kind === 'timeGrid' && day.columns[0]?.backgroundEvents.length).toBe(0);
  }
});
