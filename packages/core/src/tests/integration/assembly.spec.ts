import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';

import { createCalendar } from '#calendar/calendar';
import { calendarViews, dayGridView, listView, timeGridView } from '#views/views';
import { calendarFeatures } from '#features/calendar-features';
import { backgroundFeature } from '#features/background/background-feature';
import { createBackgroundLayer } from '#features/background/background-ranges';
import { recurrenceFeature } from '#features/recurrence/recurrence-feature';
import { createRecurringEvent } from '#features/recurrence/recurrence-events';
import type { Calendar_ConfiguredFeature, Calendar_FeatureContext } from '#features/feature.types';
import type { Calendar_DayGridLayout } from '#layouts/day-grid/day-grid.types';
import type { Calendar_TimeGridLayout } from '#layouts/time-grid/time-grid.types';
import type { Calendar_EventDefinition } from '#events/event.types';
import type { Calendar_Views } from '#views/view.types';

const date = Temporal.PlainDate.from('2026-10-26');
const holiday = createBackgroundLayer({ id: 'holiday', kind: 'holiday', ranges: [{ allDay: true, start: date }] });
const closed = createBackgroundLayer({ id: 'closed', kind: 'closed', ranges: [{ allDay: true, start: date }] });
const options = { date, timeZone: 'UTC', events: [], onNavigate: vi.fn() };

type ProbeConfig = { count: number; label: string; nested: { value: number; extra?: boolean } };
declare module '#features/feature-maps.types' {
  interface Calendar_State_FeatureMap {
    assemblyProbe: { assemblyCount: number };
  }
  interface Calendar_Api_FeatureMap {
    assemblyProbe: { incrementAssembly: () => void; readAssemblyConfig: () => ProbeConfig };
  }
}
const probeFeature = (config: ProbeConfig, initialize = vi.fn()) =>
  ({
    '~id': 'assemblyProbe',
    '~config': config,
    getInitialState: () => {
      initialize();
      return { assemblyCount: 0 };
    },
    constructApi: (context: Calendar_FeatureContext<ProbeConfig>) => ({
      incrementAssembly: () => context.setState<number>('assemblyCount', value => value + 1),
      readAssemblyConfig: () => context.config,
    }),
  }) satisfies Calendar_ConfiguredFeature<'assemblyProbe', ProbeConfig>;

it('inherits factory defaults and replaces per-view arrays without changing other views', () => {
  const features = calendarFeatures({ background: backgroundFeature([holiday]) });
  const views = calendarViews({
    features,
    views: {
      month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
      week: timeGridView({ days: 1, features: { background: [closed] } }),
      day: timeGridView({ days: 1, features: { background: [] } }),
    },
  });
  const calendar = createCalendar({ ...options, features, views, view: 'month' });
  const first = calendar.store.state.layout;
  if (first.kind !== 'dayGrid') throw new Error('expected day grid');
  expectTypeOf(first).toExtend<Calendar_DayGridLayout<unknown>>();
  expectTypeOf<(typeof first.sections)[number]['rows'][number]['days'][number]['backgrounds'][number]['kind']>().toEqualTypeOf<string>();
  expect(first.sections.flatMap(section => section.rows.flatMap(row => row.days)).find(day => day.date.equals(date))?.backgrounds[0]?.kind).toBe(
    'holiday',
  );
  for (const [view, expected] of [
    ['week', ['closed']],
    ['day', []],
  ] as const) {
    calendar['~update']({ ...calendar.options, view });
    const model = calendar.store.state.layout;
    if (model.kind !== 'timeGrid') throw new Error('expected time grid');
    expectTypeOf(model).toExtend<Calendar_TimeGridLayout<unknown, unknown>>();
    expect(model.columns[0].backgrounds.map(background => background.kind)).toEqual(expected);
  }
  expect(features.background['~config']).toEqual([holiday]);
});

it('resolves aliased recurrence sources and retains their input and payload types', () => {
  const features = calendarFeatures({ repeating: recurrenceFeature() });
  const views = calendarViews({ features, views: { agenda: listView({ days: 2 }) } });
  const event = createRecurringEvent({ id: 'daily', kind: 'allDay', start: date, rrule: { freq: 'DAILY', count: 2 }, data: { title: 'Daily' } });
  expectTypeOf(event).toExtend<Calendar_EventDefinition<{ title: string }, typeof features>>();
  expectTypeOf(event).not.toExtend<Calendar_EventDefinition<{ title: string }, {}>>();
  const calendar = createCalendar({ ...options, features, views, view: 'agenda', events: [event] });
  expect(calendar.store.state.layout.days.map(day => day.events[0]?.data.title)).toEqual(['Daily', 'Daily']);
});

it('shallow-merges object overrides and initializes state once per calendar', () => {
  const initialize = vi.fn();
  const defaults: ProbeConfig = { count: 1, label: 'default', nested: { value: 1, extra: true } };
  const features = calendarFeatures({ probe: probeFeature(defaults, initialize) });
  const views = calendarViews({
    features,
    views: {
      inherited: listView({ days: 1 }),
      changed: listView({ days: 1, features: { probe: { label: 'view', nested: { value: 2 } } } }),
    },
  });
  expect(initialize).not.toHaveBeenCalled();
  const first = createCalendar({ ...options, features, views, view: 'changed' });
  const second = createCalendar({ ...options, features, views, view: 'inherited' });
  expect(initialize).toHaveBeenCalledTimes(2);
  expect(first.api.readAssemblyConfig()).toEqual({ count: 1, label: 'view', nested: { value: 2 } });
  expect(second.api.readAssemblyConfig()).toBe(defaults);
  expect(first.api.readAssemblyConfig()).toBe(first.api.readAssemblyConfig());
  first.api.incrementAssembly();
  expectTypeOf(first.store.state.assemblyCount).toEqualTypeOf<number>();
  expect(first.store.state.assemblyCount).toBe(1);
  expect(second.store.state.assemblyCount).toBe(0);
  expect(defaults.nested.extra).toBe(true);
});

it('tracks replacement view definitions and resolves their overrides', () => {
  const features = calendarFeatures({ background: backgroundFeature([holiday]) });
  const makeViews = (layers: (typeof holiday)[]) =>
    calendarViews({ features, views: { day: timeGridView({ days: 1, features: { background: layers } }) } });
  const calendar = createCalendar({ ...options, features, views: makeViews([]), view: 'day' });
  expect(calendar.store.state.layout.columns[0].backgrounds).toEqual([]);
  calendar['~update']({ ...calendar.options, views: makeViews([holiday]) });
  expect(calendar.store.state.layout.columns[0].backgrounds[0]?.kind).toBe('holiday');
});

it('rejects duplicate feature identities and unconfigured registrations', () => {
  expect(() => calendarFeatures({ first: recurrenceFeature(), second: recurrenceFeature() })).toThrow(/registered more than once/);
  // @ts-expect-error a factory must be called before registration
  expect(() => calendarFeatures({ recurrence: recurrenceFeature })).toThrow(/configured factory result/);
});

it('rejects unknown, invalid and unsupported view overrides', () => {
  const features = calendarFeatures({ background: backgroundFeature([]), recurrence: recurrenceFeature() });
  expect(() =>
    calendarViews({
      features,
      views: {
        // @ts-expect-error override keys come from the registry
        day: timeGridView({ days: 1, features: { missing: [] } }),
      },
    }),
  ).toThrow(/unknown feature override/);
  expect(() =>
    calendarViews({
      features,
      views: {
        // @ts-expect-error background configuration is an array
        day: timeGridView({ days: 1, features: { background: 123 } }),
      },
    }),
  ).toThrow(/array of layers/);
  expect(() =>
    calendarViews({
      features,
      views: {
        // @ts-expect-error recurrenceFeature takes no configuration
        day: timeGridView({ days: 1, features: { recurrence: {} } }),
      },
    }),
  ).toThrow(/does not accept configuration/);
});

it('rejects calendars whose registry does not satisfy their bound views', () => {
  const features = calendarFeatures({ background: backgroundFeature([]) });
  const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
  // @ts-expect-error the view requires the background registration
  expect(() => createCalendar({ ...options, features: {}, views, view: 'day' })).toThrow(/requires registered feature/);
  // @ts-expect-error a different feature identity cannot replace background
  expect(() => createCalendar({ ...options, features: { background: recurrenceFeature() }, views, view: 'day' })).toThrow(
    /requires registered feature/,
  );
});

it('checks overrides from wide JavaScript-style view maps at calendar creation', () => {
  const features = calendarFeatures({ background: backgroundFeature([]) });
  const definition = { ...timeGridView({ days: 1 }), features: { unknown: [] } };
  const views: Calendar_Views = { day: definition };
  expect(() => createCalendar({ ...options, features, views, view: 'day' })).toThrow(/unknown feature override/);
});

it('keeps feature definitions fixed while accepting new registry objects containing the same definitions', () => {
  const features = calendarFeatures({ background: backgroundFeature([]) });
  const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
  const calendar = createCalendar({ ...options, features, views, view: 'day' });
  calendar['~update']({ ...calendar.options, features: { ...features } });
  expect(() => calendar['~update']({ ...calendar.options, features: calendarFeatures({ background: backgroundFeature([holiday]) }) })).toThrow(
    /cannot change/,
  );
});

it('rejects unknown object-option keys and unregistered navigation targets in types', () => {
  const features = calendarFeatures({ probe: probeFeature({ count: 1, label: 'default', nested: { value: 1 } }) });
  calendarViews({
    features,
    views: {
      // @ts-expect-error object overrides reject misspelled configuration fields
      day: listView({ days: 1, features: { probe: { lable: 'misspelled' } } }),
    },
  });
  const views = calendarViews({ features, views: { day: listView({ days: 1 }) } });
  const invalidNavigation = () =>
    // @ts-expect-error view keys come only from the bound view map
    createCalendar({ ...options, features, views, view: 'missing' });
  expectTypeOf(invalidNavigation).toBeFunction();
});

it('leaves options and state unchanged when a replacement view has invalid configuration', () => {
  const features = calendarFeatures({ background: backgroundFeature([holiday]) });
  const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
  const calendar = createCalendar({ ...options, features, views, view: 'day' });
  const before = calendar.store.state;
  expect(() => calendar['~update']({ ...calendar.options, views: { ...views, day: { ...views.day, features: { background: 'invalid' } } } })).toThrow(
    /array of layers/,
  );
  expect(calendar.options.views).toBe(views);
  expect(calendar.store.state).toBe(before);
});

it('rebinds existing view settings to a new registry without retaining previous definitions', () => {
  const previousFeatures = calendarFeatures({ plugin: backgroundFeature([holiday]) });
  const previousViews = calendarViews({ features: previousFeatures, views: { day: listView({ days: 1 }) } });
  const previous = createCalendar({ ...options, features: previousFeatures, views: previousViews, view: 'day' });
  const features = calendarFeatures({ plugin: recurrenceFeature() });
  const views = calendarViews({ features, views: previousViews });
  expect(views.day['~features'].plugin['~id']).toBe('recurrenceFeature');
  const event = createRecurringEvent({ id: 'once', kind: 'allDay', start: date, rrule: { freq: 'DAILY', count: 1 }, data: null });
  const calendar = createCalendar({ ...previous.options, features, views, events: [event] });
  expect(calendar.store.state.layout.days[0].events[0]?.id).toMatch(/^rrule:/);
});
