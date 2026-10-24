import { createCalendar, fixedClock } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { defaultPlaygroundConfig, parsePlaygroundConfig, serializePlaygroundConfig } from './config';
import { createPlaygroundViews } from './views';

const date = '2026-03-11';

it('round-trips geometry controls through a shared playground link', () => {
  const config = {
    ...defaultPlaygroundConfig(date),
    minColumnWidth: 480,
    hiddenDays: [6, 7] as const,
    visibleStart: '22:00',
    visibleEnd: '06:00',
  };

  expect(parsePlaygroundConfig(serializePlaygroundConfig(config), date)).toEqual(config);
});

it('rejects invalid geometry in hand-edited links and normalizes duplicate hidden weekdays', () => {
  const invalid = parsePlaygroundConfig('#minWidth=-1&hidden=1,2,3,4,5,6,7&from=25:00&until=bad', date);
  expect(invalid).toMatchObject({ minColumnWidth: 0, hiddenDays: [], visibleStart: '00:00', visibleEnd: '00:00' });
  expect(parsePlaygroundConfig('#hidden=7,6,7', date).hiddenDays).toEqual([6, 7]);
  expect(parsePlaygroundConfig('#hidden=6,8', date).hiddenDays).toEqual([]);
  expect(parsePlaygroundConfig('#minWidth=Infinity', date).minColumnWidth).toBe(0);
});

it.each([
  ['22:00', '06:00', 1320, 1800],
  ['08:00', '17:00', 480, 1020],
  ['08:00', '08:00', 480, 1920],
])('applies %s–%s to the preview layout with hidden weekdays and minimum widths', (visibleStart, visibleEnd, startMinutes, endMinutes) => {
  const settings = { ...defaultPlaygroundConfig(date), minColumnWidth: 480, hiddenDays: [6, 7] as const, visibleStart, visibleEnd };
  const views = createPlaygroundViews(settings);
  const calendar = createCalendar({
    views,
    features: {},
    view: 'week',
    date: Temporal.PlainDate.from(date),
    timeZone: 'America/New_York',
    events: [],
    clock: fixedClock(Temporal.Instant.from('2026-03-11T12:00Z')),
    onNavigate: () => {},
  });
  const layout = calendar.store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('Expected a time grid');

  expect(layout.minColumnWidth).toBe('480px');
  expect(layout.columns.map(column => column.date.dayOfWeek)).toEqual([1, 2, 3, 4, 5]);
  expect(layout.slots[0].time.toString({ smallestUnit: 'minute' })).toBe(visibleStart);
  expect(layout.slotUnits).toBe((endMinutes - startMinutes) / 30);
  expect(layout.slots.at(-1)?.dayOffset).toBe(Math.floor((endMinutes - 30) / 1440));
});
