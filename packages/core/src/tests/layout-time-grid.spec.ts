import { expect, it } from 'vitest';

import { timeGridView } from '#calendar-views';
import type { Calendar_TimeGridLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'day', ...overrides });
  const layout = utils.state().layout as Calendar_TimeGridLayout<unknown, null>;

  return {
    ...utils,
    layout,
    column: (key: string) => layout.columns.find(column => column.key === key),
    lanes: (key: string) =>
      layout.columns.find(column => column.key === key)?.segments.map(segment => `${segment.event.id}:${segment.lane}/${segment.lanes}`),
  };
};

it('places overlapping events side by side per overlap cluster', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
      fixtures_timed('spin', { date: '2026-03-11', start: '10:30', end: '11:30' }),
      fixtures_timed('swim', { date: '2026-03-11', start: '14:00', end: '15:00' }),
    ],
  });

  expect(utils.lanes('all:2026-03-11')).toEqual(['yoga:0/2', 'pilates:1/2', 'spin:0/2', 'swim:0/1']);
});

it('does not treat touching events as overlapping', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('a', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('b', { date: '2026-03-11', start: '10:00', end: '11:00' }),
    ],
  });

  expect(utils.lanes('all:2026-03-11')).toEqual(['a:0/1', 'b:0/1']);
});

it('positions events as fractions of the day', async () => {
  const utils = await setup({ events: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const segment = utils.column('all:2026-03-11')?.segments[0];

  expect(segment?.start).toBeCloseTo(0.375);
  expect(segment?.span).toBeCloseTo(1 / 24);
});

it('splits an event crossing midnight across columns and clips it in a single-day grid', async () => {
  const overnight = fixtures_timed('camp', { date: '2026-03-12', start: '20:00', end: '08:00', endDate: '2026-03-13' });
  const week = await setup({ view: 'week', events: [overnight] });

  expect(week.column('all:2026-03-12')?.segments[0]).toMatchObject({ continuesBefore: false, continuesAfter: true });
  expect(week.column('all:2026-03-13')?.segments[0]).toMatchObject({
    start: 0,
    continuesBefore: true,
    continuesAfter: false,
  });

  const day = await setup({ view: 'day', date: week.options.date.add({ days: 1 }), events: [overnight] });

  expect(day.layout.columns).toHaveLength(1);
  expect(day.column('all:2026-03-12')?.segments[0]?.continuesAfter).toBe(true);
});

it('shades the complement of a resource availability', async () => {
  const utils = await setup({
    view: 'resources',
    resources: [fixtures_resource('ana', [{ date: '2026-03-11', start: '09:00', end: '17:00' }])],
  });
  const shades = utils.column('ana:2026-03-11')?.unavailable.map(segment => [segment.start, segment.start + segment.span]);

  expect(shades?.[0]?.[0]).toBeCloseTo(0);
  expect(shades?.[0]?.[1]).toBeCloseTo(0.375);
  expect(shades?.[1]?.[0]).toBeCloseTo(17 / 24);
  expect(shades?.[1]?.[1]).toBeCloseTo(1);
  expect(utils.column('ana:2026-03-11')?.isUnavailable).toBe(false);
});

it('shades the whole column for a resource with no availability', async () => {
  const utils = await setup({ view: 'resources', resources: [fixtures_resource('room')] });

  expect(utils.column('room:2026-03-11')).toMatchObject({
    isUnavailable: true,
    unavailable: [expect.objectContaining({ start: 0, span: 1 })],
  });
});

it('clips availability that crosses midnight to each day', async () => {
  const resource = fixtures_resource('ana', [{ date: '2026-03-11', start: '22:00', end: '02:00', endDate: '2026-03-12' }]);
  const views = {
    ...calendarSetup_defaults.views,
    resources_week: timeGridView({ days: 7, groupBy: 'resource' }),
  };
  const utils = await setup({ view: 'resources_week', views, resources: [resource] });

  const lastShadeEnd = (key: string) => utils.column(key)?.unavailable.map(segment => segment.start + segment.span);

  expect(utils.column('ana:2026-03-11')?.unavailable).toHaveLength(1);
  expect(lastShadeEnd('ana:2026-03-11')?.[0]).toBeCloseTo(22 / 24);
  expect(utils.column('ana:2026-03-12')?.unavailable[0]?.start).toBeCloseTo(2 / 24);
});

it('shows an event in every resource column it references, in resource order', async () => {
  const utils = await setup({
    view: 'resources',
    resources: [fixtures_resource('ana'), fixtures_resource('room'), fixtures_resource('projector')],
    events: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['ana', 'room'] })],
  });

  expect(utils.layout.columns.map(column => `${column.resource?.id}:${column.segments.length}`)).toEqual(['ana:1', 'room:1', 'projector:0']);
});

it('orders grouped columns resource-first by default and date-first on request', async () => {
  const resources = [fixtures_resource('ana'), fixtures_resource('room')];
  const views = {
    ...calendarSetup_defaults.views,
    resource_first: timeGridView({ days: 2, groupBy: 'resource' }),
    date_first: timeGridView({ days: 2, groupBy: 'resource', groupOrder: 'date-first' }),
  };

  const resourceFirst = await setup({ view: 'resource_first', views, resources });
  const dateFirst = await setup({ view: 'date_first', views, resources });

  expect(resourceFirst.layout.columns.map(column => column.key)).toEqual(['ana:2026-03-11', 'ana:2026-03-12', 'room:2026-03-11', 'room:2026-03-12']);
  expect(dateFirst.layout.columns.map(column => column.key)).toEqual(['ana:2026-03-11', 'room:2026-03-11', 'ana:2026-03-12', 'room:2026-03-12']);
});

it('omits the all-day row when the view disables it', async () => {
  const utils = await setup({ view: 'resources', resources: [fixtures_resource('ana')] });

  expect(utils.layout.allDay).toBeUndefined();
});

it("places the now indicator only in today's column", async () => {
  const utils = await setup({ view: 'week' });
  const withNow = utils.layout.columns.filter(column => column.now !== undefined);

  expect(withNow.map(column => column.key)).toEqual(['all:2026-03-11']);
  expect(withNow[0]?.now).toBeCloseTo((10 + 40 / 60) / 24);
});

it('emits half-hour slots and the minimum column width', async () => {
  const views = { ...calendarSetup_defaults.views, week: timeGridView({ days: 7, minColumnWidth: '110px' }) };
  const utils = await setup({ view: 'week', views });

  expect(utils.layout.slots).toHaveLength(48);
  expect(utils.layout.slots[19]?.time.toString()).toBe('09:30:00');
  expect(utils.layout.minColumnWidth).toBe('110px');
});

it('shades a timed background event under the events without taking a lane', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_background(fixtures_timed('closed', { date: '2026-03-11', start: '09:00', end: '12:00' })),
      fixtures_background(fixtures_timed('elsewhere', { date: '2026-03-20', start: '09:00', end: '12:00' })),
    ],
  });
  const background = utils.column('all:2026-03-11')?.backgroundEvents;

  expect(utils.lanes('all:2026-03-11')).toEqual(['yoga:0/1']);
  expect(background?.map(segment => segment.key)).toEqual(['all:2026-03-11:background:closed']);
  expect(background?.[0]?.start).toBeCloseTo(9 / 24);
  expect(background?.[0]?.span).toBeCloseTo(3 / 24);
});

it('splits a background event crossing midnight across columns', async () => {
  const utils = await setup({
    view: 'week',
    events: [fixtures_background(fixtures_timed('night', { date: '2026-03-12', start: '22:00', end: '06:00', endDate: '2026-03-13' }))],
  });

  expect(utils.column('all:2026-03-12')?.backgroundEvents[0]).toMatchObject({ continuesBefore: false, continuesAfter: true });
  expect(utils.column('all:2026-03-13')?.backgroundEvents[0]).toMatchObject({ start: 0, continuesBefore: true, continuesAfter: false });
});

it('shades every resource column unless the background event names resources', async () => {
  const utils = await setup({
    view: 'resources',
    resources: [fixtures_resource('ana'), fixtures_resource('room')],
    events: [
      fixtures_background(fixtures_timed('closed', { date: '2026-03-11', start: '12:00', end: '13:00' })),
      fixtures_background(fixtures_timed('cleaning', { date: '2026-03-11', start: '08:00', end: '09:00', resourceIds: ['room'] })),
    ],
  });

  expect(utils.column('ana:2026-03-11')?.backgroundEvents.map(segment => segment.event.id)).toEqual(['closed']);
  expect(utils.column('room:2026-03-11')?.backgroundEvents.map(segment => segment.event.id)).toEqual(['closed', 'cleaning']);
});

it('spans an all-day background event across the all-day row and shades each whole column', async () => {
  const utils = await setup({
    view: 'week',
    events: [
      fixtures_allDay('fair', { start: '2026-03-12' }),
      fixtures_background(fixtures_allDay('break', { start: '2026-03-12', end: '2026-03-13' })),
    ],
  });

  expect(utils.layout.allDay?.backgroundEvents).toEqual([
    expect.objectContaining({ colStart: 4, colSpan: 2, continuesBefore: false, continuesAfter: false }),
  ]);
  expect(utils.layout.allDay?.rows).toBe(1);
  expect(utils.column('all:2026-03-12')?.backgroundEvents[0]).toMatchObject({ start: 0, span: 1, continuesAfter: true });
  expect(utils.column('all:2026-03-13')?.backgroundEvents[0]).toMatchObject({ continuesBefore: true, continuesAfter: false });
  expect(utils.column('all:2026-03-14')?.backgroundEvents).toEqual([]);
});
