import { createCalendar, fixedClock } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { defaultPlaygroundConfig, parsePlaygroundConfig, playgroundViewPreset, serializePlaygroundConfig } from './config';
import { createPlaygroundViews } from './views';
import { dataSetEvents, dataSetResources } from './sample-data';
import { createPlaygroundFeatures } from './interactions';

const date = '2026-03-11';

it('opens the nested-resource preset from a shared link and preserves custom settings', () => {
  const config = parsePlaygroundConfig('#view=timeline_nested&date=2026-10-24&tz=UTC', date);
  expect(config).toMatchObject({ data: 'nested', slotMinutes: 60, visibleStart: '08:00', visibleEnd: '18:00' });
  expect(parsePlaygroundConfig(serializePlaygroundConfig(config), date)).toEqual(config);
  const changed = { ...config, data: 'sample' as const, slotMinutes: 30 as const, visibleStart: '00:00', visibleEnd: '00:00' };
  expect(parsePlaygroundConfig(serializePlaygroundConfig(changed), date)).toEqual(changed);
  expect({ ...defaultPlaygroundConfig(date), ...playgroundViewPreset('timeline_nested') }).toMatchObject({
    view: 'timeline_nested',
    data: 'nested',
    slotMinutes: 60,
    visibleStart: '08:00',
    visibleEnd: '18:00',
  });
});

it('builds the playground hierarchy with bookings on weekends and independent nested toggles', () => {
  const config = parsePlaygroundConfig('#view=timeline_nested&date=2026-10-24&tz=UTC', date);
  const anchor = Temporal.PlainDate.from(config.date);
  const features = createPlaygroundFeatures(config.interactions);
  const calendar = createCalendar({
    features,
    views: createPlaygroundViews(config),
    view: config.view,
    date: anchor,
    timeZone: 'UTC',
    events: dataSetEvents(config.data, anchor, 'UTC'),
    resources: dataSetResources(config.data, anchor, 'UTC'),
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-10-24T12:00Z')),
  });
  const rows = () => {
    const layout = calendar.store.state.layout;
    if (layout.kind !== 'timeline') throw new Error('Expected timeline');
    return layout.rows;
  };
  expect(rows().map(row => [row.key, row.depth])).toEqual([
    ['office', 0],
    ['floor-1', 1],
    ['room-a', 2],
    ['room-b', 2],
    ['floor-2', 1],
    ['room-c', 2],
  ]);
  expect(
    rows()
      .filter(row => row.segments.length)
      .map(row => row.key),
  ).toEqual(['office', 'room-a', 'room-b', 'room-c']);
  calendar.api.resourceExpansion.toggle('floor-1');
  expect(rows().map(row => row.key)).toEqual(['office', 'floor-1', 'floor-2', 'room-c']);
  calendar.api.resourceExpansion.toggle('office');
  expect(rows().map(row => row.key)).toEqual(['office']);
  expect(rows()[0].segments[0].event.data.title).toBe('Office briefing');
  calendar.api.resourceExpansion.toggle('office');
  expect(rows().map(row => row.key)).toEqual(['office', 'floor-1', 'floor-2', 'room-c']);
  expect(dataSetResources('sample', anchor, 'UTC').map(resource => resource.parentId)).toEqual([undefined, undefined, undefined]);
});

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
