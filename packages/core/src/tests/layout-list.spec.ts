import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { listView } from '#calendar-views';
import type { Calendar_ListLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'list_week', ...overrides });

  return { ...utils, layout: utils.state().layout as Calendar_ListLayout<unknown> };
};

it('lists only days with events, in order', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('swim', { date: '2026-03-13', start: '14:00', end: '15:00' }),
      fixtures_timed('yoga', { date: '2026-03-09', start: '09:00', end: '10:00' }),
      fixtures_allDay('fair', { start: '2026-03-12', end: '2026-03-13' }),
    ],
  });

  expect(utils.layout.days.map(day => `${day.key}:${day.events.map(event => event.id).join(',')}`)).toEqual([
    '2026-03-09:yoga',
    '2026-03-12:fair',
    '2026-03-13:fair,swim',
  ]);
});

it('has no days when the range has no events', async () => {
  const utils = await setup({ date: Temporal.PlainDate.from('2026-04-15') });

  expect(utils.layout.days).toEqual([]);
});

const periodViews = {
  ...calendarSetup_defaults.views,
  list_month: listView({ period: 'month' }),
  list_year: listView({ period: 'year' }),
};

it('lists the calendar month containing the date and steps to the next 1st', async () => {
  const utils = await setup({
    view: 'list_month',
    views: periodViews,
    events: [
      fixtures_timed('feb', { date: '2026-02-28', start: '09:00', end: '10:00' }),
      fixtures_timed('first', { date: '2026-03-01', start: '09:00', end: '10:00' }),
      fixtures_timed('last', { date: '2026-03-31', start: '09:00', end: '10:00' }),
      fixtures_timed('apr', { date: '2026-04-01', start: '09:00', end: '10:00' }),
    ],
  });

  expect(utils.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-03-01'), end: Temporal.PlainDate.from('2026-03-31') });
  expect(utils.layout.days.map(day => day.key)).toEqual(['2026-03-01', '2026-03-31']);

  utils.instance.api.next();
  utils.instance.api.prev();

  expect(utils.mocks.onNavigate.mock.calls.map(([next]) => next.date.toString())).toEqual(['2026-04-01', '2026-02-01']);
});

it('lists the calendar year containing the date and steps to the next 1 January', async () => {
  const utils = await setup({
    view: 'list_year',
    views: periodViews,
    events: [
      fixtures_allDay('new-year', { start: '2025-12-31', end: '2026-01-01' }),
      fixtures_timed('summer', { date: '2026-07-14', start: '09:00', end: '10:00' }),
      fixtures_timed('later', { date: '2027-01-01', start: '09:00', end: '10:00' }),
    ],
  });

  expect(utils.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-01-01'), end: Temporal.PlainDate.from('2026-12-31') });
  expect(utils.layout.days.map(day => day.key)).toEqual(['2026-01-01', '2026-07-14']);

  utils.instance.api.next();

  expect(utils.mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2027-01-01');
});

it('takes either days or a period, not both', () => {
  // @ts-expect-error -- `days` and `period` are exclusive (D35)
  listView({ days: 7, period: 'month' });
});
