import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import type { Calendar_ListLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create } from '#tests/calendar.setup';

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
