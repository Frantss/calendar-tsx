import { expect, it } from 'vitest';

import type { Calendar_MonthLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import {
  MonthView_Day,
  MonthView_DayTrigger,
  MonthView_Overflow,
  MonthView_Root,
  MonthView_Week,
  MonthView_WeekEvent,
  TimeGridView_Body,
  TimeGridView_Column,
  TimeGridView_ColumnHeader,
  TimeGridView_Event,
  TimeGridView_Header,
  TimeGridView_NowIndicator,
  TimeGridView_Root,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const TimeGrid = ({ eventClassName }: { eventClassName?: string }) => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView_Root model={grid}>
      <TimeGridView_Header>
        {grid.columns.map(column => (
          <TimeGridView_ColumnHeader key={column.key} column={column}>
            {column.date.day}
          </TimeGridView_ColumnHeader>
        ))}
      </TimeGridView_Header>
      <TimeGridView_Body model={grid}>
        {grid.columns.map(column => (
          <TimeGridView_Column key={column.key} column={column}>
            {column.segments.map(segment => (
              <TimeGridView_Event key={segment.key} segment={segment} className={eventClassName}>
                {segment.event.data.title}
              </TimeGridView_Event>
            ))}
            <TimeGridView_NowIndicator column={column} />
          </TimeGridView_Column>
        ))}
      </TimeGridView_Body>
    </TimeGridView_Root>
  );
};

const Month = () => {
  const month = useCalendarSelector(state => state.layout) as Calendar_MonthLayout<ThemesSetup_EventData>;

  return (
    <MonthView_Root model={month}>
      {month.weeks.map(week => (
        <MonthView_Week key={week.key} week={week}>
          {week.days.map(day => (
            <MonthView_Day key={day.key} day={day}>
              <MonthView_DayTrigger day={day} view='day'>
                {day.date.day}
              </MonthView_DayTrigger>
              <MonthView_Overflow day={day}>more</MonthView_Overflow>
            </MonthView_Day>
          ))}
          {week.segments.map(segment => (
            <MonthView_WeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthView_WeekEvent>
          ))}
        </MonthView_Week>
      ))}
    </MonthView_Root>
  );
};

const event = (title: string) => themesSetup_part('time-grid-event').find(element => element.textContent === title);

it('places a timed event at its fraction of the day', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const yoga = themesSetup_rect(event('Yoga'));

  expect(yoga.top - column.top).toBeCloseTo(column.height * 0.375, 0);
  expect(yoga.height).toBeCloseTo(column.height / 24, 0);
});

it('splits overlapping events into equal lanes', async () => {
  await themesSetup_render(<TimeGrid />, {
    events: [
      themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      themesSetup_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
    ],
  });
  const column = themesSetup_part('time-grid-column')[0];
  const pilates = themesSetup_rect(event('Pilates'));

  // lanes divide the column's padding box, inside its border
  expect(pilates.left - themesSetup_rect(column).left - (column?.clientLeft ?? 0)).toBeCloseTo((column?.clientWidth ?? 0) / 2, 0);
  expect(pilates.width).toBeCloseTo((column?.clientWidth ?? 0) / 2, 0);
});

it('lines column headers up with their columns', async () => {
  await themesSetup_render(<TimeGrid />, { view: 'week' });
  const headers = themesSetup_part('time-grid-column-header').map(header => themesSetup_rect(header).left);
  const columns = themesSetup_part('time-grid-column').map(column => themesSetup_rect(column).left);

  expect(headers).toHaveLength(7);
  expect(headers).toEqual(columns);
});

it('draws the now line at the clock time', async () => {
  await themesSetup_render(<TimeGrid />);
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const now = themesSetup_rect(themesSetup_part('time-grid-now')[0]);

  expect(now.top - column.top).toBeCloseTo(column.height * ((10 + 40 / 60) / 24), 0);
});

it('spans a month bar across the days it covers', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-10', end: '2026-03-12' })] });
  const first = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-10"]')[0]);
  const last = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-12"]')[0]);
  const bar = themesSetup_rect(themesSetup_part('month-week-event')[0]);

  expect(bar.left - first.left).toBeCloseTo(2, 0);
  expect(last.right - bar.right).toBeCloseTo(2, 0);
  expect(bar.top).toBeGreaterThanOrEqual(first.top);
});

it('keeps the overflow trigger below the visible bars', async () => {
  await themesSetup_render(<Month />, {
    view: 'month',
    events: ['A', 'B', 'C', 'D', 'E'].map(id => themesSetup_allDay(id, { start: '2026-03-11', end: '2026-03-11' })),
  });
  const bars = themesSetup_part('month-week-event').map(bar => themesSetup_rect(bar).bottom);
  const overflow = themesSetup_rect(themesSetup_part('month-overflow')[0]);

  expect(bars).toHaveLength(3);
  expect(overflow.top).toBeGreaterThanOrEqual(Math.max(...bars));
});

it.each([
  ['light', 'rgb(180, 68, 30)'],
  ['dark', 'rgb(240, 138, 93)'],
] as const)('marks today with the %s accent from color-scheme', async (colorScheme, accent) => {
  await themesSetup_render(<Month />, { view: 'month', colorScheme });
  const today = themesSetup_part('month-day', '[data-today]')[0]?.querySelector('[data-part="month-day-trigger"]');

  expect(today && getComputedStyle(today).backgroundColor).toBe(accent);
});

it('yields to unlayered consumer styles', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.consumer-event { background: rgb(1, 2, 3); }';

  await themesSetup_render(<TimeGrid eventClassName='consumer-event' />, {
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgb(1, 2, 3)');
  style.remove();
});
