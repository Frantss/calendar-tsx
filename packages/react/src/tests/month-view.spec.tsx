import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_MonthLayout } from '@calendar-tsx/core';
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
import type { CalendarReactSetup_Overrides } from '#tests/calendar-react.setup';
import { calendarReactSetup_render } from '#tests/calendar-react.setup';

const MonthBody = ({ onTriggerClick }: { onTriggerClick?: (event: React.MouseEvent) => void }) => {
  const month = useCalendarSelector(state => state.layout) as Calendar_MonthLayout<Fixtures_EventData>;

  return (
    <MonthView model={month}>
      <MonthViewHeader>
        {month.weekdays.map(weekday => (
          <MonthViewHeaderCell key={weekday.dayOfWeek} weekday={weekday} />
        ))}
      </MonthViewHeader>
      {month.weeks.map(week => (
        <MonthViewWeek key={week.key} week={week}>
          {week.days.map(day => (
            <MonthViewDay key={day.key} day={day}>
              <MonthViewDayTrigger day={day} view='day' onClick={onTriggerClick}>
                {day.date.day}
              </MonthViewDayTrigger>
              <MonthViewOverflow day={day}>see all</MonthViewOverflow>
            </MonthViewDay>
          ))}
          {week.segments.map(segment => (
            <MonthViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthViewWeekEvent>
          ))}
        </MonthViewWeek>
      ))}
    </MonthView>
  );
};

const setup = async (overrides: CalendarReactSetup_Overrides & { onTriggerClick?: (event: React.MouseEvent) => void } = {}) => {
  const { onTriggerClick, ...calendarOverrides } = overrides;
  const utils = await calendarReactSetup_render(<MonthBody onTriggerClick={onTriggerClick} />, {
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
  const { ui } = await setup();

  await expect.element(ui.grid).toHaveAttribute('data-scope', 'calendar');
  await expect.element(ui.grid).toHaveAttribute('data-part', 'month-root');
  // header row + 5 weeks for March 2026
  expect(ui.rows.elements()).toHaveLength(6);
  expect(ui.cells.elements()).toHaveLength(35);
});

it('flags today and padding days', async () => {
  const { ui } = await setup();
  const cells = ui.cells.elements();
  const cell = (date: string) => cells.find(element => element.getAttribute('data-date') === date);

  expect(cell('2026-03-11')?.hasAttribute('data-today')).toBe(true);
  expect(cell('2026-04-04')?.hasAttribute('data-outside')).toBe(true);
  expect(cell('2026-03-12')?.hasAttribute('data-today')).toBe(false);
});

it('positions bars with custom properties and marks continuations', async () => {
  const { ui } = await setup({ events: [fixtures_allDay('Book Fair', { start: '2026-03-06', end: '2026-03-09' })] });
  const [first, second] = ui.event('Book Fair').elements();

  expect(first?.getAttribute('style')).toBe('--cal-col-start: 5; --cal-col-span: 2; --cal-row: 0;');
  expect(first?.hasAttribute('data-continues-after')).toBe(true);
  expect(second?.hasAttribute('data-continues-before')).toBe(true);
});

it('renders the overflow trigger only for days with more, with the hidden count', async () => {
  const events = ['09:00', '10:00', '11:00'].map((start, index) =>
    fixtures_timed(`Session ${index}`, { date: '2026-03-25', start, end: start.replace(':00', ':30') }),
  );
  const { ui } = await setup({ events });

  expect(ui.overflow.elements()).toHaveLength(1);
  await expect.element(ui.overflow).toHaveAttribute('data-hidden-count', '1');
});

it('navigates to the day view from a day trigger with a default accessible label', async () => {
  const { ui, mocks } = await setup();

  await ui.dayTrigger('Go to Saturday, March 14, 2026').click();

  expect(mocks.onNavigate).toHaveBeenCalledOnce();
  expect(mocks.onNavigate.mock.calls[0]?.[0]).toMatchObject({ view: 'day' });
  expect(mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-14');
});

it('skips the built-in navigation when the consumer prevents default', async () => {
  const onTriggerClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
  const { ui, mocks } = await setup({ onTriggerClick });

  await ui.dayTrigger('Go to Saturday, March 14, 2026').click();

  expect(onTriggerClick).toHaveBeenCalledOnce();
  expect(mocks.onNavigate).not.toHaveBeenCalled();
});

// cspell:ignore sábado marzo
it('labels triggers in the configured locale', async () => {
  const { ui } = await setup({ locale: 'es-ES' });

  await expect.element(ui.dayTrigger('Go to sábado, 14 de marzo de 2026')).toBeInTheDocument();
});
