import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_ListLayout, Calendar_Views } from '@calendar-tsx/core';
import { listView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timed, fixtures_resource } from '#tests/calendar.fixtures';
import { ListViewDay, ListViewDayHeader, ListViewEmpty, ListViewEvent, ListView, ListViewSection, ListViewSectionHeader } from '#list-view';
import { useCalendarSelector } from '#use-calendar';
import type { CalendarReactSetup_Overrides } from '#tests/calendar-react.setup';
import { calendarReactSetup_render } from '#tests/calendar-react.setup';

const ListBody = () => {
  const list = useCalendarSelector(state => state.layout) as Calendar_ListLayout<Fixtures_EventData>;

  return (
    <ListView model={list}>
      {list.sections.map(section => (
        <ListViewSection key={section.key} section={section} aria-label={section.resource?.title ?? section.date?.toString()}>
          {(section.resource || section.date) && (
            <ListViewSectionHeader section={section}>{section.resource?.title ?? section.date?.toString()}</ListViewSectionHeader>
          )}
          {section.days.map(day => (
            <ListViewDay key={day.key} day={day}>
              <ListViewDayHeader day={day}>{section.date ? day.resource?.title : day.date.toString()}</ListViewDayHeader>
              {day.events.map(event => (
                <ListViewEvent key={event.id} event={event}>
                  {event.data.title}
                </ListViewEvent>
              ))}
            </ListViewDay>
          ))}
        </ListViewSection>
      ))}
      <ListViewEmpty>Nothing scheduled</ListViewEmpty>
    </ListView>
  );
};

const setup = async (overrides: CalendarReactSetup_Overrides = {}) => {
  const utils = await calendarReactSetup_render(<ListBody />, { view: 'list_week', ...overrides });

  const ui = {
    region: page.getByRole('region', { name: 'Event list' }),
    headings: page.getByRole('heading', { level: 3 }),
    event: (title: string) => page.getByRole('button', { name: title }),
    empty: page.getByText('Nothing scheduled'),
  };

  return { ...utils, ui };
};

it('renders days with events and hides the empty part', async () => {
  const { ui } = await setup({
    events: [fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });

  await expect.element(ui.region).toHaveAttribute('data-part', 'list-root');
  await expect.element(ui.event('Yoga')).toHaveAttribute('data-part', 'list-event');
  expect(ui.headings.elements().map(heading => heading.textContent)).toEqual(['2026-03-11']);
  await expect.element(ui.empty).not.toBeInTheDocument();
});

it('renders the empty part when the range has no events', async () => {
  const { ui } = await setup({ date: Temporal.PlainDate.from('2026-04-15') });

  await expect.element(ui.empty).toHaveAttribute('data-part', 'list-empty');
});

it('renders a calendar-month list with the list parts', async () => {
  const views: Calendar_Views = { list_week: listView({ days: 7 }), list_month: listView({ period: 'month' }) };
  const { ui } = await setup({
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

it('renders resource sections with dates and shared events', async () => {
  const { ui } = await setup({
    views: { grouped: listView({ weeks: 1, groupBy: 'resource' }) },
    view: 'grouped',
    resources: [fixtures_resource('B'), fixtures_resource('A')],
    events: [fixtures_timed('Shared', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['A', 'B'] })],
  });
  expect(
    page
      .getByRole('heading', { level: 2 })
      .elements()
      .map(el => el.textContent),
  ).toEqual(['B', 'A']);
  expect(ui.headings.elements().map(el => el.textContent)).toEqual(['2026-03-11', '2026-03-11']);
  await expect.element(page.getByRole('region', { name: 'B', exact: true })).toHaveAttribute('data-resource-id', 'B');
  expect(ui.event('Shared').elements()).toHaveLength(2);
  await expect.element(ui.empty).not.toBeInTheDocument();
  expect([...document.querySelectorAll('[data-part="list-day"]')].map(el => el.getAttribute('data-resource-id'))).toEqual(['B', 'A']);
});

it('renders date sections before resource headings', async () => {
  const { ui } = await setup({
    views: { grouped: listView({ weeks: 1, groupBy: ['date', 'resource'] }) },
    view: 'grouped',
    resources: [fixtures_resource('A')],
    events: [fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['A'] })],
  });
  await expect.element(page.getByRole('heading', { level: 2, name: '2026-03-11' })).toHaveAttribute('data-part', 'list-section-header');
  await expect.element(page.getByRole('region', { name: '2026-03-11' })).toHaveAttribute('data-date', '2026-03-11');
  expect(ui.headings.elements().map(el => el.textContent)).toEqual(['A']);
});

it('renders one empty state when input events match no resource', async () => {
  const { ui } = await setup({
    views: { grouped: listView({ weeks: 1, groupBy: 'resource' }) },
    view: 'grouped',
    resources: [fixtures_resource('A')],
    events: [fixtures_timed('Unassigned', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  await expect.element(ui.empty).toBeVisible();
  expect(document.querySelectorAll('[data-part="list-section"]')).toHaveLength(0);
});
