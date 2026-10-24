import { useSelector } from '@tanstack/react-store';
import { interactionFeature, dateSelectionFeature, eventMoveFeature, eventResizeFeature, timeGridView, timelineView } from '@calendar-tsx/core';
import { StrictMode, useLayoutEffect } from 'react';
import { memo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { Calendar_Clock } from '@calendar-tsx/core';
import { listView, calendarViews, calendarFeatures } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/support/calendar.fixtures';
import { fixtures_timeZone, fixtures_timed } from '#tests/support/calendar.fixtures';
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

it('installs registered interaction APIs, syncs source changes, and cancels on unmount', async () => {
  const features = calendarFeatures({
    resize: eventResizeFeature(),
    move: eventMoveFeature(),
    select: dateSelectionFeature(),
    interactions: interactionFeature(),
  });
  const views = { features, views: calendarViews({ features, views: { day: listView({ days: 1 }) } }) };
  const onEventResize = vi.fn();
  let inspect: (() => { outcome: string | null; keys: string[]; complete: () => unknown }) | undefined;
  let token: import('@calendar-tsx/core').Calendar_InteractionHandle<'resize', typeof defaults.yoga.data> | undefined;
  const Harness = () => {
    const [events, setEvents] = useState([defaults.yoga]);
    const calendar = useCalendar({
      ...views,
      view: 'day',
      date: defaults.date,
      timeZone: fixtures_timeZone,
      events: events,
      onNavigate: () => {},
      onEventResize,
      resizing: { enabled: true },
    });
    const draft = useSelector(calendar.api.interactions.store, state => state);
    useLayoutEffect(() => {
      inspect = () => ({
        outcome: calendar.api.interactions.store.state.outcome,
        keys: Object.keys(calendar.api),
        complete: () => token?.commit(),
      });
    }, [calendar]);
    return (
      <CalendarProvider value={calendar}>
        <p>{draft.outcome ?? 'idle'}</p>
        <button
          onClick={() => {
            const result = calendar.api.resize.begin(defaults.yoga.id, 'end');
            if (result.status === 'active') {
              token = result.session;
              token.update({ kind: 'timed', at: defaults.yoga.end.add({ hours: 1 }) });
            }
          }}
        >
          draft resize
        </button>
        <button onClick={() => token?.commit()}>complete resize</button>
        <button onClick={() => setEvents(current => current.map(event => ({ ...event })))}>replace source</button>
      </CalendarProvider>
    );
  };
  const screen = await render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  );
  await page.getByRole('button', { name: 'draft resize' }).click();
  await page.getByRole('button', { name: 'complete resize' }).click();
  expect(onEventResize).toHaveBeenCalledOnce();
  expect(onEventResize.mock.calls[0][0].edge).toBe('end');
  await page.getByRole('button', { name: 'draft resize' }).click();
  await page.getByRole('button', { name: 'replace source' }).click();
  await expect.element(page.getByText('source-changed', { exact: true })).toBeInTheDocument();
  expect(inspect!().outcome).toBe('source-changed');
  expect(inspect!().keys).toEqual(expect.arrayContaining(['selection', 'move', 'resize', 'interactions']));
  await page.getByRole('button', { name: 'draft resize' }).click();
  await screen.unmount();
  expect(inspect!().outcome).toBe('unmounted');
  expect(inspect!().complete()).toMatchObject({ status: 'stale-session' });
  expect(onEventResize).toHaveBeenCalledOnce();
});

for (const kind of ['timeGrid', 'timeline'] as const) {
  it(`observes production ${kind} previews through the native framework selector`, async () => {
    const features = calendarFeatures({ interactions: interactionFeature(), resize: eventResizeFeature() });
    const views = {
      features,
      views: calendarViews({ features, views: { day: kind === 'timeGrid' ? timeGridView({ days: 1 }) : timelineView({ days: 1 }) } }),
    };
    const events = [defaults.yoga];
    const Harness = () => {
      const calendar = useCalendar({
        ...views,
        timeZone: fixtures_timeZone,
        date: defaults.date,
        view: 'day',
        events,
        onNavigate: () => {},
      });
      const preview = useSelector(calendar.api.interactions.store, state => state.preview);
      const extend = () => {
        const result = calendar.api.resize.begin(defaults.yoga.id, 'end');
        if (result.status !== 'active') throw new Error(result.status);
        const point =
          kind === 'timeGrid'
            ? calendar.api.interactions.locate({ kind: 'timeGrid', surface: { kind: 'column', key: 'all:2026-03-11' }, fraction: 11 / 24 })
            : calendar.api.interactions.locate({ kind: 'timeline', surface: { kind: 'lane', key: 'all' }, fraction: 11 / 24 });
        if (point.status !== 'valid') throw new Error(point.reason);
        result.session.update(point.target);
      };
      const value =
        preview?.status === 'valid' && (preview.kind === 'timeGrid' || preview.kind === 'timeline') ? preview.geometry[0]?.span.toFixed(6) : 'none';
      return (
        <>
          <button onClick={extend}>preview resize</button>
          <output>{value}</output>
        </>
      );
    };
    await render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await expect.element(page.getByRole('status')).toHaveTextContent('none');
    await page.getByRole('button', { name: 'preview resize' }).click();
    await expect.element(page.getByRole('status')).toHaveTextContent('0.083333');
  });
}
