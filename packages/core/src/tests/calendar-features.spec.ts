import type { Store } from '@tanstack/store';
import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';

import { createCalendar } from '#calendar';
import { fixedClock } from '#calendar-clock';
import { listLayout } from '#calendar-layouts';
import { listView, dayGridView, timeGridView, createCalendarViews } from '#calendar-views';
import type { Calendar_Event, Calendar_Feature, Calendar_TimeGridLayout } from '#calendar.types';
import { fixtures_timeZone, fixtures_timed } from '#tests/calendar.fixtures';

type Highlight_Settings = { only?: boolean };

declare module '#calendar.types' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    highlightFeature: { highlight?: Highlight_Settings; onHighlightChange?: (id: string | null) => void };
  }
  interface Calendar_ViewSettings_FeatureMap {
    highlightFeature: { highlight?: Highlight_Settings };
  }
  interface Calendar_State_FeatureMap {
    highlightFeature: { highlighted: string | null };
  }
  interface Calendar_Api_FeatureMap {
    highlightFeature: { highlight: (id: string | null) => void };
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
  getInitialState: () => ({ highlighted: null }),
  constructApi: context => ({
    highlight: (id: string | null) => {
      context.setState('highlighted', () => id);
      (context.options as { onHighlightChange?: (id: string | null) => void }).onHighlightChange?.(id);
    },
  }),
  events: {
    deps: context => [context.getState('highlighted'), context.settings<Highlight_Settings>('highlight', {}).only],
    run: (events, context) => {
      const highlighted = context.getState<string | null>('highlighted');

      return context.settings<Highlight_Settings>('highlight', { only: false }).only && highlighted
        ? events.filter(event => event.id === highlighted)
        : events;
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
        const list = layout as { kind: 'list'; days: { events: Calendar_Event<unknown>[] }[] };

        return { ...list, days: list.days.map(day => ({ ...day, hasHighlighted: day.events.some(is) })) };
      }

      return layout;
    },
  },
} satisfies Calendar_Feature;

/** A calendar-wide feature that no view lists. */
const countFeature = {
  getInitialState: () => ({ derivations: 0 }),
  decorate: { run: layout => ({ ...layout, counted: true }) },
} satisfies Calendar_Feature;

const events = [
  fixtures_timed('standup', { date: '2026-03-11', start: '09:00', end: '09:30' }),
  fixtures_timed('review', { date: '2026-03-11', start: '14:00', end: '15:00' }),
];

const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { highlightFeature } }),
  day: timeGridView({ days: 1, features: { highlightFeature }, highlight: { only: true } }),
  plain: timeGridView({ days: 1 }),
  list_week: listView({ days: 7, features: { highlightFeature } }),
});

type Setup_Overrides = {
  view?: Extract<keyof typeof views.views, string>;
  features?: typeof views.features;
  highlight?: Highlight_Settings;
  onHighlightChange?: (id: string | null) => void;
  state?: { highlighted?: string | null };
  atoms?: { highlighted?: Store<string | null> };
};

const setup = (overrides: Setup_Overrides = {}) =>
  createCalendar({
    timeZone: fixtures_timeZone,
    views: views.views,
    features: { countFeature, ...views.features },
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
  expect(Object.keys(views.features).toSorted()).toEqual(['highlightFeature', 'listLayout', 'timeGridLayout']);
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

it('runs a feature only in the views that list it', () => {
  const calendar = setup({ view: 'plain' });

  calendar.api.highlight('review');

  expect(segments(calendar).every(segment => !('isHighlighted' in segment))).toBe(true);
});

it('runs calendar-wide features in every view', () => {
  expect(setup({ view: 'plain' }).store.state.layout).toMatchObject({ counted: true });
  expect(setup({ view: 'list_week' }).store.state.layout).toMatchObject({ counted: true });
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

it('replaces an implementation by key everywhere', () => {
  const build = vi.fn(listLayout.build);
  const calendar = setup({
    view: 'list_week',
    features: { ...views.features, listLayout: { ...listLayout, build } },
  });

  expect(calendar.store.state.layout.kind).toBe('list');
  expect(build).toHaveBeenCalledTimes(1);
});

it('navigates through the active view layout', () => {
  const onNavigate = vi.fn();
  const month = createCalendarViews({ month: dayGridView({ period: 'month', maxEventsPerDay: 3 }) });
  const calendar = createCalendar({
    timeZone: fixtures_timeZone,
    views: month.views,
    features: { ...month.features },
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

  createCalendar({
    timeZone: fixtures_timeZone,
    views: views.views,
    // @ts-expect-error views use features this object leaves out
    features: { countFeature },
    view: 'week',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: () => {},
    events,
  });

  const plain = createCalendarViews({ list: listView({ days: 1 }) });
  const withoutHighlight = createCalendar({
    timeZone: fixtures_timeZone,
    views: plain.views,
    features: { ...plain.features },
    view: 'list',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: () => {},
    events,
  });

  // @ts-expect-error the action exists only with the feature
  void withoutHighlight.api.highlight;

  expect(true).toBe(true);
});
