import { For } from 'solid-js';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_DayGridLayout, Calendar_Views } from '@calendar-tsx/core';
import { dayGridView, timeGridView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/support/calendar.fixtures';
import { fixtures_allDay, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/support/calendar.fixtures';
import {
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowBackgroundEvent,
  DayGridViewRowEvent,
  DayGridViewSection,
} from '#views/day-grid/day-grid-view';
import { useCalendarContext, useCalendarSelector } from '#calendar/calendar';
import type { CalendarSolidSetup_Overrides } from '#tests/support/calendar.setup';
import { calendarSolidSetup_render } from '#tests/support/calendar.setup';

const MonthBody = (props: { onTriggerClick?: (event: MouseEvent) => void }) => {
  const { instance: calendar } = useCalendarContext();
  const month = useCalendarSelector(state => state.layout as Calendar_DayGridLayout<Fixtures_EventData>);

  return (
    <DayGridView model={month()}>
      <For each={month().sections}>
        {section => (
          <DayGridViewSection section={section}>
            <DayGridViewHeader>
              <For each={section.columns}>{column => <DayGridViewHeaderCell column={column} />}</For>
            </DayGridViewHeader>
            <For each={section.rows}>
              {week => (
                <DayGridViewRow row={week}>
                  <For each={week.days}>
                    {day => (
                      <DayGridViewDay day={day}>
                        <DayGridViewDayTrigger calendar={calendar} day={day} view='day' onClick={event => props.onTriggerClick?.(event)}>
                          {day.date.day}
                        </DayGridViewDayTrigger>
                        <DayGridViewOverflow day={day}>see all</DayGridViewOverflow>
                      </DayGridViewDay>
                    )}
                  </For>
                  <For each={week.backgroundEvents}>{segment => <DayGridViewRowBackgroundEvent segment={segment} />}</For>
                  <For each={week.segments}>{segment => <DayGridViewRowEvent segment={segment}>{segment.event.data.title}</DayGridViewRowEvent>}</For>
                </DayGridViewRow>
              )}
            </For>
          </DayGridViewSection>
        )}
      </For>
    </DayGridView>
  );
};

const setup = (overrides: CalendarSolidSetup_Overrides & { onTriggerClick?: (event: MouseEvent) => void } = {}) => {
  const { onTriggerClick, ...calendarOverrides } = overrides;
  const utils = calendarSolidSetup_render(() => <MonthBody onTriggerClick={onTriggerClick} />, {
    view: 'month',
    ...calendarOverrides,
  });

  const ui = {
    grid: page.getByRole('grid'),
    rows: page.getByRole('row'),
    cells: page.getByRole('gridcell'),
    dayTrigger: (label: string) => page.getByRole('button', { name: label, exact: true }),
    event: (title: string) => page.getByRole('button', { name: title, exact: true }),
    overflow: page.getByRole('button', { name: 'see all' }),
  };

  return { ...utils, ui };
};

it('exposes grid semantics and part attributes', async () => {
  const { ui } = setup();

  await expect.element(ui.grid).toHaveAttribute('data-scope', 'calendar');
  await expect.element(ui.grid).toHaveAttribute('data-part', 'day-grid-section');
  // header row + 5 weeks for March 2026
  expect(ui.rows.elements()).toHaveLength(6);
  expect(ui.cells.elements()).toHaveLength(35);
});

it('flags today and padding days', async () => {
  const { ui } = setup();
  const cells = ui.cells.elements();
  const cell = (date: string) => cells.find(element => element.getAttribute('data-date') === date);

  expect(cell('2026-03-11')?.hasAttribute('data-today')).toBe(true);
  expect(cell('2026-04-04')?.hasAttribute('data-outside')).toBe(true);
  expect(cell('2026-03-12')?.hasAttribute('data-today')).toBe(false);
});

it('positions bars with custom properties and marks continuations', async () => {
  const { ui } = setup({ events: [fixtures_allDay('Book Fair', { start: '2026-03-06', end: '2026-03-09' })] });
  const [first, second] = ui.event('Book Fair').elements();

  expect(first?.getAttribute('style')).toBe('--cal-col-start: 5; --cal-col-span: 2; --cal-row: 0;');
  expect(first?.hasAttribute('data-continues-after')).toBe(true);
  expect(second?.hasAttribute('data-continues-before')).toBe(true);
});

it('renders variable columns and resource state through the shared parts', async () => {
  const { ui } = setup({
    view: 'resource_days',
    views: { day: timeGridView({ days: 1 }), resource_days: dayGridView({ days: 3, groupBy: 'resource', maxEventsPerDay: 3 }) },
    resources: [fixtures_resource('a'), fixtures_resource('b')],
  });
  expect(ui.cells.elements()).toHaveLength(6);
  expect(ui.grid.element().getAttribute('style')).toContain('--cal-columns: 6');
  const headers = document.querySelectorAll('[data-part="day-grid-header-cell"]');
  expect([...headers].map(header => header.getAttribute('data-resource-id'))).toEqual(['a', 'a', 'a', 'b', 'b', 'b']);
  expect(ui.cells.elements().every(cell => cell.hasAttribute('data-unavailable'))).toBe(true);
});

it('renders month sections in the requested resource order', async () => {
  const { ui } = setup({
    view: 'months',
    views: { day: timeGridView({ days: 1 }), months: dayGridView({ months: 2, groupBy: ['resource', 'month'], maxEventsPerDay: 3 }) },
    resources: [fixtures_resource('b'), fixtures_resource('a')],
  });
  expect(ui.grid.elements()).toHaveLength(4);
  expect(ui.grid.elements().map(section => section.getAttribute('data-resource-id'))).toEqual(['b', 'b', 'a', 'a']);
  expect(ui.grid.elements().map(section => section.getAttribute('data-month'))).toEqual(['2026-03-01', '2026-04-01', '2026-03-01', '2026-04-01']);
});

it("flags all-day and multi-day bars and each day's weekday", async () => {
  const { ui } = setup({
    events: [
      fixtures_allDay('Book Fair', { start: '2026-03-17', end: '2026-03-18' }),
      fixtures_timed('Standup', { date: '2026-03-19', start: '09:00', end: '09:30' }),
    ],
  });
  const cell = (date: string) => ui.cells.elements().find(element => element.getAttribute('data-date') === date);

  await expect.element(ui.event('Book Fair')).toHaveAttribute('data-all-day', '');
  await expect.element(ui.event('Book Fair')).toHaveAttribute('data-multi-day', '');
  await expect.element(ui.event('Standup')).not.toHaveAttribute('data-all-day');
  await expect.element(ui.event('Standup')).not.toHaveAttribute('data-multi-day');
  expect(cell('2026-03-14')?.getAttribute('data-weekday')).toBe('6');
  expect(cell('2026-03-15')?.getAttribute('data-weekday')).toBe('7');
});

it('renders the overflow trigger only for days with more, with the hidden count', async () => {
  const events = ['09:00', '10:00', '11:00'].map((start, index) =>
    fixtures_timed(`Session ${index}`, { date: '2026-03-25', start, end: start.replace(':00', ':30') }),
  );
  const { ui } = setup({ events });

  expect(ui.overflow.elements()).toHaveLength(1);
  await expect.element(ui.overflow).toHaveAttribute('data-hidden-count', '1');
});

it('navigates to the day view from a day trigger with a default accessible label', async () => {
  const { ui, mocks } = setup();

  await ui.dayTrigger('Go to Saturday, March 14, 2026').click();

  expect(mocks.onNavigate).toHaveBeenCalledOnce();
  expect(mocks.onNavigate.mock.calls[0]?.[0]).toMatchObject({ view: 'day' });
  expect(mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-14');
});

it('skips the built-in navigation when the consumer prevents default', async () => {
  const onTriggerClick = vi.fn((event: MouseEvent) => event.preventDefault());
  const { ui, mocks } = setup({ onTriggerClick });

  await ui.dayTrigger('Go to Saturday, March 14, 2026').click();

  expect(onTriggerClick).toHaveBeenCalledOnce();
  expect(mocks.onNavigate).not.toHaveBeenCalled();
});

// cspell:ignore sábado marzo
it('labels triggers in the configured locale', async () => {
  const { ui } = setup({ locale: 'es-ES' });

  await expect.element(ui.dayTrigger('Go to sábado, 14 de marzo de 2026')).toBeInTheDocument();
});

const dayGridViews: Calendar_Views = {
  day: timeGridView({ days: 1 }),
  day_grid_week: dayGridView({ weeks: 1, maxEventsPerDay: 2 }),
  day_grid_four_weeks: dayGridView({ weeks: 4, maxEventsPerDay: 2 }),
  fixed_month: dayGridView({ period: 'month', maxEventsPerDay: 2, fixedWeekCount: true }),
};

it('renders a one-week day grid with the day-grid parts', async () => {
  const { ui } = setup({
    views: dayGridViews,
    view: 'day_grid_week',
    events: [fixtures_allDay('Fair', { start: '2026-03-10', end: '2026-03-12' })],
  });

  await expect.element(ui.grid).toHaveAttribute('data-part', 'day-grid-section');
  // header row + 1 week
  expect(ui.rows.elements()).toHaveLength(2);
  expect(ui.cells.elements()).toHaveLength(7);
  expect(ui.cells.elements().some(cell => cell.hasAttribute('data-outside'))).toBe(false);
  expect(ui.event('Fair').element().getAttribute('style')).toBe('--cal-col-start: 2; --cal-col-span: 3; --cal-row: 0;');
});

it('renders a rolling four-week day grid and a fixed six-week month', async () => {
  const fourWeeks = setup({ views: dayGridViews, view: 'day_grid_four_weeks' });

  await expect.element(fourWeeks.ui.grid).toBeInTheDocument();
  expect(fourWeeks.ui.rows.elements()).toHaveLength(5);
  fourWeeks.screen.unmount();

  const fixed = setup({ views: dayGridViews, view: 'fixed_month' });

  await expect.element(fixed.ui.grid).toBeInTheDocument();
  expect(fixed.ui.rows.elements()).toHaveLength(7);
  expect(fixed.ui.cells.elements()).toHaveLength(42);
});

it('positions all-day background events across the week row', async () => {
  await setup({ events: [fixtures_background(fixtures_allDay('Break', { start: '2026-03-06', end: '2026-03-09' }))] });
  const [first, second] = document.querySelectorAll('[data-part="day-grid-row-background-event"]');

  expect(first?.getAttribute('style')).toBe('--cal-col-start: 5; --cal-col-span: 2;');
  expect(first?.getAttribute('aria-hidden')).toBe('true');
  expect(first?.hasAttribute('data-continues-after')).toBe(true);
  expect(second?.hasAttribute('data-continues-before')).toBe(true);
});
