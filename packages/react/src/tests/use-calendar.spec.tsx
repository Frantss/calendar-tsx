import { memo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { Calendar_Clock } from '@calendar-tsx/core';
import { listView, calendarViews, calendarFeatures } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timeZone, fixtures_timed } from '#tests/calendar.fixtures';
import { Calendar, CalendarProvider, useCalendar, useCalendarContext, useCalendarSelector } from '#use-calendar';
import { useCalendarEventStore } from '#use-calendar-event-store';

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

  return <p>{titles.join(',') || 'none'}</p>;
};

const setup = async ({ clock }: { clock?: Calendar_Clock } = {}) => {
  const onNavigate = vi.fn();
  const renders = { titles: 0, period: 0 };

  // memoised, so any re-render comes from its own store slice, not from the parent
  const Period = memo(() => {
    renders.period++;
    const start = useCalendarSelector(state => state.context.period.start.toString());

    return <span>{start}</span>;
  });

  const CountedTitles = () => {
    renders.titles++;

    return <Titles />;
  };

  const Harness = () => {
    const [events, setEvents] = useState([defaults.yoga]);
    const calendar = useCalendar<Fixtures_EventData>({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events,
      onNavigate,
      clock,
    });

    return (
      <CalendarProvider value={calendar}>
        <button type='button' onClick={() => setEvents(current => [...current, defaults.swim])}>
          add
        </button>
        <Period />
        <CountedTitles />
      </CalendarProvider>
    );
  };

  await render(<Harness />);

  const ui = {
    add: page.getByRole('button', { name: 'add' }),
    titles: page.getByText(/Yoga/),
  };

  return { ui, renders, mocks: { onNavigate } };
};

it('re-derives the layout when a new events array arrives', async () => {
  const { ui } = await setup();

  await expect.element(ui.titles).toHaveTextContent('Yoga');
  await ui.add.click();
  await expect.element(ui.titles).toHaveTextContent('Yoga,Swim');
});

it('re-renders a selector only when its slice changes', async () => {
  const { ui, renders } = await setup();
  const periodRenders = renders.period;

  await ui.add.click();
  await expect.element(ui.titles).toHaveTextContent('Yoga,Swim');

  // the layout changed but the period did not
  expect(renders.period).toBe(periodRenders);
});

it('mounts the clock with the component and stops it on unmount', async () => {
  const unsubscribe = vi.fn();
  const clock: Calendar_Clock = { now: () => defaults.now, subscribe: vi.fn(() => unsubscribe) };
  const screen = await render(
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
    </Calendar>,
  );

  expect(clock.subscribe).toHaveBeenCalledOnce();
  await screen.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('provides the same instance through Calendar and CalendarProvider', async () => {
  const seen: unknown[] = [];
  const Probe = () => {
    seen.push(useCalendarContext().instance);

    return null;
  };
  const ViaProvider = () => {
    const calendar = useCalendar({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events: [],
      onNavigate: vi.fn(),
    });

    seen.push(calendar);

    return (
      <CalendarProvider value={calendar}>
        <Probe />
      </CalendarProvider>
    );
  };

  await render(<ViaProvider />);

  expect(seen[0]).toBe(seen[1]);
});

it('throws when a part is rendered outside a root', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(render(<Titles />)).rejects.toThrow('parts must be rendered inside Calendar or CalendarProvider');
});

it('feeds managed events into the calendar', async () => {
  const Harness = () => {
    const eventStore = useCalendarEventStore<Fixtures_EventData>([defaults.yoga]);
    const calendar = useCalendar({
      timeZone: fixtures_timeZone,
      views: defaults.views,
      features: {},
      view: 'list_week',
      date: defaults.date,
      events: eventStore.events,
      onNavigate: vi.fn(),
    });

    return (
      <CalendarProvider value={calendar}>
        <button type='button' onClick={() => eventStore.add([defaults.swim])}>
          add
        </button>
        <Titles />
      </CalendarProvider>
    );
  };

  await render(<Harness />);
  await page.getByRole('button', { name: 'add' }).click();

  await expect.element(page.getByText('Yoga,Swim')).toBeInTheDocument();
});
