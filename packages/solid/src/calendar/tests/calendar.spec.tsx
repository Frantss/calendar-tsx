import { createEffect, createSignal } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_Clock } from '@calendar-tsx/core';
import { calendarViews, calendarFeatures, listView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/support/calendar.fixtures';
import { fixtures_timeZone, fixtures_timed } from '#tests/support/calendar.fixtures';
import { tests_render } from '#tests/support/render';
import { Calendar, CalendarProvider, useCalendar, useCalendarContext, useCalendarSelector } from '#calendar/calendar';
import { useCalendarEventStore } from '#events/use-calendar-event-store';

const defaults = {
  views: calendarViews({ features: calendarFeatures({}), views: { list_week: listView({ days: 7 }) } }),
  date: Temporal.PlainDate.from('2026-03-11'),
  yoga: fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
  swim: fixtures_timed('Swim', { date: '2026-03-12', start: '14:00', end: '15:00' }),
  now: Temporal.ZonedDateTime.from('2026-03-11T10:40[America/New_York]').toInstant(),
};

const Titles = () => {
  const titles = useCalendarSelector(state =>
    state.layout.kind === 'list' ? state.layout.days.flatMap(day => day.events.map(event => event.id)) : [],
  );

  return <p>{titles().join(',') || 'none'}</p>;
};

const setup = ({ clock }: { clock?: Calendar_Clock } = {}) => {
  const onNavigate = vi.fn();
  const onPeriod = vi.fn();

  const Period = () => {
    const start = useCalendarSelector(state => state.context.period.start.toString());

    createEffect(() => onPeriod(start()));

    return <span>{start()}</span>;
  };

  const Harness = () => {
    const [events, setEvents] = createSignal([defaults.yoga]);
    const calendar = useCalendar<Fixtures_EventData>(() => ({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events: events(),
      onNavigate,
      clock,
    }));

    return (
      <CalendarProvider value={calendar}>
        <button type='button' onClick={() => setEvents(current => [...current, defaults.swim])}>
          add
        </button>
        <Period />
        <Titles />
      </CalendarProvider>
    );
  };

  tests_render(() => <Harness />);

  const ui = {
    add: page.getByRole('button', { name: 'add' }),
    titles: page.getByText(/Yoga/),
  };

  return { ui, mocks: { onNavigate, onPeriod } };
};

it('re-derives the layout when a new events array arrives', async () => {
  const { ui } = setup();

  await expect.element(ui.titles).toHaveTextContent('Yoga');
  await ui.add.click();
  await expect.element(ui.titles).toHaveTextContent('Yoga,Swim');
});

it('updates a selector only when its slice changes', async () => {
  const { ui, mocks } = setup();
  const periodUpdates = mocks.onPeriod.mock.calls.length;

  await ui.add.click();
  await expect.element(ui.titles).toHaveTextContent('Yoga,Swim');

  // the layout changed but the period did not
  expect(mocks.onPeriod).toHaveBeenCalledTimes(periodUpdates);
});

it('mounts the clock with the component and stops it on unmount', async () => {
  const unsubscribe = vi.fn();
  const clock: Calendar_Clock = { now: () => defaults.now, subscribe: vi.fn(() => unsubscribe) };
  const screen = tests_render(() => (
    <Calendar
      timeZone={fixtures_timeZone}
      views={defaults.views}
      features={{}}
      view='list_week'
      date={defaults.date}
      events={[]}
      onNavigate={vi.fn()}
      clock={clock}
    >
      <Titles />
    </Calendar>
  ));

  expect(clock.subscribe).toHaveBeenCalledOnce();
  screen.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('syncs Calendar props into the instance when a signal they read changes', async () => {
  const [events, setEvents] = createSignal([defaults.yoga]);

  tests_render(() => (
    <Calendar
      timeZone={fixtures_timeZone}
      views={defaults.views}
      features={{}}
      view='list_week'
      date={defaults.date}
      events={events()}
      onNavigate={vi.fn()}
    >
      <Titles />
    </Calendar>
  ));

  await expect.element(page.getByText('Yoga')).toBeInTheDocument();
  setEvents(current => [...current, defaults.swim]);
  await expect.element(page.getByText('Yoga,Swim')).toBeInTheDocument();
});

it('provides the instance it created through CalendarProvider', async () => {
  const seen: unknown[] = [];
  const Probe = () => {
    seen.push(useCalendarContext().instance);

    return null;
  };
  const ViaProvider = () => {
    const calendar = useCalendar(() => ({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events: [],
      onNavigate: vi.fn(),
    }));

    seen.push(calendar);

    return (
      <CalendarProvider value={calendar}>
        <Probe />
      </CalendarProvider>
    );
  };

  tests_render(() => <ViaProvider />);

  expect(seen[0]).toBe(seen[1]);
});

it('throws when a part is rendered outside a root', async () => {
  expect(() => tests_render(() => <Titles />)).toThrow('parts must be rendered inside Calendar or CalendarProvider');
});

it('feeds managed events into the calendar', async () => {
  const Harness = () => {
    const eventStore = useCalendarEventStore<Fixtures_EventData>([defaults.yoga]);
    const calendar = useCalendar(() => ({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events: eventStore.events(),
      onNavigate: vi.fn(),
    }));

    return (
      <CalendarProvider value={calendar}>
        <button type='button' onClick={() => eventStore.add([defaults.swim])}>
          add
        </button>
        <Titles />
      </CalendarProvider>
    );
  };

  tests_render(() => <Harness />);
  await page.getByRole('button', { name: 'add' }).click();

  await expect.element(page.getByText('Yoga,Swim')).toBeInTheDocument();
});
