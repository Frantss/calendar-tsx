import { calendarFeatures } from '#features/calendar-features';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { createCalendar } from '#calendar';
import { backgroundFeature } from '#features/background/background-feature';
import { fixedClock } from '#calendar-clock';
import { calendarViews, timeGridView, timelineView } from '#calendar-views';
import type { Calendar_BackgroundLayer, Calendar_EventInput, Calendar_Resource } from '#calendar.types';

const viewsFeatures = calendarFeatures({ backgroundFeature: backgroundFeature() });
const views = calendarViews({
  features: viewsFeatures,
  views: {
    grid: timeGridView({ days: 1 }),
    resources: timeGridView({ days: 1, groupBy: 'resource' }),
    timeline: timelineView({ days: 1 }),
    timeline_week: timelineView({ days: 7, groupBy: 'resource' }),
  },
});

const setup = ({
  date,
  timeZone,
  events,
  view = 'grid',
  resources = [],
  backgrounds = [],
}: {
  date: string;
  timeZone: string;
  events: Calendar_EventInput<null>[];
  view?: keyof typeof views;
  resources?: Calendar_Resource<null>[];
  backgrounds?: Calendar_BackgroundLayer[];
}) =>
  createCalendar({
    timeZone,
    views: views,
    features: { ...viewsFeatures, backgroundFeature: backgroundFeature(backgrounds) },
    view,
    date: Temporal.PlainDate.from(date),
    events,
    resources,
    firstDayOfWeek: 7,
    clock: fixedClock(Temporal.ZonedDateTime.from(`${date}T09:00[${timeZone}]`).toInstant()),
    onNavigate: () => {},
  });

for (const [date, timeZone] of [
  ['2026-03-08', 'America/New_York'],
  ['2026-11-01', 'America/New_York'],
  ['2026-10-04', 'Australia/Lord_Howe'],
  ['2026-04-05', 'Australia/Lord_Howe'],
]) {
  const at = (time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${timeZone}]`);
  const event = { id: 'nine', kind: 'timed', start: at('09:00'), end: at('10:00'), data: null } as const;

  it(`aligns time-grid events and now with the clock slots on ${date} in ${timeZone}`, () => {
    const layout = setup({ date, timeZone, events: [event] }).store.state.layout;

    if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

    expect(layout.slots).toHaveLength(48);
    expect(layout.slots[18]?.time.equals(Temporal.PlainTime.from('09:00'))).toBe(true);
    expect(layout.columns[0]?.segments[0]?.start).toBeCloseTo(9 / 24, 10);
    expect(layout.columns[0]?.segments[0]?.span).toBeCloseTo(1 / 24, 10);
    expect(layout.columns[0]?.now).toBeCloseTo(9 / 24, 10);
  });

  it(`aligns timeline events and now with the clock slots on ${date} in ${timeZone}`, () => {
    const layout = setup({ date, timeZone, events: [event], view: 'timeline' }).store.state.layout;

    if (layout.kind !== 'timeline') throw new Error('expected timeline');

    expect(layout.slots).toHaveLength(24);
    expect(layout.slots[9]?.time.equals(Temporal.PlainTime.from('09:00'))).toBe(true);
    expect(layout.rows[0]?.segments[0]?.start).toBeCloseTo(9 / 24, 10);
    expect(layout.rows[0]?.segments[0]?.span).toBeCloseTo(1 / 24, 10);
    expect(layout.now).toBeCloseTo(9 / 24, 10);
  });

  it(`aligns backgrounds, inverse layers and availability with clock slots on ${date} in ${timeZone}`, () => {
    const layout = setup({
      date,
      timeZone,
      view: 'resources',
      events: [{ ...event, display: 'background' }],
      resources: [{ id: 'room', title: 'Room', data: null, availability: [{ start: at('09:00'), end: at('17:00') }] }],
      backgrounds: [
        { id: 'busy', kind: 'busy', ranges: [{ start: at('09:00'), end: at('10:00') }] },
        { id: 'closed', kind: 'closed', inverse: true, ranges: [{ start: at('09:00'), end: at('17:00') }] },
      ],
    }).store.state.layout;

    if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

    const column = layout.columns[0];

    expect(column?.backgroundEvents[0]?.start).toBeCloseTo(9 / 24, 10);
    expect(column?.backgroundEvents[0]?.span).toBeCloseTo(1 / 24, 10);
    expect(column?.unavailable.map(({ start, span }) => [start, span])).toEqual([
      [0, 9 / 24],
      [17 / 24, 7 / 24],
    ]);
    expect('backgrounds' in (column ?? {})).toBe(true);
    if (!column || !('backgrounds' in column)) throw new Error('expected backgrounds');

    expect(column.backgrounds.map(({ kind, start, span }) => [kind, start, span])).toEqual([
      ['busy', 9 / 24, 1 / 24],
      ['closed', 0, 9 / 24],
      ['closed', 17 / 24, 7 / 24],
    ]);
  });
}

it('gives events in the repeated hour the same clock position and separate visual lanes', () => {
  const at = (time: string) => Temporal.ZonedDateTime.from(`2026-11-01T${time}[America/New_York]`);
  const layout = setup({
    date: '2026-11-01',
    timeZone: 'America/New_York',
    events: [
      { id: 'first', kind: 'timed', start: at('01:15-04:00'), end: at('01:45-04:00'), data: null },
      { id: 'second', kind: 'timed', start: at('01:15-05:00'), end: at('01:45-05:00'), data: null },
    ],
  }).store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

  expect(layout.columns[0]?.segments.map(({ lane, lanes }) => [lane, lanes])).toEqual([
    [0, 2],
    [1, 2],
  ]);
  for (const segment of layout.columns[0]?.segments ?? []) {
    expect(segment.start).toBeCloseTo(1.25 / 24, 10);
    expect(segment.span).toBeCloseTo(0.5 / 24, 10);
  }
});

it('keeps a positive bar across a clock rollback without changing the event endpoints', () => {
  const start = Temporal.ZonedDateTime.from('2026-11-01T01:30-04:00[America/New_York]');
  const end = Temporal.ZonedDateTime.from('2026-11-01T01:15-05:00[America/New_York]');

  for (const view of ['grid', 'timeline'] as const) {
    const layout = setup({
      date: '2026-11-01',
      timeZone: 'America/New_York',
      view,
      events: [{ id: 'rollback', kind: 'timed', start, end, data: null }],
    }).store.state.layout;
    const segment = layout.kind === 'timeGrid' ? layout.columns[0]?.segments[0] : layout.rows[0]?.segments[0];

    expect(segment?.start).toBeCloseTo(1 / 24, 10);
    expect(segment?.span).toBeCloseTo(1 / 24, 10);
    expect(segment?.event.start.equals(start)).toBe(true);
    expect(segment?.event.end?.equals(end)).toBe(true);
  }
});

it('keeps timeline day boundaries, all-day spans, availability and now aligned across a DST week', () => {
  const start = Temporal.ZonedDateTime.from('2026-03-11T09:00[America/New_York]');
  const end = start.with({ hour: 17 });
  const layout = setup({
    date: '2026-03-11',
    timeZone: 'America/New_York',
    view: 'timeline_week',
    resources: [{ id: 'room', title: 'Room', data: null, availability: [{ start, end }] }],
    events: [
      { id: 'nine', kind: 'timed', start, end, resourceIds: ['room'], data: null },
      {
        id: 'fair',
        kind: 'allDay',
        start: Temporal.PlainDate.from('2026-03-10'),
        end: Temporal.PlainDate.from('2026-03-11'),
        resourceIds: ['room'],
        data: null,
      },
    ],
  }).store.state.layout;

  if (layout.kind !== 'timeline') throw new Error('expected timeline');

  const fair = layout.rows[0]?.segments.find(segment => segment.event.id === 'fair');
  const nine = layout.rows[0]?.segments.find(segment => segment.event.id === 'nine');

  expect(layout.days.map(day => day.colSpan)).toEqual([24, 24, 24, 24, 24, 24, 24]);
  expect(fair?.start).toBeCloseTo(2 / 7, 10);
  expect(fair?.span).toBeCloseTo(2 / 7, 10);
  expect(nine?.start).toBeCloseTo((3 * 24 + 9) / (7 * 24), 10);
  expect(layout.now).toBeCloseTo(nine?.start ?? -1, 10);
  expect(layout.rows[0]?.unavailable[0]?.span).toBeCloseTo(nine?.start ?? -1, 10);
  expect(layout.rows[0]?.unavailable[1]?.start).toBeCloseTo((3 * 24 + 17) / (7 * 24), 10);
});

it('keeps all-day spans and layers full-width when DST removes midnight', () => {
  const date = Temporal.PlainDate.from('2026-09-06');
  const options = {
    date: date.toString(),
    timeZone: 'America/Santiago',
    events: [{ id: 'holiday', kind: 'allDay', start: date, data: null }] as Calendar_EventInput<null>[],
  };
  const timeline = setup({ ...options, view: 'timeline' }).store.state.layout;
  const grid = setup({
    ...options,
    backgrounds: [{ id: 'holiday', kind: 'holiday', ranges: [{ allDay: true, start: date }] }],
  }).store.state.layout;

  if (timeline.kind !== 'timeline' || grid.kind !== 'timeGrid') throw new Error('expected timeline and time grid');

  expect(timeline.rows[0]?.segments[0]?.start).toBe(0);
  expect(timeline.rows[0]?.segments[0]?.span).toBe(1);
  const column = grid.columns[0];

  if (!column || !('backgrounds' in column)) throw new Error('expected backgrounds');

  expect(column.backgrounds).toMatchObject([{ start: 0, span: 1 }]);
});

for (const { date, start, end, hour, hours } of [
  { date: '2026-03-08', start: '01:30-05:00', end: '03:30-04:00', hour: 1.5, hours: 2 },
  { date: '2026-11-01', start: '01:30-04:00', end: '01:00-05:00', hour: 1.5, hours: 0.5 },
]) {
  it(`projects a transition-crossing bar from ${start} to ${end} without extending an exclusive end`, () => {
    const at = (time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[America/New_York]`);

    for (const view of ['grid', 'timeline'] as const) {
      const layout = setup({
        date,
        timeZone: 'America/New_York',
        view,
        events: [{ id: 'transition', kind: 'timed', start: at(start), end: at(end), data: null }],
      }).store.state.layout;
      const segment = layout.kind === 'timeGrid' ? layout.columns[0]?.segments[0] : layout.rows[0]?.segments[0];

      expect(segment?.start).toBeCloseTo(hour / 24, 10);
      expect(segment?.span).toBeCloseTo(hours / 24, 10);
    }
  });
}

it('applies minimum displayed minutes after projecting a DST day', () => {
  const at = (time: string) => Temporal.ZonedDateTime.from(`2026-03-08T${time}[America/New_York]`);
  const layout = setup({
    date: '2026-03-08',
    timeZone: 'America/New_York',
    events: [
      { id: 'first', kind: 'timed', start: at('09:00'), end: at('09:05'), data: null },
      { id: 'second', kind: 'timed', start: at('09:05'), end: at('09:10'), data: null },
    ],
  }).store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

  const segments = layout.columns[0]?.segments ?? [];

  expect(segments).toHaveLength(2);
  expect(segments.map(({ lanes, isShort }) => [lanes, isShort])).toEqual([
    [2, true],
    [2, true],
  ]);
  expect(segments[0]?.start).toBeCloseTo(9 / 24, 10);
  for (const segment of segments) expect(segment.span).toBeCloseTo(15 / 1440, 10);
});

it('unions repeated-hour availability before computing its visible complement', () => {
  const at = (time: string) => Temporal.ZonedDateTime.from(`2026-11-01T${time}[America/New_York]`);
  const ranges = [
    { start: at('01:15-04:00'), end: at('01:45-04:00') },
    { start: at('01:20-05:00'), end: at('01:50-05:00') },
  ];
  const layout = setup({
    date: '2026-11-01',
    timeZone: 'America/New_York',
    view: 'resources',
    events: [],
    resources: [{ id: 'room', title: 'Room', data: null, availability: ranges }],
    backgrounds: [{ id: 'closed', kind: 'closed', inverse: true, ranges }],
  }).store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

  const column = layout.columns[0];

  if (!column || !('backgrounds' in column)) throw new Error('expected backgrounds');

  expect(column.unavailable).toHaveLength(2);
  expect(column.unavailable[0]?.span).toBeCloseTo(75 / 1440, 10);
  expect(column.unavailable[1]?.start).toBeCloseTo(110 / 1440, 10);
  expect(column.backgrounds.map(({ start, span }) => [start, span])).toEqual(column.unavailable.map(({ start, span }) => [start, span]));
});

it('preserves closed gaps between the clock bands of a rollback-crossing interval', () => {
  const start = Temporal.ZonedDateTime.from('2026-11-01T01:30-04:00[America/New_York]');
  const end = Temporal.ZonedDateTime.from('2026-11-01T01:15-05:00[America/New_York]');
  const ranges = [{ start, end }];
  const layout = setup({
    date: '2026-11-01',
    timeZone: 'America/New_York',
    view: 'resources',
    events: [
      { id: 'busy', kind: 'timed', start, end, display: 'background', data: null },
      { id: 'busy:1', kind: 'timed', start: end.with({ hour: 9 }), end: end.with({ hour: 10 }), display: 'background', data: null },
    ],
    resources: [{ id: 'room', title: 'Room', data: null, availability: ranges }],
    backgrounds: [
      { id: 'busy', kind: 'busy', ranges },
      { id: 'closed', kind: 'closed', inverse: true, ranges },
    ],
  }).store.state.layout;

  if (layout.kind !== 'timeGrid') throw new Error('expected time grid');

  const column = layout.columns[0];

  if (!column || !('backgrounds' in column)) throw new Error('expected backgrounds');

  const bands = column.backgroundEvents.filter(segment => segment.event.id === 'busy').map(({ start: from, span }) => [from * 24, span * 24]);
  const busy = column.backgrounds.filter(background => background.kind === 'busy');
  const closed = column.backgrounds.filter(background => background.kind === 'closed');

  expect(bands).toEqual([
    [1, 0.25],
    [1.5, 0.5],
  ]);
  expect(new Set(column.backgroundEvents.map(segment => segment.key)).size).toBe(column.backgroundEvents.length);
  expect(busy.map(({ start: from, span }) => [from * 24, span * 24])).toEqual(bands);
  expect(column.unavailable.map(({ start: from, span }) => [from * 24, span * 24])).toEqual([
    [0, 1],
    [1.25, 0.25],
    [2, 22],
  ]);
  expect(closed.map(({ start: from, span }) => [from, span])).toEqual(column.unavailable.map(({ start: from, span }) => [from, span]));
});
