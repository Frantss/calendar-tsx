import { expect, it } from 'vitest';

import { createEventStore } from '#events/store';
import { fixtures_timed } from '#tests/support/calendar.fixtures';
import { calendarSetup_create } from '#tests/support/calendar.setup';

const defaults = {
  initial: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
};

const setup = async () => {
  const store = createEventStore(defaults.initial);

  return { store, ids: () => store.store.state.events.map(event => event.id) };
};

it('upserts by id on add', async () => {
  const utils = await setup();

  utils.store.add([
    { ...fixtures_timed('yoga', { date: '2026-03-11', start: '11:00', end: '12:00' }), data: { title: 'moved' } },
    fixtures_timed('swim', { date: '2026-03-11', start: '14:00', end: '15:00' }),
  ]);

  expect(utils.ids()).toEqual(['yoga', 'swim']);
  expect(utils.store.store.state.events[0]?.data.title).toBe('moved');
});

it('removes, updates and resets events', async () => {
  const utils = await setup();

  utils.store.update('yoga', event => ({ ...event, data: { title: 'renamed' } }));
  expect(utils.store.store.state.events[0]?.data.title).toBe('renamed');

  utils.store.remove('yoga');
  expect(utils.ids()).toEqual([]);

  utils.store.reset(defaults.initial);
  expect(utils.ids()).toEqual(['yoga']);
});

it('feeds the calendar as ordinary input', async () => {
  const utils = await setup();
  const calendar = await calendarSetup_create({ view: 'list_week', events: utils.store.store.state.events });

  const layout = calendar.state().layout;

  expect(layout.kind === 'list' ? layout.days[0]?.events.map(event => event.id) : []).toEqual(['yoga']);
});
