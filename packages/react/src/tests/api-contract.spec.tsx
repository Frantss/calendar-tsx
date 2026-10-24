import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { Calendar_State, Calendar_DayGridDay, Calendar_ConfiguredFeature, Calendar_TimelineDay } from '@calendar-tsx/core';
import {
  backgroundFeature,
  createBackgroundLayer,
  createCalendar,
  calendarViews,
  calendarFeatures,
  dayGridView,
  fixedClock,
  timeGridView,
  timelineView,
} from '@calendar-tsx/core';
import { DayGridViewDayTrigger } from '#day-grid-view';
import { TimeGridViewColumnTrigger } from '#time-grid-view';
import { TimelineViewDayTrigger } from '#timeline-view';
import { Calendar, CalendarProvider, useCalendar, useCalendarContext, useCalendarSelector } from '#use-calendar';

declare module '@calendar-tsx/core' {
  interface Calendar_State_FeatureMap {
    cohesionFeature: { cohesion: string };
  }
}

const cohesionFeature = {
  '~id': 'cohesionFeature',
  '~config': undefined,
  getInitialState: () => ({ cohesion: 'ready' }),
} satisfies Calendar_ConfiguredFeature<'cohesionFeature', undefined>;
const viewsFeatures = calendarFeatures({});
const views = calendarViews({
  features: viewsFeatures,
  views: {
    day: timeGridView({ days: 1 }),
    month: dayGridView({ period: 'month', maxEventsPerDay: 2 }),
    timeline: timelineView({ days: 1 }),
  },
});
const options = {
  timeZone: 'UTC',
  views: views,
  features: viewsFeatures,
  view: 'day' as const,
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [],
  onNavigate: vi.fn(),
  clock: fixedClock(Temporal.Instant.from('2026-03-11T12:00Z')),
};

it('accepts plain and feature-owning calendars after a feature state merge', async () => {
  const plain = createCalendar(options);
  const featured = createCalendar({ ...options, features: { ...viewsFeatures, cohesionFeature } });
  expectTypeOf(plain.store.state).not.toHaveProperty('cohesion');
  expectTypeOf(featured.store.state.cohesion).toEqualTypeOf<string>();
  expect(featured.store.state.cohesion).toBe('ready');

  await render(
    <>
      <CalendarProvider value={plain}>
        <p>plain provider</p>
      </CalendarProvider>
      <CalendarProvider value={featured}>
        <p>feature provider</p>
      </CalendarProvider>
      <Calendar {...options}>
        <p>plain root</p>
      </Calendar>
      <Calendar {...options} features={{ ...viewsFeatures, cohesionFeature }}>
        <p>feature root</p>
      </Calendar>
    </>,
  );
  for (const text of ['plain provider', 'feature provider', 'plain root', 'feature root'])
    await expect.element(page.getByText(text, { exact: true })).toBeInTheDocument();
});

it('navigates through the explicitly supplied calendar', async () => {
  const onNavigate = vi.fn();
  const providerNavigate = vi.fn();
  const calendar = createCalendar({ ...options, onNavigate });
  const provider = createCalendar({ ...options, onNavigate: providerNavigate });
  const grid = calendar.store.state.layout;
  if (grid.kind !== 'timeGrid') throw new Error('expected a time grid');

  await render(
    <CalendarProvider value={provider}>
      <TimeGridViewColumnTrigger calendar={calendar} column={grid.columns[0]!} view='timeline'>
        open timeline
      </TimeGridViewColumnTrigger>
    </CalendarProvider>,
  );
  await page.getByRole('button').click();
  expect(onNavigate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ view: 'timeline', date: options.date }));
  expect(providerNavigate).not.toHaveBeenCalled();
});

it('uses provider locale in both compositions and updates accessible date labels', async () => {
  const calendar = createCalendar(options);
  const seen: object[] = [];
  const Trigger = () => {
    const { instance } = useCalendarContext();
    seen.push(instance.options);
    const column = useCalendarSelector(state => (state.layout.kind === 'timeGrid' ? state.layout.columns[0] : undefined));
    return column ? <TimeGridViewColumnTrigger calendar={calendar} column={column} view='day' /> : null;
  };
  const Harness = () => {
    const [locale, setLocale] = useState('de-DE');
    return (
      <>
        <button onClick={() => setLocale('fr-FR')}>switch locale</button>
        <Calendar {...options} locale={locale}>
          <Trigger />
        </Calendar>
        <CalendarProvider value={calendar} locale={locale}>
          <Trigger />
        </CalendarProvider>
      </>
    );
  };
  await render(<Harness />);
  const label = (locale: string) =>
    `Go to ${options.date.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
  expect(page.getByRole('button', { name: label('de-DE'), exact: true }).elements()).toHaveLength(2);
  await page.getByRole('button', { name: 'switch locale' }).click();
  await expect.poll(() => page.getByRole('button', { name: label('fr-FR'), exact: true }).elements().length).toBe(2);
  expect(seen.every(value => !('locale' in value))).toBe(true);
});

it('rejects unregistered trigger targets and locale on hook options', () => {
  const calendar = createCalendar(options);
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'timeGrid') throw new Error('expected a time grid');
  const day = {} as Calendar_DayGridDay<unknown>;
  const timelineDay = {} as Calendar_TimelineDay;
  const InvalidTriggers = () => {
    // @ts-expect-error the calendar has no missing view
    const dayTrigger = <DayGridViewDayTrigger calendar={calendar} day={day} view='missing' />;
    // @ts-expect-error view must not widen the calendar's registered keys
    const columnTrigger = <TimeGridViewColumnTrigger calendar={calendar} column={layout.columns[0]!} view='missing' />;
    // @ts-expect-error the calendar has no missing view
    const timelineTrigger = <TimelineViewDayTrigger calendar={calendar} day={timelineDay} view='missing' />;
    // @ts-expect-error a trigger must name the calendar that owns its view keys
    const missingCalendar = <TimelineViewDayTrigger day={timelineDay} view='day' />;
    return (
      <>
        {dayTrigger}
        {columnTrigger}
        {timelineTrigger}
        {missingCalendar}
      </>
    );
  };
  // @ts-expect-error locale belongs on CalendarProvider or Calendar
  const InvalidHook = () => useCalendar({ ...options, locale: 'de-DE' });
  void InvalidTriggers;
  void InvalidHook;
  expectTypeOf<Parameters<typeof calendar.api.setView>[0]>().toEqualTypeOf<'day' | 'month' | 'timeline'>();
});

it('applies aliased factory defaults and per-view overrides through controlled navigation', async () => {
  const features = calendarFeatures({
    background: backgroundFeature([createBackgroundLayer({ id: 'holiday', kind: 'holiday', ranges: [{ allDay: true, start: options.date }] })]),
  });
  const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }), week: timeGridView({ days: 1, features: { background: [] } }) } });
  const Layers = () => {
    const model = useCalendarSelector((state: Calendar_State<unknown, unknown, typeof views, typeof features>) => state.layout);
    return <p>{model.columns[0].backgrounds.length} layers</p>;
  };
  const Harness = () => {
    const [view, setView] = useState<'day' | 'week'>('day');
    const calendar = useCalendar({ ...options, features, views, view, onNavigate: next => setView(next.view) });
    return (
      <CalendarProvider value={calendar}>
        <button type='button' onClick={() => calendar.api.setView('week')}>
          week
        </button>
        <Layers />
      </CalendarProvider>
    );
  };
  await render(<Harness />);
  await expect.element(page.getByText('1 layers')).toBeVisible();
  await page.getByRole('button', { name: 'week', exact: true }).click();
  await expect.element(page.getByText('0 layers')).toBeVisible();
});
