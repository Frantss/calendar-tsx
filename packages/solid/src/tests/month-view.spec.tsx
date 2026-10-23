import { For } from 'solid-js';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_MonthLayout, Calendar_Views } from '@calendar-tsx/core';
import { dayGridView, monthView, timeGridView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_allDay, fixtures_timed } from '#tests/calendar.fixtures';
import {
  MonthViewDay,
  MonthViewDayTrigger,
  MonthViewHeader,
  MonthViewHeaderCell,
  MonthViewOverflow,
  MonthView,
  MonthViewWeek,
  MonthViewWeekEvent,
} from '#month-view';
import { useCalendarSelector } from '#use-calendar';
import type { CalendarSolidSetup_Overrides } from '#tests/calendar-solid.setup';
import { calendarSolidSetup_render } from '#tests/calendar-solid.setup';

const MonthBody = (props: { onTriggerClick?: (event: MouseEvent) => void }) => {
  const month = useCalendarSelector(state => state.layout as Calendar_MonthLayout<Fixtures_EventData>);

  return (
    <MonthView model={month()}>
      <MonthViewHeader>
        <For each={month().weekdays}>{weekday => <MonthViewHeaderCell weekday={weekday} />}</For>
      </MonthViewHeader>
      <For each={month().weeks}>
        {week => (
          <MonthViewWeek week={week}>
            <For each={week.days}>
              {day => (
                <MonthViewDay day={day}>
                  <MonthViewDayTrigger day={day} view='day' onClick={event => props.onTriggerClick?.(event)}>
                    {day.date.day}
                  </MonthViewDayTrigger>
                  <MonthViewOverflow day={day}>see all</MonthViewOverflow>
                </MonthViewDay>
              )}
            </For>
            <For each={week.segments}>{segment => <MonthViewWeekEvent segment={segment}>{segment.event.data.title}</MonthViewWeekEvent>}</For>
          </MonthViewWeek>
        )}
      </For>
    </MonthView>
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
  await expect.element(ui.grid).toHaveAttribute('data-part', 'month-root');
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
  fixed_month: monthView({ maxEventsPerDay: 2, fixedWeekCount: true }),
};

it('renders a one-week day grid with the month parts', async () => {
  const { ui } = setup({
    views: dayGridViews,
    view: 'day_grid_week',
    events: [fixtures_allDay('Fair', { start: '2026-03-10', end: '2026-03-12' })],
  });

  await expect.element(ui.grid).toHaveAttribute('data-part', 'month-root');
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
