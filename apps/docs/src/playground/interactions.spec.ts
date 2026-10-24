import { createCalendar } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { defaultPlaygroundConfig, parsePlaygroundConfig, serializePlaygroundConfig } from './config';
import { applyChanges, createPlaygroundFeatures, defaultInteractions, parseChanges, restoreEvent, storeEvent } from './interactions';
import { createPlaygroundViews } from './views';

const date = '2026-10-23';
const start = Temporal.ZonedDateTime.from(`${date}T10:00[UTC]`);
const event = { id: 'a', kind: 'timed' as const, start, end: start.add({ hours: 1 }), resourceIds: ['room-a', 'room-b'], data: { title: 'Booking' } };

it('round-trips interaction settings and edits without losing offsets, durations or rooms', () => {
  const config = {
    ...defaultPlaygroundConfig(date),
    interactions: { ...defaultInteractions, resizing: true, crossCalendar: true },
    changes: [storeEvent({ ...event, end: start.add({ days: 3, nanoseconds: 7 }) }, 'secondary')],
  };
  const restored = parsePlaygroundConfig(serializePlaygroundConfig(config), date);
  expect(restored).toEqual(config);
  const result = restoreEvent(restored.changes[0]);
  expect(result.end?.equals(start.add({ days: 3, nanoseconds: 7 }))).toBe(true);
  expect(result.resourceIds).toEqual(['room-a', 'room-b']);
});

it('rejects malformed shared-link edits and keeps inclusive all-day ends', () => {
  const allDay = storeEvent({ ...event, kind: 'allDay', start: start.toPlainDate(), end: start.toPlainDate() }, 'primary');
  expect(parseChanges([allDay, { ...allDay, id: 'bad', end: 'bad' }, { ...allDay, id: 'backward', end: '2026-10-22' }])).toEqual([allDay]);
  expect(parsePlaygroundConfig('#interactions={"movement":"true","unknown":true}', date).interactions).toEqual(defaultInteractions);
});

it('applies a transfer once, hides the source and restores the destination after sharing', () => {
  const change = storeEvent(event, 'secondary');
  expect(applyChanges([event], [change], 'primary')).toEqual([]);
  const received = applyChanges([event], [change], 'secondary');
  expect(received).toHaveLength(1);
  expect(received[0].start.equals(event.start)).toBe(true);
  expect(applyChanges([event], [], 'primary')).toEqual([event]);
});

it.each(['selection', 'movement', 'resizing'] as const)('registers %s independently in the playground', operation => {
  const features = createPlaygroundFeatures({ ...defaultInteractions, [operation]: true });
  const calendar = createCalendar({
    features,
    views: createPlaygroundViews(defaultPlaygroundConfig(date)),
    view: 'day',
    date: start.toPlainDate(),
    timeZone: 'UTC',
    events: [event],
    onNavigate: () => {},
  });
  for (const [key, api] of [
    ['selection', 'selection'],
    ['movement', 'move'],
    ['resizing', 'resize'],
  ])
    expect(api! in calendar.api).toBe(key === operation);
  expect('selectedRange' in calendar.store.state).toBe(operation === 'selection');
});
