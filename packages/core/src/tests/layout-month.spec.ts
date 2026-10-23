import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { monthView } from '#calendar-views';
import type { Calendar_MonthLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_background, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'month', ...overrides });
  const layout = utils.state().layout as Calendar_MonthLayout<unknown>;
  const days = layout.weeks.flatMap(week => week.days);

  return {
    ...utils,
    layout,
    day: (date: string) => days.find(day => day.key === date),
    week: (date: string) => layout.weeks.find(week => week.days.some(day => day.key === date)),
  };
};

const busyDay = (count: number, date = '2026-03-25') =>
  Array.from({ length: count }, (_, index) =>
    fixtures_timed(`e${index}`, {
      date,
      start: `${String(9 + index).padStart(2, '0')}:00`,
      end: `${String(9 + index).padStart(2, '0')}:30`,
    }),
  );

it('caps rows per day and reports the hidden count', async () => {
  const utils = await setup({ events: busyDay(6) });

  expect(utils.day('2026-03-25')).toMatchObject({ hiddenCount: 2, hasMore: true });
  expect(utils.week('2026-03-25')?.segments).toHaveLength(4);
  expect(utils.week('2026-03-25')?.rows).toBe(4);
});

it('renders a multi-day event as one bar in its week row', async () => {
  const utils = await setup({ events: [fixtures_allDay('retreat', { start: '2026-03-17', end: '2026-03-19' })] });

  expect(utils.week('2026-03-17')?.segments).toEqual([
    expect.objectContaining({ colStart: 2, colSpan: 3, row: 0, continuesBefore: false, continuesAfter: false }),
  ]);
});

it('splits a bar at week boundaries and marks the continuation', async () => {
  const utils = await setup({ events: [fixtures_allDay('fair', { start: '2026-03-06', end: '2026-03-09' })] });

  expect(utils.week('2026-03-06')?.segments[0]).toMatchObject({ colStart: 5, colSpan: 2, continuesAfter: true });
  expect(utils.week('2026-03-09')?.segments[0]).toMatchObject({ colStart: 0, colSpan: 2, continuesBefore: true });
});

it('counts a hidden bar on every day it crosses', async () => {
  const events = [...busyDay(4, '2026-03-17'), fixtures_allDay('retreat', { start: '2026-03-16', end: '2026-03-18' })];
  const utils = await setup({ events });

  // the retreat sorts first and takes row 0, so the fifth row on the 17th is a single-day event
  expect(utils.day('2026-03-16')?.hiddenCount).toBe(0);
  expect(utils.day('2026-03-17')?.hiddenCount).toBe(1);

  // ordered last, the retreat lands in row 4 and is hidden on all three days, even where rows are free
  const crowded = await setup({
    events: [...busyDay(4, '2026-03-16'), fixtures_allDay('late-retreat', { start: '2026-03-16', end: '2026-03-18' })],
    eventOrder: (a, b) => (a.id === 'late-retreat' ? 1 : b.id === 'late-retreat' ? -1 : a.id.localeCompare(b.id)),
  });

  expect(['2026-03-16', '2026-03-17', '2026-03-18'].map(date => crowded.day(date)?.hiddenCount)).toEqual([1, 1, 1]);
});

it('raises hasMore from the dayOverflow hint without changing the local count', async () => {
  const views = {
    ...calendarSetup_defaults.views,
    month: monthView({ maxEventsPerDay: 4, dayOverflow: date => date.day === 25 }),
  };
  const utils = await setup({ views, events: busyDay(2) });

  expect(utils.day('2026-03-25')).toMatchObject({ hiddenCount: 0, hasMore: true });
  expect(utils.day('2026-03-24')).toMatchObject({ hasMore: false });
});

it('lists every event touching a day for the overflow popover', async () => {
  const utils = await setup({ events: busyDay(6) });

  expect(utils.day('2026-03-25')?.events.map(event => event.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4', 'e5']);
});

it('marks padding days and today', async () => {
  const utils = await setup({ date: Temporal.PlainDate.from('2026-03-11') });

  expect(utils.day('2026-04-04')).toMatchObject({ isOutside: true });
  expect(utils.day('2026-03-11')).toMatchObject({ isToday: true, isOutside: false });
  expect(utils.layout.weekdays.map(weekday => weekday.dayOfWeek)).toEqual([7, 1, 2, 3, 4, 5, 6]);
});

it('shows six weeks with fixedWeekCount and pads them as outside days', async () => {
  const views = { ...calendarSetup_defaults.views, fixed: monthView({ maxEventsPerDay: 4, fixedWeekCount: true }) };
  const february = Temporal.PlainDate.from('2026-02-11');
  const variable = await setup({ date: february });
  const fixed = await setup({ view: 'fixed', views, date: february });

  expect(variable.layout.weeks).toHaveLength(4);
  expect(fixed.layout.weeks).toHaveLength(6);
  expect(fixed.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-02-01'), end: Temporal.PlainDate.from('2026-03-14') });
  expect(fixed.day('2026-02-28')?.isOutside).toBe(false);
  expect(fixed.day('2026-03-01')?.isOutside).toBe(true);
  expect(fixed.day('2026-03-14')?.isOutside).toBe(true);
});

it('spans all-day background events across week rows without taking rows', async () => {
  const utils = await setup({
    events: [
      ...busyDay(6),
      fixtures_background(fixtures_allDay('break', { start: '2026-03-20', end: '2026-03-25' })),
      fixtures_background(fixtures_timed('closed', { date: '2026-03-25', start: '12:00', end: '13:00' })),
    ],
  });

  expect(utils.week('2026-03-20')?.backgroundEvents).toEqual([
    expect.objectContaining({ colStart: 5, colSpan: 2, continuesBefore: false, continuesAfter: true }),
  ]);
  expect(utils.week('2026-03-25')?.backgroundEvents).toEqual([
    expect.objectContaining({ colStart: 0, colSpan: 4, continuesBefore: true, continuesAfter: false }),
  ]);
  expect(utils.week('2026-03-25')?.rows).toBe(4);
  expect(utils.day('2026-03-25')?.hiddenCount).toBe(2);
});
