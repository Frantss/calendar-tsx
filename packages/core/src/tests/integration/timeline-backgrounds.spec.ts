import { calendarFeatures } from '#features/calendar-features';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';

import { createCalendar } from '#calendar/calendar';
import { backgroundFeature } from '#features/background/background-feature';
import { createWeeklyRanges } from '#features/background/background-ranges';
import { fixedClock } from '#calendar/clock';
import { calendarViews, timelineView } from '#views/views';
import type { Calendar_BackgroundLayer } from '#features/background/background.types';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';
import type { Fixtures_EventData } from '#tests/support/calendar.fixtures';
import { fixtures_allDay, fixtures_at, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/support/calendar.fixtures';

const date = (value: string) => Temporal.PlainDate.from(value);
const at = (value: string) => Temporal.ZonedDateTime.from(value);

const setup = ({
  settings = {},
  anchor = '2026-03-11',
  timeZone = 'America/New_York',
  events = [],
  backgrounds = [],
  feature = true,
}: {
  settings?: Partial<Extract<Calendar_TimelineViewSettings, { days: number }>>;
  anchor?: string;
  timeZone?: string;
  events?: Calendar_EventInput<Fixtures_EventData>[];
  backgrounds?: Calendar_BackgroundLayer[];
  feature?: boolean;
} = {}) => {
  const viewsFeatures = calendarFeatures({ backgroundFeature: backgroundFeature(feature ? backgrounds : []) });
  const views = calendarViews({
    features: viewsFeatures,
    views: {
      timeline: timelineView({ days: 1, ...settings }),
      plain: timelineView({ days: 1, ...settings }),
    },
  });
  const calendar = createCalendar({
    timeZone,
    views,
    features: viewsFeatures,
    view: feature ? 'timeline' : 'plain',
    date: date(anchor),
    events,
    resources: [fixtures_resource('a'), fixtures_resource('b'), fixtures_resource('c')],
    firstDayOfWeek: 1,
    clock: fixedClock(Temporal.Instant.from('2026-03-11T15:00Z')),
    onNavigate: vi.fn(),
  });
  const layout = () => calendar.store.state.layout;
  return { calendar, layout, row: (id = 'all') => layout().rows.find(row => row.key === id)! };
};

const lunch: Calendar_BackgroundLayer = {
  id: 'lunch',
  kind: 'closed',
  ranges: [{ start: fixtures_at('2026-03-11', '12:00'), end: fixtures_at('2026-03-11', '13:00') }],
};

it('targets background events to every named resource, with unassigned events on every row and no stack cost', () => {
  const { layout } = setup({
    settings: { groupBy: 'resource' },
    events: [
      fixtures_background(fixtures_timed('global', { date: '2026-03-11', start: '09:00', end: '10:00' })),
      fixtures_background(fixtures_allDay('target', { start: '2026-03-11', resourceIds: ['a', 'c'] })),
      fixtures_background(fixtures_allDay('empty', { start: '2026-03-11', resourceIds: [] })),
      fixtures_background(fixtures_allDay('unknown', { start: '2026-03-11', resourceIds: ['missing'] })),
    ],
  });
  expect(layout().rows.map(row => row.backgroundEvents.map(segment => segment.event.id))).toEqual([
    ['global', 'target'],
    ['global'],
    ['global', 'target'],
  ]);
  expect(layout().rows.every(row => row.rows === 0 && row.segments.length === 0)).toBe(true);
  const [timed, allDay] = layout().rows[0].backgroundEvents;
  expect(timed).toMatchObject({ start: 9 / 24, span: 1 / 24, continuesBefore: false, continuesAfter: false });
  expect(allDay).toMatchObject({ start: 0, span: 1 });
});

it('shows resource-assigned background events on an ungrouped timeline, like the time grid', () => {
  const { row } = setup({ events: [fixtures_background(fixtures_allDay('target', { start: '2026-03-11', resourceIds: ['a'] }))] });
  expect(row().backgroundEvents).toHaveLength(1);
});

it('targets layers to matching resource rows and skips scoped layers on ungrouped timelines', () => {
  const backgrounds = [
    lunch,
    { ...lunch, id: 'target', resourceIds: ['a', 'c'] },
    { ...lunch, id: 'empty', resourceIds: [] },
    { ...lunch, id: 'closed-a', inverse: true, ranges: [], resourceIds: ['a'] },
  ];
  const grouped = setup({ settings: { groupBy: 'resource' }, backgrounds });
  expect(grouped.layout().rows.map(row => row.backgrounds.map(background => background.layer))).toEqual([
    ['lunch', 'target', 'closed-a'],
    ['lunch'],
    ['lunch', 'target'],
  ]);
  expect(
    setup({ backgrounds })
      .row()
      .backgrounds.map(background => background.layer),
  ).toEqual(['lunch']);
  expect(grouped.row('a').backgrounds[2]).toMatchObject({ start: 0, span: 1 });
});

it('unions mixed all-day and timed coverage within a layer, complements it, and preserves layer order', () => {
  const mixed: Calendar_BackgroundLayer = {
    id: 'mixed',
    kind: 'mixed',
    ranges: [
      { allDay: true, start: date('2026-03-11') },
      { start: fixtures_at('2026-03-11', '23:00'), end: fixtures_at('2026-03-12', '02:00') },
      { start: fixtures_at('2026-03-12', '01:00'), end: fixtures_at('2026-03-12', '03:00') },
    ],
  };
  const { row } = setup({ settings: { days: 2 }, backgrounds: [mixed, { ...mixed, id: 'inverse', inverse: true }] });
  expect(row().backgrounds).toEqual([
    expect.objectContaining({ layer: 'mixed', start: 0, span: 27 / 48 }),
    expect.objectContaining({ layer: 'inverse', start: 27 / 48, span: 21 / 48 }),
  ]);
});

it.each([
  [
    'spring',
    '2026-03-08',
    '2026-03-08T01:30-05:00[America/New_York]',
    '2026-03-08T03:30-04:00[America/New_York]',
    [
      [1.5, 0.5],
      [3, 0.5],
    ],
  ],
  ['autumn', '2026-11-01', '2026-11-01T00:30-04:00[America/New_York]', '2026-11-01T01:15-05:00[America/New_York]', [[0.5, 1.5]]],
  [
    'rollback gap',
    '2026-11-01',
    '2026-11-01T01:50-04:00[America/New_York]',
    '2026-11-01T01:10-05:00[America/New_York]',
    [
      [1, 1 / 6],
      [1 + 5 / 6, 1 / 6],
    ],
  ],
  ['exclusive transition end', '2026-11-01', '2026-11-01T01:30-04:00[America/New_York]', '2026-11-01T01:00-05:00[America/New_York]', [[1.5, 0.5]]],
] as const)('projects %s background events and inverse layers from exact DST coverage', (_name, anchor, start, end, bands) => {
  const source = { start: at(start), end: at(end) };
  const { row } = setup({
    anchor,
    events: [fixtures_background({ id: 'shade', kind: 'timed', ...source, data: { title: 'shade' } })],
    backgrounds: [{ id: 'open', kind: 'closed', inverse: true, ranges: [source] }],
  });
  const shades = row().backgroundEvents;
  expect(shades).toHaveLength(bands.length);
  bands.forEach(([startHour, hours], index) => {
    expect(shades[index].start).toBeCloseTo(startHour / 24);
    expect(shades[index].span).toBeCloseTo(hours / 24);
  });
  const gaps = row().backgrounds;
  const edges = [0, ...bands.flatMap(([startHour, hours]) => [startHour / 24, (startHour + hours) / 24]), 1];
  expect(gaps).toHaveLength(bands.length + 1);
  gaps.forEach((gap, index) => {
    expect(gap.start).toBeCloseTo(edges[index * 2]);
    expect(gap.span).toBeCloseTo(edges[index * 2 + 1] - edges[index * 2]);
  });
  expect(row().rows).toBe(0);
});

it('unions both autumn occurrences on shared rows before complementing a layer', () => {
  const { row } = setup({
    anchor: '2026-11-01',
    backgrounds: [
      {
        id: 'fold',
        kind: 'closed',
        inverse: true,
        ranges: [
          { start: at('2026-11-01T01:00-04:00[America/New_York]'), end: at('2026-11-01T01:30-04:00[America/New_York]') },
          { start: at('2026-11-01T01:15-05:00[America/New_York]'), end: at('2026-11-01T01:45-05:00[America/New_York]') },
        ],
      },
    ],
  });
  expect(row().backgrounds).toEqual([
    expect.objectContaining({ start: 0, span: 1 / 24 }),
    expect.objectContaining({ start: 1.75 / 24, span: 22.25 / 24 }),
  ]);
});

it('projects a half-hour DST transition in an overnight window', () => {
  const source = { start: at('2026-10-04T01:45+10:30[Australia/Lord_Howe]'), end: at('2026-10-04T02:45+11:00[Australia/Lord_Howe]') };
  const { row } = setup({
    anchor: '2026-10-03',
    timeZone: 'Australia/Lord_Howe',
    settings: { timeWindow: { startMinutes: 1320, endMinutes: 1800 }, hiddenDays: [7] },
    events: [fixtures_background({ id: 'shift', kind: 'timed', ...source, data: { title: 'shift' } })],
    backgrounds: [{ id: 'shift', kind: 'shift', ranges: [source] }],
  });
  const bands = [
    [3.75 / 8, 0.25 / 8],
    [4.5 / 8, 0.25 / 8],
  ];
  for (const segments of [row().backgroundEvents, row().backgrounds]) {
    expect(segments.map(segment => [segment.start, segment.span])).toEqual(bands);
  }
});

it('clips both autumn occurrences to a narrow clock window before computing inverse shading', () => {
  const source = { start: at('2026-11-01T01:20-04:00[America/New_York]'), end: at('2026-11-01T01:40-05:00[America/New_York]') };
  const { row } = setup({
    anchor: '2026-11-01',
    settings: { timeWindow: { startMinutes: 90, endMinutes: 105 } },
    events: [fixtures_background({ id: 'fold', kind: 'timed', ...source, data: { title: 'fold' } })],
    backgrounds: [{ id: 'fold', kind: 'closed', inverse: true, ranges: [source] }],
  });
  expect(row().backgroundEvents).toEqual([expect.objectContaining({ start: 0, span: 1, continuesBefore: true, continuesAfter: false })]);
  expect(row().backgrounds).toEqual([]);
});

it('includes the following morning of an overnight anchor even when that weekday is hidden', () => {
  const ranges = vi.fn(
    createWeeklyRanges([{ daysOfWeek: [2], startTime: Temporal.PlainTime.from('01:00'), endTime: Temporal.PlainTime.from('02:00') }]),
  );
  const { row } = setup({
    anchor: '2026-03-09',
    settings: { hiddenDays: [2], timeWindow: { startMinutes: 1320, endMinutes: 1800 } },
    events: [
      fixtures_background(fixtures_timed('morning', { date: '2026-03-10', start: '01:00', end: '02:00' })),
      fixtures_background(fixtures_allDay('monday', { start: '2026-03-09' })),
      fixtures_background(fixtures_allDay('tuesday', { start: '2026-03-10' })),
    ],
    backgrounds: [
      { id: 'weekly', kind: 'weekly', ranges },
      { id: 'monday', kind: 'holiday', ranges: [{ allDay: true, start: date('2026-03-09') }] },
      { id: 'tuesday', kind: 'holiday', ranges: [{ allDay: true, start: date('2026-03-10') }] },
    ],
  });
  expect(row().backgroundEvents.map(segment => segment.event.id)).toEqual(['morning', 'monday']);
  expect(row().backgroundEvents[0]).toMatchObject({ start: 3 / 8, span: 1 / 8 });
  expect(row().backgroundEvents[1]).toMatchObject({ start: 0, span: 1 });
  expect(row().backgrounds).toEqual([
    expect.objectContaining({ layer: 'weekly', start: 3 / 8, span: 1 / 8 }),
    expect.objectContaining({ layer: 'monday', start: 0, span: 1 }),
  ]);
  expect(ranges).toHaveBeenCalledWith({ start: date('2026-03-09'), end: date('2026-03-10') }, 'America/New_York');
});

it('compresses hidden weekdays, clips timed backgrounds to visible windows, and keeps all-day anchor spans', () => {
  const { row } = setup({
    anchor: '2026-03-13',
    settings: { days: 4, hiddenDays: [6, 7], timeWindow: { startMinutes: 540, endMinutes: 1020 } },
    events: [
      fixtures_background(fixtures_timed('weekend', { date: '2026-03-14', start: '09:00', end: '10:00' })),
      fixtures_background(fixtures_timed('span', { date: '2026-03-13', start: '16:00', endDate: '2026-03-16', end: '10:00' })),
      fixtures_background(fixtures_allDay('all-day', { start: '2026-03-12', end: '2026-03-17' })),
    ],
    backgrounds: [{ id: 'hidden', kind: 'hidden', ranges: [{ allDay: true, start: date('2026-03-14'), end: date('2026-03-15') }] }],
  });
  const [friday, monday, allDay] = row().backgroundEvents;
  expect(row().backgroundEvents).toHaveLength(3);
  expect(friday).toMatchObject({ start: 7 / 16, span: 1 / 16, continuesBefore: false, continuesAfter: true });
  expect(monday).toMatchObject({ start: 1 / 2, span: 1 / 16, continuesBefore: true, continuesAfter: false });
  expect(allDay).toMatchObject({ start: 0, span: 1, continuesBefore: true, continuesAfter: true });
  expect(new Set(row().backgroundEvents.map(segment => segment.key)).size).toBe(3);
  expect(row().backgrounds).toEqual([]);
});

it('uses anchor membership for all-day shading on dates with a skipped midnight', () => {
  const { row } = setup({
    anchor: '2026-09-06',
    timeZone: 'America/Santiago',
    events: [fixtures_background(fixtures_allDay('holiday', { start: '2026-09-06' }))],
    backgrounds: [{ id: 'holiday', kind: 'holiday', ranges: [{ allDay: true, start: date('2026-09-06') }] }],
  });
  expect(row().backgroundEvents[0]).toMatchObject({ start: 0, span: 1 });
  expect(row().backgrounds[0]).toMatchObject({ start: 0, span: 1 });
});

it('shades a single-day timeline whose only date is a hidden weekday', () => {
  const ranges = vi.fn(() => []);
  const { row } = setup({
    settings: { hiddenDays: [3] },
    events: [fixtures_background(fixtures_allDay('holiday', { start: '2026-03-11' }))],
    backgrounds: [{ id: 'inverse', kind: 'closed', inverse: true, ranges }],
  });
  expect(row().backgroundEvents).toHaveLength(1);
  expect(row().backgrounds).toHaveLength(1);
  expect(ranges).toHaveBeenCalled();
});

it('inherits empty layers, re-derives view overrides, and always exposes background events', () => {
  const plain = setup({
    feature: false,
    backgrounds: [lunch],
    events: [fixtures_background(fixtures_allDay('holiday', { start: '2026-03-11' }))],
  }).row();
  expect(plain.backgrounds).toEqual([]);
  expect(plain.backgroundEvents).toHaveLength(1);
  const { calendar, row } = setup();
  expect(row().backgrounds).toEqual([]);
  calendar['~update']({
    ...calendar.options,
    views: { ...calendar.options.views, timeline: { ...calendar.options.views.timeline, features: { backgroundFeature: [lunch] } } },
    events: [fixtures_background(fixtures_allDay('holiday', { start: '2026-03-11' }))],
  });
  expect(row().backgrounds[0]).toMatchObject({ start: 0.5, span: 1 / 24 });
  expect(row().backgroundEvents).toHaveLength(1);
});
