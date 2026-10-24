import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { dayGridView } from '#views/views';
import type { Calendar_DayGridLayout } from '#layouts/day-grid/day-grid.types';
import { fixtures_allDay, fixtures_timed } from '#tests/support/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/support/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/support/calendar.setup';

const views = {
  ...calendarSetup_defaults.views,
  day_grid_week: dayGridView({ weeks: 1, maxEventsPerDay: Infinity }),
  day_grid_four_weeks: dayGridView({ weeks: 4, maxEventsPerDay: 2 }),
};

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'day_grid_week', views, ...overrides });
  const layout = utils.state().layout as Calendar_DayGridLayout<unknown>;

  return { ...utils, layout, days: layout.sections.flatMap(section => section.rows).flatMap(week => week.days) };
};

it('shows one week from the first day of the week, with no outside days', async () => {
  const utils = await setup();

  expect(utils.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-03-08'), end: Temporal.PlainDate.from('2026-03-14') });
  expect(utils.state().context.period).toEqual(utils.state().context.range);
  expect(utils.layout.sections.flatMap(section => section.rows)).toHaveLength(1);
  expect(utils.days.some(day => day.isOutside)).toBe(false);
  expect(utils.days.find(day => day.isToday)?.key).toBe('2026-03-11');
});

it('steps by the number of weeks', async () => {
  const week = await setup();

  week.instance.api.next();

  expect(week.mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-18');

  const fourWeeks = await setup({ view: 'day_grid_four_weeks' });

  fourWeeks.instance.api.prev();

  expect(fourWeeks.mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-02-11');
});

it('shows four weeks from the week of the date', async () => {
  const utils = await setup({ view: 'day_grid_four_weeks' });

  expect(utils.layout.sections.flatMap(section => section.rows).map(week => week.key)).toEqual([
    '2026-03-08',
    '2026-03-15',
    '2026-03-22',
    '2026-03-29',
  ]);
  expect(utils.days.some(day => day.isOutside)).toBe(false);
});

it('lays events out as day-grid bars and applies the row cap', async () => {
  const events = [
    fixtures_allDay('fair', { start: '2026-03-10', end: '2026-03-12' }),
    ...['a', 'b', 'c'].map(id => fixtures_timed(id, { date: '2026-03-11', start: '09:00', end: '10:00' })),
  ];
  const uncapped = await setup({ events });
  const capped = await setup({ view: 'day_grid_four_weeks', events });

  expect(uncapped.layout.sections.flatMap(section => section.rows)[0]?.segments.find(segment => segment.event.id === 'fair')).toMatchObject({
    colStart: 2,
    colSpan: 3,
  });
  expect(uncapped.layout.sections.flatMap(section => section.rows)[0]?.stackCount).toBe(4);
  expect(capped.days.find(day => day.key === '2026-03-11')).toMatchObject({ hiddenCount: 2, hasMore: true });
});

it.each(['month', 'day_grid_week', 'day_grid_four_weeks'])('reports dayGrid for the view and layout kinds in %s', async view => {
  const utils = await setup({ view });

  expect(utils.state().context.kind).toBe('dayGrid');
  expect(utils.layout.kind).toBe('dayGrid');
});

it('takes either a month period or weeks, with fixedWeekCount only for months', () => {
  // @ts-expect-error -- a day grid needs a period or a week count (D43)
  expect(() => dayGridView({ maxEventsPerDay: 4 })).toThrow('provide exactly one');

  // @ts-expect-error -- period and weeks are exclusive (D43)
  expect(() => dayGridView({ period: 'month', weeks: 4, maxEventsPerDay: 4 })).toThrow('provide exactly one');

  // @ts-expect-error -- fixedWeekCount applies only to calendar months (D43)
  expect(() => dayGridView({ weeks: 4, fixedWeekCount: true, maxEventsPerDay: 4 })).toThrow('individual month grids');

  // @ts-expect-error -- even false is not a setting on the weeks form (D43)
  expect(() => dayGridView({ weeks: 4, fixedWeekCount: false, maxEventsPerDay: 4 })).toThrow('individual month grids');
});
