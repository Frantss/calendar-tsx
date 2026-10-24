import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { createCalendar } from '#calendar';
import { backgroundFeature } from '#features/background/background-feature';
import { createCalendarViews, dayGridView, listView, timeGridView, timelineView } from '#calendar-views';
import type {
  Calendar_DayGridLayout,
  Calendar_EventInput,
  Calendar_ListLayout,
  Calendar_Resource,
  Calendar_TimeGridLayout,
  Calendar_TimelineLayout,
  Calendar_View,
} from '#calendar.types';
import { fixtures_allDay, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';

const setup = (
  definition: Calendar_View,
  options: {
    date?: string;
    events?: Calendar_EventInput<Fixtures_EventData>[];
    resources?: Calendar_Resource<null>[];
    now?: string;
    firstDayOfWeek?: 1 | 7;
  } = {},
) => {
  const views = createCalendarViews({ test: definition });
  const onNavigate = vi.fn();
  const calendar = createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features },
    view: 'test',
    date: Temporal.PlainDate.from(options.date ?? '2026-03-11'),
    initialNow: Temporal.ZonedDateTime.from(options.now ?? '2026-03-11T10:40[America/New_York]').toInstant(),
    firstDayOfWeek: options.firstDayOfWeek ?? 7,
    events: options.events ?? [],
    resources: options.resources ?? [],
    onNavigate,
  });
  return { calendar, onNavigate, layout: calendar.store.state.layout };
};
const grid = (definition: ReturnType<typeof dayGridView>, options?: Parameters<typeof setup>[1]) => {
  const result = setup(definition, options);
  return { ...result, layout: result.layout as Calendar_DayGridLayout<Fixtures_EventData, null> };
};

it.each([
  ['day grid', () => dayGridView({ period: 'year', maxEventsPerDay: 3 })],
  ['time grid', () => timeGridView({ period: 'year' })],
  ['list', () => listView({ period: 'year' })],
  ['timeline', () => timelineView({ period: 'year', slotMinutes: 1440 })],
] as const)('resolves and navigates a leap year in the %s', (_name, definition) => {
  const { calendar, onNavigate } = setup(definition(), { date: '2024-02-29' });
  expect(calendar.store.state.context.period.start.toString()).toBe('2024-01-01');
  expect(calendar.store.state.context.period.end.toString()).toBe('2024-12-31');
  calendar.api.next();
  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2025-01-01');
  calendar.api.prev();
  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2023-01-01');
});

it.each([
  dayGridView({ period: 'quarter', maxEventsPerDay: 3 }),
  timeGridView({ period: 'quarter' }),
  listView({ period: 'quarter' }),
  timelineView({ period: 'quarter', slotMinutes: 1440 }),
])('aligns quarter periods and steps across the year boundary', definition => {
  const { calendar, onNavigate } = setup(definition, { date: '2026-11-19' });
  expect(calendar.store.state.context.period.start.toString()).toBe('2026-10-01');
  expect(calendar.store.state.context.period.end.toString()).toBe('2026-12-31');
  calendar.api.next();
  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2027-01-01');
});

it('distinguishes a rolling month count from a calendar quarter', () => {
  const { calendar, onNavigate } = setup(listView({ months: 3 }), { date: '2026-02-19' });
  expect(calendar.store.state.context.period.start.toString()).toBe('2026-02-01');
  expect(calendar.store.state.context.period.end.toString()).toBe('2026-04-30');
  calendar.api.next();
  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2026-05-01');
});

it('renders an N-day grid as one row starting on the date', () => {
  const { layout } = grid(dayGridView({ days: 3, maxEventsPerDay: 3 }));
  expect(layout.sections).toHaveLength(1);
  expect(layout.sections[0]?.columnCount).toBe(3);
  expect(layout.sections[0]?.rows).toHaveLength(1);
  expect(layout.sections[0]?.rows[0]?.days.map(day => day.date.toString())).toEqual(['2026-03-11', '2026-03-12', '2026-03-13']);
});

it('keeps a workweek aligned while skipping weekend-only events and projecting spanning bars', () => {
  const { layout, calendar, onNavigate } = grid(dayGridView({ weeks: 2, hiddenDays: [6, 7], maxEventsPerDay: 3 }), {
    date: '2026-03-09',
    firstDayOfWeek: 1,
    events: [
      fixtures_allDay('span', { start: '2026-03-13', end: '2026-03-16' }),
      fixtures_allDay('weekend', { start: '2026-03-14', end: '2026-03-15' }),
    ],
  });
  const rows = layout.sections[0]?.rows ?? [];
  expect(rows.map(row => row.columnCount)).toEqual([5, 5]);
  expect(rows.flatMap(row => row.segments.map(segment => segment.event.id))).toEqual(['span', 'span']);
  expect(rows[0]?.segments[0]).toMatchObject({ colStart: 4, colSpan: 1, continuesAfter: true });
  expect(rows[1]?.segments[0]).toMatchObject({ colStart: 0, colSpan: 1, continuesBefore: true });
  calendar.api.next();
  expect(onNavigate.mock.lastCall?.[0].date.toString()).toBe('2026-03-23');
});

it('packs a bar across hidden dates using visible columns', () => {
  const { layout } = grid(dayGridView({ days: 4, hiddenDays: [6, 7], maxEventsPerDay: 3 }), {
    date: '2026-03-13',
    events: [fixtures_allDay('span', { start: '2026-03-13', end: '2026-03-16' })],
  });
  expect(layout.sections[0]?.rows[0]?.segments[0]).toMatchObject({ colStart: 0, colSpan: 2, continuesBefore: false, continuesAfter: false });
});

it('groups a year into twelve month grids with local outside flags and fixed heights', () => {
  const { layout, calendar } = grid(dayGridView({ period: 'year', groupBy: 'month', fixedWeekCount: true, maxEventsPerDay: 3 }), {
    date: '2024-02-29',
  });
  expect(layout.sections.map(section => section.month?.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(layout.sections.every(section => section.rows.length === 6)).toBe(true);
  const february = layout.sections[1];
  const febDays = february?.rows.flatMap(row => row.days) ?? [];
  expect(febDays.find(day => day.date.toString() === '2024-02-29')?.isOutside).toBe(false);
  expect(febDays.find(day => day.date.toString() === '2024-03-01')?.isOutside).toBe(true);
  expect(calendar.store.state.context.range.end.equals(layout.sections[11]!.range.end)).toBe(true);
  expect(new Set(layout.sections.map(section => section.key)).size).toBe(12);
});

it('keeps a continuous year in one section', () => {
  const { layout } = grid(dayGridView({ period: 'year', maxEventsPerDay: 3 }), { date: '2024-02-29' });
  expect(layout.sections).toHaveLength(1);
  expect(layout.sections[0]?.rows.length).toBeGreaterThan(50);
});

it('makes month-resource and resource-month ordering observable', () => {
  const resources = [fixtures_resource('b'), fixtures_resource('a')];
  const byMonth = grid(dayGridView({ months: 2, groupBy: ['month', 'resource'], maxEventsPerDay: 3 }), { resources }).layout;
  expect(byMonth.sections.map(section => section.month?.month)).toEqual([3, 4]);
  expect(byMonth.sections[0]?.columns.map(column => column.resource?.id)).toEqual([...Array(7).fill('b'), ...Array(7).fill('a')]);
  const byResource = grid(dayGridView({ months: 2, groupBy: ['resource', 'month'], maxEventsPerDay: 3 }), { resources }).layout;
  expect(byResource.sections.map(section => `${section.resource?.id}:${section.month?.month}`)).toEqual(['b:3', 'b:4', 'a:3', 'a:4']);
  expect(byResource.sections.every(section => section.columnCount === 7)).toBe(true);
});

it('filters resource events, scopes overflow, and shades background events per resource', () => {
  const { layout } = grid(dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay: 1, dayOverflow: (_date, resourceId) => resourceId === 'b' }), {
    resources: [fixtures_resource('a'), fixtures_resource('b')],
    events: [
      fixtures_allDay('booking', { start: '2026-03-11', resourceIds: ['a'] }),
      fixtures_allDay('unassigned', { start: '2026-03-11' }),
      fixtures_background(fixtures_allDay('holiday', { start: '2026-03-11' })),
    ],
  });
  const row = layout.sections[0]?.rows[0];
  expect(row?.days.map(day => day.events.map(event => event.id))).toEqual([['booking'], []]);
  expect(row?.days.map(day => day.hasMore)).toEqual([false, true]);
  expect(row?.segments).toHaveLength(1);
  expect(row?.backgroundEvents.map(segment => [segment.colStart, segment.colSpan])).toEqual([
    [0, 1],
    [1, 1],
  ]);
});

it('supports resource-scoped background layers on day-grid cells', () => {
  const definition = dayGridView({ days: 1, groupBy: 'resource', maxEventsPerDay: 3, features: { backgroundFeature } });
  const views = createCalendarViews({ day: definition });
  const calendar = createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: views.features,
    view: 'day',
    date: Temporal.PlainDate.from('2026-03-11'),
    events: [],
    resources: [fixtures_resource('a'), fixtures_resource('b')],
    onNavigate: () => {},
    backgrounds: [{ id: 'holiday', kind: 'holiday', resourceIds: ['b'], ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }] }],
  });
  const cells = calendar.store.state.layout.sections[0]?.rows[0]?.days;
  expect(cells?.map(day => day.backgrounds.length)).toEqual([0, 1]);
});

it('filters workweek time-grid columns and all-day spans', () => {
  const { layout } = setup(timeGridView({ weeks: 1, hiddenDays: [6, 7] }), {
    date: '2026-03-09',
    firstDayOfWeek: 1,
    events: [fixtures_allDay('weekend', { start: '2026-03-14' }), fixtures_allDay('span', { start: '2026-03-12', end: '2026-03-15' })],
  });
  const model = layout as Calendar_TimeGridLayout<Fixtures_EventData, null>;
  expect(model.columns).toHaveLength(5);
  expect(model.allDay?.segments).toEqual([expect.objectContaining({ colStart: 3, colSpan: 2 })]);
});

it('omits hidden dates from lists without changing their navigation period', () => {
  const { layout, calendar } = setup(listView({ weeks: 1, hiddenDays: [6, 7] }), {
    firstDayOfWeek: 1,
    events: [fixtures_allDay('weekend', { start: '2026-03-14' }), fixtures_allDay('weekday', { start: '2026-03-11' })],
  });
  expect((layout as Calendar_ListLayout<Fixtures_EventData>).days.map(day => day.key)).toEqual(['2026-03-11']);
  expect(calendar.store.state.context.period.end.toString()).toBe('2026-03-15');
});

it('compresses hidden timeline dates for events, availability and now', () => {
  const { layout } = setup(timelineView({ days: 4, hiddenDays: [6, 7], groupBy: 'resource', slotMinutes: 1440 }), {
    date: '2026-03-13',
    now: '2026-03-16T12:00[America/New_York]',
    resources: [fixtures_resource('a', [{ date: '2026-03-13', start: '00:00', end: '00:00', endDate: '2026-03-17' }])],
    events: [
      fixtures_allDay('span', { start: '2026-03-13', end: '2026-03-16', resourceIds: ['a'] }),
      fixtures_timed('hidden', { date: '2026-03-14', start: '09:00', end: '10:00', resourceIds: ['a'] }),
    ],
  });
  const model = layout as Calendar_TimelineLayout<Fixtures_EventData, null>;
  expect(model.days.map(day => day.key)).toEqual(['2026-03-13', '2026-03-16']);
  expect(model.rows[0]?.segments).toEqual([expect.objectContaining({ start: 0, span: 1 })]);
  expect(model.rows[0]?.unavailable).toEqual([]);
  expect(model.now).toBeCloseTo(0.75);
});

it.each(['2026-03-08', '2026-11-01'])('keeps clock slot boundaries aligned across DST on %s', date => {
  const { layout } = setup(timelineView({ days: 1, slotMinutes: 60 }), {
    date,
    now: `${date}T12:00[America/New_York]`,
    events: [fixtures_timed('noon', { date, start: '12:00', end: '13:00' })],
  });
  const model = layout as Calendar_TimelineLayout<Fixtures_EventData, null>;
  expect(model.slots).toHaveLength(24);
  expect(new Set(model.slots.map(slot => slot.key)).size).toBe(24);
  const noon = model.slots.find(slot => slot.time.hour === 12);
  expect(model.rows[0]?.segments[0]?.start).toBeCloseTo(noon!.start);
  expect(model.now).toBeCloseTo(noon!.start);
  expect(model.slots.reduce((sum, slot) => sum + slot.span, 0)).toBeCloseTo(1);
});

it('keeps one daily slot per calendar date across daylight saving', () => {
  const { layout } = setup(timelineView({ days: 3, slotMinutes: 1440 }), { date: '2026-03-07' });
  const model = layout as Calendar_TimelineLayout<Fixtures_EventData, null>;
  expect(model.slots).toHaveLength(3);
  expect(model.days.map(day => day.span)).toEqual([1 / 3, 1 / 3, 1 / 3]);
});

it('shows the selected date when hidden weekdays would leave the range empty', () => {
  const options = { date: '2026-03-14' };
  const rows = grid(dayGridView({ days: 1, hiddenDays: [6], maxEventsPerDay: 3 }), options).layout.sections[0]?.rows;
  const timeline = setup(timelineView({ days: 1, hiddenDays: [6] }), options).layout as Calendar_TimelineLayout<unknown, unknown>;
  expect(rows?.flatMap(row => row.days.map(day => day.date.toString()))).toEqual(['2026-03-14']);
  expect(timeline.days.map(day => day.date.toString())).toEqual(['2026-03-14']);
});

it('rejects invalid durations, visibility and duplicate grouping keys', () => {
  expect(() => timeGridView({ days: 0 })).toThrow('positive integers');
  expect(() => listView({ months: 1.5 })).toThrow('positive integers');
  expect(() => timelineView({ days: 1, hiddenDays: [1, 2, 3, 4, 5, 6, 7] })).toThrow('leave at least one');
  // @ts-expect-error -- grouping keys are unique (D44)
  expect(() => dayGridView({ period: 'year', groupBy: ['month', 'month'], maxEventsPerDay: 3 })).toThrow('distinct');
  // @ts-expect-error -- month grouping needs month-based periods (D44)
  expect(() => dayGridView({ days: 3, groupBy: 'month', maxEventsPerDay: 3 })).toThrow('calendar-month duration');
});
