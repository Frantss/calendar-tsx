import { listLayout } from '#layouts/layout-features';
import type { Calendar_Resource } from '#calendar/calendar.types';
import { calendarFeatures } from '#features/calendar-features';
import type { Store } from '@tanstack/store';
import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';

import { createCalendar } from '#calendar/calendar';
import { fixedClock } from '#calendar/clock';
import { listView, dayGridView, timeGridView, calendarViews } from '#views/views';
import type { Calendar_Event, Calendar_EventInput } from '#events/event.types';
import type { Calendar_TimeGridLayout } from '#layouts/time-grid/time-grid.types';
import type { Calendar_ListLayout } from '#layouts/list/list.types';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { fixtures_timeZone, fixtures_timed } from '#tests/support/calendar.fixtures';

type Highlight_Settings = { only?: boolean };

declare module '#features/feature-maps.types' {
  interface Calendar_State_FeatureMap {
    highlightFeature: { highlighted: string | null };
  }
  interface Calendar_Api_FeatureMap {
    highlightFeature: { highlight: (id: string | null) => void };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    lookupFeature: {
      lookup: {
        event: (id: string) => Calendar_EventInput<TData> | undefined;
        resource: (id: string) => Calendar_Resource<TResourceData> | undefined;
      };
    };
  }
  interface Calendar_TimeGridSegment_FeatureMap {
    highlightFeature: { isHighlighted: boolean };
  }
  interface Calendar_ListDay_FeatureMap {
    highlightFeature: { hasHighlighted: boolean };
  }
}

/** A test feature: a state slice, an action, an option callback, an events stage and model fields. */
const highlightFeature = {
  '~id': 'highlightFeature' as const,
  '~config': {} as Highlight_Settings & { onHighlightChange?: (id: string | null) => void },
  getInitialState: () => ({ highlighted: null }),
  constructApi: context => ({
    highlight: (id: string | null) => {
      context.setState('highlighted', () => id);
      context.config.onHighlightChange?.(id);
    },
  }),
  events: {
    deps: context => [context.getState('highlighted'), context.config.only],
    run: (events, context) => {
      const highlighted = context.getState<string | null>('highlighted');

      return context.config.only && highlighted ? events.filter(event => event.id === highlighted) : events;
    },
  },
  decorate: {
    deps: context => [context.getState('highlighted')],
    run: (layout, context) => {
      const highlighted = context.getState<string | null>('highlighted');
      const is = (event: Calendar_Event<unknown>) => event.id === highlighted;

      if (layout.kind === 'timeGrid') {
        const grid = layout as Calendar_TimeGridLayout<unknown, unknown>;

        return {
          ...grid,
          columns: grid.columns.map(column => ({
            ...column,
            segments: column.segments.map(segment => ({ ...segment, isHighlighted: is(segment.event) })),
          })),
        };
      }

      if (layout.kind === 'list') {
        const list = layout as Calendar_ListLayout<unknown>;
        const sections = list.sections.map(section => ({
          ...section,
          days: section.days.map(day => ({ ...day, hasHighlighted: day.events.some(is) })),
        }));

        return { ...list, sections, days: sections.flatMap(section => section.days) };
      }

      return layout;
    },
  },
} satisfies Calendar_ConfiguredFeature<'highlightFeature', Highlight_Settings & { onHighlightChange?: (id: string | null) => void }>;

/** A calendar-wide feature that no view lists. */
const countFeature = {
  '~id': 'countFeature' as const,
  '~config': undefined,
  getInitialState: () => ({ derivations: 0 }),
  decorate: { run: layout => ({ ...layout, counted: true }) },
} satisfies Calendar_ConfiguredFeature<'countFeature', undefined>;

const events = [
  fixtures_timed('standup', { date: '2026-03-11', start: '09:00', end: '09:30' }),
  fixtures_timed('review', { date: '2026-03-11', start: '14:00', end: '15:00' }),
];

const viewsFeatures = calendarFeatures({ highlightFeature });
const views = calendarViews({
  features: viewsFeatures,
  views: {
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1, features: { highlightFeature: { only: true } } }),
    plain: timeGridView({ days: 1 }),
    list_week: listView({ days: 7 }),
  },
});

type Setup_Overrides = {
  view?: Extract<keyof typeof views, string>;
  features?: typeof viewsFeatures;
  highlight?: Highlight_Settings;
  onHighlightChange?: (id: string | null) => void;
  state?: { highlighted?: string | null };
  atoms?: { highlighted?: Store<string | null> };
};

const setup = ({ highlight, onHighlightChange, ...overrides }: Setup_Overrides = {}) =>
  createCalendar({
    timeZone: fixtures_timeZone,
    views: views,
    features: { countFeature, ...viewsFeatures, highlightFeature: { ...highlightFeature, '~config': { ...highlight, onHighlightChange } } },
    view: 'week',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: vi.fn(),
    events,
    clock: fixedClock(Temporal.Instant.from('2026-03-11T15:00:00Z')),
    ...overrides,
  });

const segments = (calendar: ReturnType<typeof setup>) => {
  const layout = calendar.store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('expected a time grid');

  return layout.columns.flatMap(column => column.segments);
};

it('collects the features the views use', () => {
  expect(Object.keys(viewsFeatures).toSorted()).toEqual(['highlightFeature']);
});

it('preserves event and resource payloads in feature API results', () => {
  const lookupFeature = {
    '~id': 'lookupFeature',
    '~config': undefined,
    constructApi: context => ({
      lookup: {
        event: (id: string) => context.options.events.find(event => event.id === id),
        resource: (id: string) => context.options.resources?.find(resource => resource.id === id),
      },
    }),
  } satisfies Calendar_ConfiguredFeature<'lookupFeature', undefined>;
  const lookupFeatures = calendarFeatures({ lookup: lookupFeature });
  const plain = calendarViews({ features: lookupFeatures, views: { list: listView({ days: 1 }) } });
  const event = { id: 'appointment', kind: 'allDay', start: Temporal.PlainDate.from('2026-03-11'), data: { title: 'Review' } } as const;
  const resource = { id: 'room', title: 'Room', availability: [], data: { capacity: 4 } };
  const options = {
    views: plain,
    features: lookupFeatures,
    timeZone: fixtures_timeZone,
    view: 'list' as const,
    date: event.start,
    events: [event],
    resources: [resource],
    onNavigate: () => {},
  };
  const calendar = createCalendar(options);
  const foundEvent = calendar.api.lookup.event(event.id);
  const foundResource = calendar.api.lookup.resource(resource.id);

  expectTypeOf(foundEvent).toEqualTypeOf<Calendar_EventInput<typeof event.data> | undefined>();
  expectTypeOf(foundResource).toEqualTypeOf<Calendar_Resource<typeof resource.data> | undefined>();
  expect(foundEvent).toBe(event);
  expect(foundResource).toBe(resource);
  expect(calendar.api.lookup.event('missing')).toBeUndefined();

  const withoutLookup = createCalendar({ ...options, features: {}, views: calendarViews({ features: {}, views: { list: listView({ days: 1 }) } }) });
  // @ts-expect-error payload-aware APIs remain absent without their feature
  void withoutLookup.api.lookup;
});

it('adds feature state, actions and model fields', () => {
  const calendar = setup();

  expect(calendar.store.state.highlighted).toBeNull();

  calendar.api.highlight('review');

  expect(calendar.store.state.highlighted).toBe('review');
  expect(segments(calendar).map(segment => [segment.event.id, 'isHighlighted' in segment && segment.isHighlighted])).toEqual([
    ['standup', false],
    ['review', true],
  ]);
});

it('inherits registered features in every view', () => {
  const calendar = setup({ view: 'plain' });

  calendar.api.highlight('review');

  expect(segments(calendar).map(segment => segment.isHighlighted)).toEqual([false, true]);
});

it('runs calendar-wide features in every view', () => {
  expect(setup({ view: 'plain' }).store.state.layout).toMatchObject({ counted: true });
  expect(setup({ view: 'list_week' }).store.state.layout).toMatchObject({ counted: true });
});

it('includes calendar-only feature fields in each view model type', () => {
  const registeredFeatures = calendarFeatures({});
  const registered = calendarViews({
    features: registeredFeatures,
    views: {
      grid: timeGridView({ days: 1 }),
      list: listView({ days: 1 }),
    },
  });
  const calendar = createCalendar({
    timeZone: fixtures_timeZone,
    views: registered,
    features: { ...registeredFeatures, highlightFeature },
    view: 'grid',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: vi.fn(),
    events,
  });
  calendar.api.highlight('review');
  const grid = calendar.store.state.layout;
  if (grid.kind !== 'timeGrid') throw new Error('expected a time grid');
  expectTypeOf(grid.columns[0]!.segments[0]!.isHighlighted).toEqualTypeOf<boolean>();
  expect(grid.columns[0]!.segments.map(segment => segment.isHighlighted)).toEqual([false, true]);

  calendar['~update']({ ...calendar.options, view: 'list' });
  const list = calendar.store.state.layout;
  if (list.kind !== 'list') throw new Error('expected a list');
  expectTypeOf(list.days[0]!.hasHighlighted).toEqualTypeOf<boolean>();
  expect(list.days[0]!.hasHighlighted).toBe(true);
});

it('keeps inherited feature fields in every view model type', () => {
  const registeredFeatures = calendarFeatures({ highlightFeature });
  const registered = calendarViews({
    features: registeredFeatures,
    views: {
      grid: timeGridView({ days: 1 }),
      list: listView({ days: 1 }),
    },
  });
  const calendar = createCalendar({
    timeZone: fixtures_timeZone,
    views: registered,
    features: { ...registeredFeatures },
    view: 'grid',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: vi.fn(),
    events,
  });
  const grid = calendar.store.state.layout;
  if (grid.kind !== 'timeGrid') throw new Error('expected a time grid');
  expectTypeOf(grid.columns[0]!.segments[0]!).toHaveProperty('isHighlighted');
  expect(grid.columns[0]!.segments[0]).toHaveProperty('isHighlighted');

  calendar['~update']({ ...calendar.options, view: 'list' });
  const list = calendar.store.state.layout;
  if (list.kind !== 'list') throw new Error('expected a list');
  expectTypeOf(list.days[0]!.hasHighlighted).toEqualTypeOf<boolean>();
  expect(list.days[0]!.hasHighlighted).toBe(false);
});

it('decorates section days and their flat index with the view feature types', () => {
  const calendar = setup({ view: 'list_week' });
  calendar.api.highlight('review');
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'list') throw new Error('expected a list');
  const highlighted: boolean | undefined = layout.sections[0]?.days[0]?.hasHighlighted;
  expect(highlighted).toBe(true);
  expect(layout.days[0]).toBe(layout.sections[0]?.days[0]);
});

it('resolves settings from feature defaults, then calendar options, then the view', () => {
  const week = setup({ view: 'week', highlight: { only: true } });
  const day = setup({ view: 'day', highlight: { only: false } });
  const plainDefaults = setup({ view: 'week' });

  for (const calendar of [week, day, plainDefaults]) calendar.api.highlight('review');

  expect(segments(week).map(segment => segment.event.id)).toEqual(['review']);
  expect(segments(day).map(segment => segment.event.id)).toEqual(['review']);
  expect(segments(plainDefaults).map(segment => segment.event.id)).toEqual(['standup', 'review']);
});

it('reads a controlled slice from state and reports changes without writing it', () => {
  const onHighlightChange = vi.fn();
  const calendar = setup({ state: { highlighted: 'standup' }, onHighlightChange });

  calendar.api.highlight('review');

  expect(onHighlightChange).toHaveBeenCalledWith('review');
  expect(calendar.store.state.highlighted).toBe('standup');

  calendar['~update']({ ...calendar.options, state: { highlighted: 'review' } });

  expect(calendar.store.state.highlighted).toBe('review');
});

it('keeps a slice in an external atom', () => {
  const highlighted = createStore<string | null>(null);
  const calendar = setup({ atoms: { highlighted } });

  calendar.api.highlight('standup');

  expect(highlighted.state).toBe('standup');
  expect(calendar.store.state.highlighted).toBe('standup');

  highlighted.setState(() => 'review');

  expect(calendar.store.state.highlighted).toBe('review');
});

it('replaces a configured feature implementation by its registration key', () => {
  const decorate = vi.fn(highlightFeature.decorate.run);
  const calendar = setup({ features: { highlightFeature: { ...highlightFeature, decorate: { ...highlightFeature.decorate, run: decorate } } } });
  expect(calendar.store.state.layout.kind).toBe('timeGrid');
  expect(decorate).toHaveBeenCalledTimes(1);
});

it('navigates through the active view layout', () => {
  const onNavigate = vi.fn();
  const monthFeatures = calendarFeatures({});
  const month = calendarViews({ features: monthFeatures, views: { month: dayGridView({ period: 'month', maxEventsPerDay: 3 }) } });
  const calendar = createCalendar({
    timeZone: fixtures_timeZone,
    views: month,
    features: { ...monthFeatures },
    view: 'month',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate,
    events: [],
  });

  calendar.api.next();

  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2026-04-01');
  expect(calendar.store.state.layout.kind).toBe('dayGrid');
});

it('types features from the views and options', () => {
  const calendar = setup();
  const layout = calendar.store.state.layout;

  // @ts-expect-error no view registers a day-grid layout
  if (layout.kind === 'dayGrid') return;

  // @ts-expect-error the setting exists only on views that list the feature
  listView({ days: 1, highlight: {} });

  expect(() =>
    createCalendar({
      timeZone: fixtures_timeZone,
      views: views,
      // @ts-expect-error views use features this object leaves out
      features: { countFeature },
      view: 'week',
      date: Temporal.PlainDate.from('2026-03-11'),
      onNavigate: () => {},
      events,
    }),
  ).toThrow(/requires registered feature/);

  const plainFeatures = calendarFeatures({});
  const plain = calendarViews({ features: plainFeatures, views: { list: listView({ days: 1 }) } });
  const withoutHighlight = createCalendar({
    timeZone: fixtures_timeZone,
    views: plain,
    features: { ...plainFeatures },
    view: 'list',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: () => {},
    events,
  });

  // @ts-expect-error the action exists only with the feature
  void withoutHighlight.api.highlight;

  expect(true).toBe(true);
});

it('exposes resolved descriptors and command-time state to feature lifecycle hooks', () => {
  const updates: string[] = [];
  const mounted = vi.fn();
  const cleaned = vi.fn();
  let descriptors: unknown;
  const lifecycleFeature = {
    '~id': 'lifecycleFeature',
    '~config': {},
    constructApi(context) {
      descriptors = context.features;
      context.onOptionsChange(() => updates.push(context.state.context.view));
      context.onMount(() => {
        mounted();
        return cleaned;
      });
      return {};
    },
  } satisfies Calendar_ConfiguredFeature;
  const configured = (() => {
    const features = calendarFeatures({ lifecycleFeature });
    return { features, views: calendarViews({ features, views: { day: listView({ days: 1 }) } }) };
  })();
  const calendar = createCalendar({
    ...configured,
    date: Temporal.PlainDate.from('2026-03-11'),
    view: 'day',
    timeZone: fixtures_timeZone,
    events,
    onNavigate: () => {},
  });
  expect(descriptors).toEqual({ ...configured.features, listLayout });
  const layout = calendar.store.state.layout;
  calendar['~update']({ ...calendar.options, onNavigate: () => {} });
  expect(updates).toEqual(['day']);
  expect(calendar.store.state.layout).toBe(layout);
  const release = calendar['~mount']();
  expect(mounted).toHaveBeenCalledOnce();
  release();
  release();
  expect(cleaned).toHaveBeenCalledOnce();
});

it('releases acquired resources when a feature mount fails and permits a later mount', () => {
  const cleaned = vi.fn();
  const subscribe = vi.fn(() => cleaned);
  const mount = vi
    .fn<() => () => void>()
    .mockImplementationOnce(() => {
      throw new Error('mount failed');
    })
    .mockImplementation(() => cleaned);
  const feature = {
    '~id': 'feature',
    '~config': {},
    constructApi(context) {
      context.onMount(mount);
      return {};
    },
  } satisfies Calendar_ConfiguredFeature;
  const configured = (() => {
    const features = calendarFeatures({ feature });
    return { features, views: calendarViews({ features, views: { day: listView({ days: 1 }) } }) };
  })();
  const calendar = createCalendar({
    ...configured,
    date: Temporal.PlainDate.from('2026-03-11'),
    view: 'day',
    timeZone: fixtures_timeZone,
    events,
    onNavigate: () => {},
    clock: { now: () => Temporal.Instant.from('2026-03-11T15:00Z'), subscribe },
  });
  expect(() => calendar['~mount']()).toThrow('mount failed');
  expect(cleaned).toHaveBeenCalledOnce();
  const release = calendar['~mount']();
  release();
  expect(subscribe).toHaveBeenCalledTimes(2);
  expect(cleaned).toHaveBeenCalledTimes(3);
});
