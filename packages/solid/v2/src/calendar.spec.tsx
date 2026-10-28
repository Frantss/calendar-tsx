import { createEffect, createRoot, createSignal, flush, For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { calendarFeatures, calendarViews, createCalendar, fixedClock, listView } from '@calendar-tsx/core';
import {
  Calendar,
  CalendarProvider,
  ListView,
  ListViewDay,
  ListViewEmpty,
  ListViewEvent,
  useCalendar,
  useCalendarContext,
  useCalendarEventStore,
  useCalendarSelector,
} from '@calendar-tsx/solid/v2';
import { tests_render } from './test-support';
import { useSelector } from './store';
import { createStore } from '@tanstack/store';

const date = Temporal.PlainDate.from('2026-10-27');
const features = calendarFeatures({});
const views = calendarViews({ features, views: { list: listView({ days: 1 }) } });
const event = { id: 'meeting', kind: 'allDay' as const, start: date, data: { title: 'Meeting' } };
const options = {
  features,
  views,
  timeZone: 'UTC',
  date,
  view: 'list' as const,
  events: [event],
  onNavigate: () => {},
  clock: fixedClock(Temporal.Instant.from('2026-10-27T12:00Z')),
};

const Events = () => {
  const model = useCalendarSelector(state => state.layout);
  const list = () => {
    const layout = model();
    if (layout.kind !== 'list') throw new Error('Expected a list');
    return layout;
  };
  return (
    <ListView model={list()}>
      <For each={list().days}>
        {day => (
          <ListViewDay day={day}>
            <For each={day.events}>{event => <ListViewEvent event={event}>{event.id}</ListViewEvent>}</For>
          </ListViewDay>
        )}
      </For>
      <ListViewEmpty>No events</ListViewEmpty>
    </ListView>
  );
};

const Locale = () => <output>{useCalendarContext().locale}</output>;

it('updates shared parts from controlled options and managed events', async () => {
  const Harness = () => {
    const events = useCalendarEventStore([event]);
    const [locale, setLocale] = createSignal('en-US');
    const calendar = useCalendar(() => ({ ...options, events: events.events() }));
    return (
      <CalendarProvider value={calendar} locale={locale()}>
        <button onClick={() => events.reset([])}>Clear</button>
        <button onClick={() => setLocale('fr-FR')}>French</button>
        <Locale />
        <Events />
      </CalendarProvider>
    );
  };
  tests_render(() => <Harness />);
  await expect.element(page.getByRole('button', { name: 'meeting' })).toHaveAttribute('data-part', 'list-event');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect.element(page.getByText('No events')).toBeVisible();
  await page.getByRole('button', { name: 'French' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('fr-FR');
});

it('syncs Calendar props and disposes the clock subscription', async () => {
  const unsubscribe = vi.fn();
  const clock = { now: options.clock.now, subscribe: vi.fn(() => unsubscribe) };
  const Harness = () => {
    const [events, setEvents] = createSignal([event]);
    return (
      <>
        <button onClick={() => setEvents([])}>Clear</button>
        <Calendar {...options} events={events()} clock={clock}>
          <Events />
        </Calendar>
      </>
    );
  };
  const screen = tests_render(() => <Harness />);
  expect(clock.subscribe).toHaveBeenCalledOnce();
  await expect.element(page.getByRole('button', { name: 'meeting' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect.element(page.getByText('No events')).toBeVisible();
  screen.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('keeps custom render state reactive and composes handlers and refs', async () => {
  const model = createCalendar(options).store.state.layout;
  const event = model.days[0]!.events[0]!;
  const partClick = vi.fn();
  const consumerClick = vi.fn();
  const partRef = vi.fn();
  const consumerRef = vi.fn();
  const Harness = () => {
    const [id, setId] = createSignal(event.id);
    return (
      <>
        <button onClick={() => setId('renamed')}>Rename</button>
        <ListViewEvent
          event={{ ...event, id: id() }}
          class='part'
          onClick={partClick}
          ref={partRef}
          render={(props, state) => <button {...props({ class: 'consumer', onClick: consumerClick, ref: consumerRef })}>{state().id}</button>}
        />
      </>
    );
  };
  tests_render(() => <Harness />);
  const button = page.getByRole('button', { name: 'meeting' });
  await expect.element(button).toHaveAttribute('class', 'part consumer');
  await button.click();
  expect(partClick).toHaveBeenCalledOnce();
  expect(consumerClick).toHaveBeenCalledOnce();
  expect(partRef.mock.calls[0]![0]).toBe(button.element());
  expect(consumerRef.mock.calls[0]![0]).toBe(button.element());
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect.element(page.getByRole('button', { name: 'renamed' })).toBeVisible();
});

it('notifies only changed selector slices and removes its store subscription', () => {
  const store = createStore({ selected: 1, other: 1 });
  const subscribe = vi.spyOn(store, 'subscribe');
  const changed = vi.fn();
  const dispose = createRoot(dispose => {
    const selected = useSelector(store, state => state.selected);
    createEffect(selected, changed);
    return dispose;
  });
  flush();
  expect(changed).toHaveBeenCalledOnce();
  store.setState(state => ({ ...state, other: 2 }));
  flush();
  expect(changed).toHaveBeenCalledOnce();
  store.setState(state => ({ ...state, selected: 2 }));
  flush();
  expect(changed).toHaveBeenCalledTimes(2);
  const unsubscribe = vi.spyOn(subscribe.mock.results[0]!.value, 'unsubscribe');
  dispose();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('reports a missing calendar provider', () => {
  expect(() =>
    createRoot(dispose => {
      try {
        useCalendarContext();
      } finally {
        dispose();
      }
    }),
  ).toThrow('parts must be rendered inside Calendar or CalendarProvider');
});
