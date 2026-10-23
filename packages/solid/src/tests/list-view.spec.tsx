import { For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_ListLayout, Calendar_Views } from '@calendar-tsx/core';
import { listView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timed } from '#tests/calendar.fixtures';
import { ListViewDay, ListViewDayHeader, ListViewEmpty, ListViewEvent, ListView } from '#list-view';
import { useCalendarSelector } from '#use-calendar';
import type { CalendarSolidSetup_Overrides } from '#tests/calendar-solid.setup';
import { calendarSolidSetup_render } from '#tests/calendar-solid.setup';

const ListBody = () => {
  const list = useCalendarSelector(state => state.layout as Calendar_ListLayout<Fixtures_EventData>);

  return (
    <ListView model={list()}>
      <For each={list().days}>
        {day => (
          <ListViewDay day={day}>
            <ListViewDayHeader day={day}>{day.key}</ListViewDayHeader>
            <For each={day.events}>{event => <ListViewEvent event={event}>{event.data.title}</ListViewEvent>}</For>
          </ListViewDay>
        )}
      </For>
      <ListViewEmpty>Nothing scheduled</ListViewEmpty>
    </ListView>
  );
};

const setup = (overrides: CalendarSolidSetup_Overrides = {}) => {
  const utils = calendarSolidSetup_render(() => <ListBody />, { view: 'list_week', ...overrides });

  const ui = {
    region: page.getByRole('region', { name: 'Event list' }),
    headings: page.getByRole('heading', { level: 3 }),
    event: (title: string) => page.getByRole('button', { name: title }),
    empty: page.getByText('Nothing scheduled'),
  };

  return { ...utils, ui };
};

it('renders days with events and hides the empty part', async () => {
  const { ui } = setup({
    events: [fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });

  await expect.element(ui.region).toHaveAttribute('data-part', 'list-root');
  await expect.element(ui.event('Yoga')).toHaveAttribute('data-part', 'list-event');
  expect(ui.headings.elements().map(heading => heading.textContent)).toEqual(['2026-03-11']);
  await expect.element(ui.empty).not.toBeInTheDocument();
});

it('renders the empty part when the range has no events', async () => {
  const { ui } = setup({ date: Temporal.PlainDate.from('2026-04-15') });

  await expect.element(ui.empty).toHaveAttribute('data-part', 'list-empty');
});

it('renders a calendar-month list with the list parts', async () => {
  const views: Calendar_Views = { list_week: listView({ days: 7 }), list_month: listView({ period: 'month' }) };
  const { ui } = setup({
    views,
    view: 'list_month',
    events: [
      fixtures_timed('Yoga', { date: '2026-03-02', start: '09:00', end: '10:00' }),
      fixtures_timed('Swim', { date: '2026-03-30', start: '09:00', end: '10:00' }),
      fixtures_timed('Run', { date: '2026-04-01', start: '09:00', end: '10:00' }),
    ],
  });

  await expect.element(ui.event('Swim')).toHaveAttribute('data-part', 'list-event');
  expect(ui.headings.elements().map(heading => heading.textContent)).toEqual(['2026-03-02', '2026-03-30']);
});
