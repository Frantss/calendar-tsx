import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { createCalendar } from '#calendar';
import { backgroundFeature, createWeeklyRanges } from '#calendar-backgrounds';
import { fixedClock } from '#calendar-clock';
import { getCalendarNavigation } from '#calendar-navigation';
import { timeGridLayout } from '#calendar-layouts';
import { createCalendarViews, dayGridView, listView, monthView, timeGridView, timelineView } from '#calendar-views';
import type { Calendar_BackgroundLayer, Calendar_EventInput, Calendar_Range, Calendar_Resource } from '#calendar.types';

const date = (value: string) => Temporal.PlainDate.from(value);
const at = (value: string) => Temporal.ZonedDateTime.from(`${value}[America/New_York]`);
const timed = (id: string, start: string, end: string): Calendar_EventInput<null> => ({
  id,
  kind: 'timed',
  start: at(start),
  end: at(end),
  data: null,
});
const allDay = (id: string, start: string, end = start): Calendar_EventInput<null> => ({
  id,
  kind: 'allDay',
  start: date(start),
  end: date(end),
  data: null,
});
const night = { days: 1, timeWindow: { startMinutes: 1320, endMinutes: 1800 }, features: { backgroundFeature } };
const weekdays = { hiddenDays: [6, 7] as const };
const daytime = { days: 7, ...weekdays, timeWindow: { startMinutes: 480, endMinutes: 1080 } };
const partial = { days: 1, slotMinutes: 30, timeWindow: { startMinutes: 490, endMinutes: 540 } };
const views = createCalendarViews({
  night: timeGridView(night),
  night_timeline: timelineView(night),
  grid: timeGridView(daytime),
  timeline: timelineView(daytime),
  month: monthView({ maxEventsPerDay: 1, fixedWeekCount: true, ...weekdays }),
  days: dayGridView({ weeks: 2, maxEventsPerDay: 2, ...weekdays }),
  list: listView({ days: 7, ...weekdays }),
  partial: timeGridView(partial),
  partial_timeline: timelineView({ ...partial, days: 2 }),
});

const setup = (
  view: keyof typeof views.views,
  day: string,
  events: Calendar_EventInput<null>[] = [],
  resources: Calendar_Resource<null>[] = [],
  backgrounds: Calendar_BackgroundLayer[] = [],
  now = `${day}T10:00`,
) =>
  createCalendar({
    views: views.views,
    features: views.features,
    view,
    date: date(day),
    events,
    resources,
    backgrounds,
    timeZone: 'America/New_York',
    firstDayOfWeek: 7,
    clock: fixedClock(at(now).toInstant()),
    onNavigate: () => {},
  });

it('includes the following morning in navigation and input filtering while preserving anchor-date membership', () => {
  const calendar = setup(
    'night',
    '2026-03-09',
    [timed('morning', '2026-03-10T00:30', '2026-03-10T01:30'), allDay('monday', '2026-03-09'), allDay('tuesday', '2026-03-10')],
    [],
    [],
    '2026-03-10T05:00',
  );
  const navigation = getCalendarNavigation(views.views, 'night', date('2026-03-09'));
  expect(navigation).toMatchObject({
    inputRange: { start: date('2026-03-09'), end: date('2026-03-10') },
    range: { start: date('2026-03-09'), end: date('2026-03-09') },
  });
  expect(calendar.store.state.context).toMatchObject(navigation);
  const grid = calendar.store.state.layout;
  if (grid.kind !== 'timeGrid') throw new Error('expected grid');
  expect(grid.columns[0].segments.map(segment => segment.event.id)).toEqual(['morning']);
  expect(grid.columns[0].segments[0]).toMatchObject({ start: 150 / 480, span: 60 / 480 });
  expect(grid.allDay?.segments.map(segment => segment.event.id)).toEqual(['monday']);
  expect(grid.columns[0].isToday).toBe(false);
  expect(grid.columns[0].now).toBeCloseTo(420 / 480);
  expect(grid.slots[4]).toMatchObject({ time: Temporal.PlainTime.from('00:00'), dayOffset: 1 });
});

it('uses overnight input coverage and shared geometry for background layers, background events and availability', () => {
  const requested: Calendar_Range[] = [];
  const rule = createWeeklyRanges([{ daysOfWeek: [2], startTime: Temporal.PlainTime.from('00:30'), endTime: Temporal.PlainTime.from('01:30') }]);
  const ranges = [{ start: at('2026-03-10T00:30'), end: at('2026-03-10T01:30') }];
  const calendar = setup(
    'night',
    '2026-03-09',
    [
      { ...timed('shade', '2026-03-10T00:30', '2026-03-10T01:30'), display: 'background' },
      { ...allDay('holiday', '2026-03-10'), display: 'background' },
    ],
    [],
    [
      {
        id: 'hours',
        kind: 'open',
        ranges: (range, zone) => {
          requested.push(range);
          return rule(range, zone);
        },
      },
    ],
  );
  const grid = calendar.store.state.layout;
  if (grid.kind !== 'timeGrid') throw new Error('expected grid');
  expect(requested[0].end.toString()).toBe('2026-03-10');
  expect(grid.columns[0].backgroundEvents).toHaveLength(1);
  expect(grid.columns[0].backgroundEvents[0]).toMatchObject({ start: 150 / 480, span: 60 / 480 });
  if (!('backgrounds' in grid.columns[0])) throw new Error('expected background feature');
  expect(grid.columns[0].backgrounds).toMatchObject([{ start: 150 / 480, span: 60 / 480 }]);

  const resourceViews = createCalendarViews({ night: timeGridView({ ...night, groupBy: 'resource' }) });
  const resource = createCalendar({
    timeZone: 'America/New_York',
    date: date('2026-03-09'),
    events: [],
    view: 'night',
    onNavigate: () => {},
    views: resourceViews.views,
    features: resourceViews.features,
    resources: [{ id: 'room', title: 'Room', data: null, availability: ranges }],
  }).store.state.layout;
  if (resource.kind !== 'timeGrid') throw new Error('expected grid');
  expect(resource.columns[0].unavailable.map(({ start, span }) => [start, span])).toEqual([
    [0, 150 / 480],
    [210 / 480, 270 / 480],
  ]);
});

it('compresses hidden dates in month bars and overflow while retaining all calendar week rows', () => {
  const grid = setup('month', '2026-03-11', [allDay('hidden', '2026-03-07'), allDay('visible', '2026-03-06', '2026-03-09')]).store.state.layout;
  if (grid.kind !== 'month') throw new Error('expected month');
  expect(grid.weeks).toHaveLength(6);
  expect(grid.weeks[0].key).toBe('2026-03-01');
  expect(grid.weekdays.map(day => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5]);
  expect(grid.weeks.every(week => week.days.length === 5)).toBe(true);
  expect(grid.weeks[0].segments.map(segment => [segment.event.id, segment.colStart, segment.colSpan])).toEqual([['visible', 4, 1]]);
  expect(grid.weeks[1].segments.map(segment => [segment.event.id, segment.colStart, segment.colSpan])).toEqual([['visible', 0, 1]]);
  expect(grid.weeks.flatMap(week => week.days).every(day => day.hiddenCount === 0)).toBe(true);
});

it('hides weekdays in day grids and lists', () => {
  const events = [allDay('weekend', '2026-03-07'), allDay('weekday', '2026-03-09')];
  const days = setup('days', '2026-03-11', events).store.state.layout;
  const list = setup('list', '2026-03-11', events).store.state.layout;
  if (days.kind !== 'month' || list.kind !== 'list') throw new Error('expected date layouts');
  expect(days.weeks.map(week => week.days.length)).toEqual([5, 5]);
  expect(list.days.map(day => day.date.toString())).toEqual(['2026-03-09']);
});

it('uses compressed visible-window positions for timeline events, all-day spans and now', () => {
  const timeline = setup(
    'timeline',
    '2026-03-11',
    [
      timed('nine', '2026-03-11T09:00', '2026-03-11T10:00'),
      allDay('fair', '2026-03-10', '2026-03-11'),
      allDay('hidden', '2026-03-08'),
      timed('early', '2026-03-11T06:00', '2026-03-11T07:00'),
    ],
    [],
    [],
    '2026-03-11T09:00',
  ).store.state.layout;
  if (timeline.kind !== 'timeline') throw new Error('expected timeline');
  expect(timeline.days).toHaveLength(5);
  expect(timeline.slots).toHaveLength(50);
  expect(timeline.rows[0].segments.map(segment => segment.event.id)).toEqual(['fair', 'nine']);
  expect(timeline.rows[0].segments.find(segment => segment.event.id === 'nine')).toMatchObject({ start: 0.42, span: 0.02 });
  expect(timeline.rows[0].segments.find(segment => segment.event.id === 'fair')).toMatchObject({ start: 0.2, span: 0.4 });
  expect(timeline.now).toBeCloseTo(0.42);
});

it('keeps partial-slot positions proportional and clips minimum paint size at visible-hour bounds', () => {
  const grid = setup('partial', '2026-03-11', [timed('brief', '2026-03-11T08:55', '2026-03-11T08:56')]).store.state.layout;
  const timeline = setup('partial_timeline', '2026-03-11').store.state.layout;
  if (grid.kind !== 'timeGrid' || timeline.kind !== 'timeline') throw new Error('expected timed layouts');
  expect(grid.slots).toMatchObject([
    { start: 0, span: 0.6 },
    { start: 0.6, span: 0.4 },
  ]);
  expect(grid.columns[0].segments[0].span).toBeCloseTo(0.1);
  expect(timeline.slots).toMatchObject([
    { start: 0, span: 0.3 },
    { start: 0.3, span: 0.2 },
    { start: 0.5, span: 0.3 },
    { start: 0.8, span: 0.2 },
  ]);
});

it('returns empty geometry when the controlled date is hidden, without changing navigation', () => {
  const definition = { ...night, hiddenDays: [1] as const };
  const hidden = createCalendarViews({ day: timeGridView(definition), timeline: timelineView(definition) });
  for (const view of ['day', 'timeline'] as const) {
    const calendar = createCalendar({
      timeZone: 'America/New_York',
      date: date('2026-03-09'),
      events: [],
      onNavigate: () => {},
      views: hidden.views,
      features: hidden.features,
      view,
    });
    expect(calendar.store.state.context.date.toString()).toBe('2026-03-09');
    const model = calendar.store.state.layout;
    if (model.kind === 'timeGrid') expect(model.columns).toEqual([]);
    if (model.kind === 'timeline') {
      expect(model.days).toEqual([]);
      expect(model.slots).toEqual([]);
      expect(model.rows[0].segments).toEqual([]);
    }
  }
});

it('retains the D40 enclosing policy when a DST transition falls inside an overnight window', () => {
  for (const view of ['night', 'night_timeline'] as const) {
    const model = setup(view, '2026-03-07', [timed('spring', '2026-03-08T01:30-05:00', '2026-03-08T03:30-04:00')]).store.state.layout;
    const segment = model.kind === 'timeGrid' ? model.columns[0].segments[0] : model.kind === 'timeline' ? model.rows[0].segments[0] : undefined;
    expect(segment).toMatchObject({ start: 210 / 480, span: 120 / 480 });
  }
});

for (const groupOrder of ['resource-first', 'date-first'] as const) {
  it(`compresses all-day bars and background spans with ${groupOrder} resources`, () => {
    const resourceViews = createCalendarViews({ week: timeGridView({ days: 7, ...weekdays, groupBy: 'resource', groupOrder }) });
    const resources = ['a', 'b'].map(id => ({ id, title: id, data: null, availability: [] }));
    const calendar = createCalendar({
      views: resourceViews.views,
      features: resourceViews.features,
      view: 'week',
      timeZone: 'America/New_York',
      date: date('2026-03-11'),
      resources,
      onNavigate: () => {},
      events: [
        { ...allDay('bar', '2026-03-12', '2026-03-14'), resourceIds: ['a', 'b'] },
        { ...allDay('shade', '2026-03-12', '2026-03-14'), display: 'background' },
        { ...allDay('hidden', '2026-03-14'), resourceIds: ['a', 'b'] },
      ],
    });
    const grid = calendar.store.state.layout;
    expect(grid.columns).toHaveLength(10);
    const expected =
      groupOrder === 'resource-first'
        ? [
            [3, 2],
            [8, 2],
          ]
        : [
            [6, 1],
            [8, 1],
            [7, 1],
            [9, 1],
          ];
    expect(grid.allDay?.segments.map(segment => [segment.colStart, segment.colSpan])).toEqual(expected);
    expect(grid.allDay?.backgroundEvents.map(segment => [segment.colStart, segment.colSpan])).toEqual(expected);
  });
}

it('retains repeated-hour occurrence metadata and visual collisions inside a narrow visible window', () => {
  const settings = { days: 1, slotMinutes: 7, timeWindow: { startMinutes: 90, endMinutes: 105 } };
  const folded = createCalendarViews({ grid: timeGridView(settings), timeline: timelineView(settings) });
  for (const view of ['grid', 'timeline'] as const) {
    const model = createCalendar({
      views: folded.views,
      features: folded.features,
      view,
      date: date('2026-11-01'),
      timeZone: 'America/New_York',
      onNavigate: () => {},
      events: [
        timed('first', '2026-11-01T01:30-04:00', '2026-11-01T01:45-04:00'),
        timed('second', '2026-11-01T01:30-05:00', '2026-11-01T01:45-05:00'),
      ],
    }).store.state.layout;
    const segments = model.kind === 'timeGrid' ? model.columns[0].segments : model.rows[0].segments;
    expect(segments.map(segment => [segment.start, segment.span])).toEqual([
      [0, 1],
      [0, 1],
    ]);
    expect(segments.map(segment => segment.fragments[0].branch.occurrence)).toEqual([0, 1]);
    if (model.kind === 'timeGrid') expect(model.columns[0].segments.map(segment => segment.lane)).toEqual([0, 1]);
    else expect(model.rows[0].rows).toBe(2);
  }
});

it('reuses coordinate plans for event updates and invalidates them when navigation changes', () => {
  const calendar = setup('night', '2026-03-09');
  const first = calendar.store.state.layout.coordinates;
  calendar['~update']({ ...calendar.options, events: [timed('new', '2026-03-10T00:30', '2026-03-10T01:30')] });
  expect(calendar.store.state.layout.coordinates).toBe(first);
  calendar['~update']({ ...calendar.options, date: date('2026-03-10') });
  expect(calendar.store.state.layout.coordinates).not.toBe(first);
});

it('uses layout input-range capabilities for both navigation paths and falls back for older layout features', () => {
  const localViews = createCalendarViews({ day: timeGridView({ days: 1 }) });
  const override = { ...timeGridLayout, inputRange: (range: Calendar_Range) => ({ start: range.start, end: range.end.add({ days: 2 }) }) };
  const navigated: Calendar_Range[] = [];
  const calendar = createCalendar({
    views: localViews.views,
    features: { ...localViews.features, timeGridLayout: override },
    view: 'day',
    date: date('2026-03-09'),
    timeZone: 'UTC',
    events: [],
    onNavigate: next => navigated.push(next.inputRange),
  });
  expect(calendar.store.state.context.inputRange.end.toString()).toBe('2026-03-11');
  calendar.api.next();
  expect(navigated[0].end.toString()).toBe('2026-03-12');
  const { inputRange: _inputRange, ...legacy } = timeGridLayout;
  const legacyView = { ...localViews.views.day, '~features': { timeGridLayout: legacy } };
  const navigation = getCalendarNavigation({ day: legacyView }, 'day', date('2026-03-09'));
  expect(navigation.inputRange).toEqual(navigation.range);
});
