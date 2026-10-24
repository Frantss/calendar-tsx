import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';

import {
  backgroundFeature as rootBackgroundFeature,
  createBackgroundLayer as rootCreateBackgroundLayer,
  createWeeklyRanges as rootCreateWeeklyRanges,
  recurrenceFeature as rootRecurrenceFeature,
  createRecurringEvent as rootCreateRecurringEvent,
  createCalendar,
  calendarViews,
  calendarFeatures,
  timeGridView,
  fixedClock,
} from '@calendar-tsx/core';
import type { Calendar_ConfiguredFeature, Calendar_EventDefinition, Calendar_BackgroundLayer as RootBackgroundLayer } from '@calendar-tsx/core';
import { backgroundFeature, createBackgroundLayer, createWeeklyRanges } from '@calendar-tsx/core/background';
import type { Calendar_BackgroundLayer } from '@calendar-tsx/core/background';
import { recurrenceFeature, createRecurringEvent } from '@calendar-tsx/core/recurrence';
import type { Calendar_RecurringAllDayEventInput } from '@calendar-tsx/core/recurrence';

declare module '@calendar-tsx/core' {
  interface Calendar_State_FeatureMap {
    exportsProbeFeature: { exportsProbe: number };
  }
  interface Calendar_Api_FeatureMap {
    exportsProbeFeature: { incrementExportsProbe: () => void };
  }
}

const exportsProbeFeature = {
  '~id': 'exportsProbeFeature' as const,
  '~config': undefined,
  getInitialState: () => ({ exportsProbe: 0 }),
  constructApi: context => ({
    incrementExportsProbe: () => context.setState<number>('exportsProbe', value => value + 1),
  }),
} satisfies Calendar_ConfiguredFeature<'exportsProbeFeature', undefined>;

const setup = () => {
  const viewsFeatures = calendarFeatures({});
  const views = calendarViews({ features: viewsFeatures, views: { day: timeGridView({ days: 2 }) } });
  const layer = createBackgroundLayer({
    id: 'holiday',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }],
  });
  const event = createRecurringEvent({
    id: 'daily',
    kind: 'allDay',
    start: Temporal.PlainDate.from('2026-03-11'),
    rrule: { freq: 'DAILY', count: 2 },
    data: { title: 'Daily' },
  });

  expectTypeOf<Calendar_BackgroundLayer>().toEqualTypeOf<RootBackgroundLayer>();
  expectTypeOf(event).toExtend<Calendar_RecurringAllDayEventInput<{ title: string }>>();
  expectTypeOf(event).toExtend<Calendar_EventDefinition<{ title: string }, { recurrenceFeature: ReturnType<typeof recurrenceFeature> }>>();

  return createCalendar({
    views: views,
    features: { ...viewsFeatures, recurrenceFeature: recurrenceFeature(), exportsProbeFeature, backgroundFeature: backgroundFeature([layer]) },
    events: [event],
    date: Temporal.PlainDate.from('2026-03-11'),
    view: 'day',
    timeZone: 'America/Montevideo',
    clock: fixedClock(Temporal.Instant.from('2026-03-11T12:00:00Z')),
    onNavigate: vi.fn(),
  });
};

it('exports the same feature implementations and helpers through root and feature entries', () => {
  expect(backgroundFeature).toBe(rootBackgroundFeature);
  expect(createBackgroundLayer).toBe(rootCreateBackgroundLayer);
  expect(createWeeklyRanges).toBe(rootCreateWeeklyRanges);
  expect(recurrenceFeature).toBe(rootRecurrenceFeature);
  expect(createRecurringEvent).toBe(rootCreateRecurringEvent);
  expectTypeOf(backgroundFeature).toEqualTypeOf<typeof rootBackgroundFeature>();
  expectTypeOf(createRecurringEvent).toEqualTypeOf<typeof rootCreateRecurringEvent>();
});

it('composes subpath feature types and behavior with the root calendar', () => {
  const calendar = setup();
  const model = calendar.store.state.layout;

  expectTypeOf(model.columns[0].backgrounds[0].kind).toEqualTypeOf<string>();
  expect(model.columns.map(column => column.backgrounds.map(background => background.kind))).toEqual([['holiday'], []]);
  expect(model.allDay?.segments.map(segment => segment.event.data.title)).toEqual(['Daily', 'Daily']);
});

it('shares public extension maps and keeps feature state separate between calendars', () => {
  const first = setup();
  const second = setup();

  expectTypeOf(first.store.state.exportsProbe).toEqualTypeOf<number>();
  expect(first.store.state.exportsProbe).toBe(0);
  first.api.incrementExportsProbe();
  expect(first.store.state.exportsProbe).toBe(1);
  expect(second.store.state.exportsProbe).toBe(0);
});
