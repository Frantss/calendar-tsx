import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { timelineView } from '#calendar-views';
import type { Calendar_TimelineLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_at, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

const views = {
  ...calendarSetup_defaults.views,
  timeline: timelineView({ days: 1 }),
  timeline_week: timelineView({ days: 7 }),
  resources_timeline: timelineView({ days: 1, groupBy: 'resource' }),
  resources_timeline_week: timelineView({ days: 7, groupBy: 'resource' }),
};

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'timeline', views, ...overrides });
  const layout = utils.state().layout as Calendar_TimelineLayout<unknown, null>;
  const row = (key: string) => layout.rows.find(candidate => candidate.key === key);

  return {
    ...utils,
    layout,
    row,
    stacks: (key: string) => row(key)?.segments.map(segment => `${segment.event.id}:${segment.row}`),
  };
};

/** Clock-time fraction of the displayed range, independent of DST offsets. */
const fractionOf = (at: Temporal.ZonedDateTime, from: Temporal.ZonedDateTime, to: Temporal.ZonedDateTime) =>
  from.toPlainDateTime().until(at.toPlainDateTime()).total({ unit: 'hours' }) /
  from.toPlainDateTime().until(to.toPlainDateTime()).total({ unit: 'hours' });

it('has 24 hourly slots under one day header in a 1-day timeline', async () => {
  const utils = await setup();

  expect(utils.layout.slots).toHaveLength(24);
  expect(utils.layout.slots[9]).toMatchObject({ col: 9, time: Temporal.PlainTime.from('09:00') });
  expect(utils.layout.days).toEqual([expect.objectContaining({ key: '2026-03-11', isToday: true, colStart: 0, colSpan: 24 })]);
});

it('starts a 7-day timeline on the first day of the week and honours slotMinutes', async () => {
  const utils = await setup({
    view: 'half_hours',
    views: { ...views, half_hours: timelineView({ days: 7, slotMinutes: 30 }) },
  });

  expect(utils.state().context.range.start.toString()).toBe('2026-03-08');
  expect(utils.layout.slotMinutes).toBe(30);
  expect(utils.layout.hourOffset).toBe(0);
  expect(utils.layout.slots).toHaveLength(7 * 48);
  expect(utils.layout.days.map(day => day.colStart)).toEqual([0, 48, 96, 144, 192, 240, 288]);
});

it('steps by the number of days', async () => {
  const utils = await setup({ view: 'timeline_week' });

  utils.instance.api.next();

  expect(utils.mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-18');
});

it('stacks overlapping events into rows and keeps touching events on one row', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
      fixtures_timed('spin', { date: '2026-03-11', start: '10:00', end: '10:30' }),
      fixtures_timed('swim', { date: '2026-03-11', start: '11:00', end: '12:00' }),
    ],
  });

  expect(utils.stacks('all')).toEqual(['yoga:0', 'pilates:1', 'spin:0', 'swim:0']);
  expect(utils.row('all')?.rows).toBe(2);
});

it('positions events as fractions of the range', async () => {
  const utils = await setup({ events: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const segment = utils.row('all')?.segments[0];

  expect(segment?.start).toBeCloseTo(0.375);
  expect(segment?.span).toBeCloseTo(1 / 24);
});

it.each(['month', 'quarter', 'year'] as const)('gives brief events half a daily slot and stacks their display spans in a %s', async period => {
  const first = fixtures_timed('first', { date: '2026-03-11', start: '09:00', end: '09:15' });
  const utils = await setup({
    views: { timeline: timelineView({ period, slotMinutes: 1440 }) },
    events: [first, fixtures_timed('second', { date: '2026-03-11', start: '09:15', end: '09:30' })],
  });
  const day = utils.layout.days.find(candidate => candidate.key === '2026-03-11')!;
  const [a, b] = utils.row('all')!.segments;

  expect(a!.span).toBeCloseTo(day.span / 2, 10);
  expect(b!.span).toBeCloseTo(day.span / 2, 10);
  expect(utils.stacks('all')).toEqual(['first:0', 'second:1']);
  expect(utils.row('all')!.rows).toBe(2);
  expect(a!.event.end?.toString()).toBe(first.end.toString());
});

it('uses half an hourly slot by default and lets touching display spans share a stack row', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('first', { date: '2026-03-11', start: '09:00', end: '09:05' }),
      fixtures_timed('second', { date: '2026-03-11', start: '09:05', end: '09:10' }),
      fixtures_timed('third', { date: '2026-03-11', start: '09:30', end: '09:35' }),
    ],
  });

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo(30 / 1440, 10);
  expect(utils.stacks('all')).toEqual(['first:0', 'second:1', 'third:0']);
});

it('accepts an explicit timeline minimum and clips display spans at the range end', async () => {
  const utils = await setup({
    views: { timeline: timelineView({ days: 1, minEventMinutes: 60 }) },
    events: [
      fixtures_timed('early', { date: '2026-03-11', start: '09:00', end: '09:05' }),
      fixtures_timed('late', { date: '2026-03-11', start: '23:45', end: '23:50' }),
    ],
  });
  const segment = utils.row('all')!.segments[1]!;

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo(60 / 1440, 10);
  expect(segment.span).toBeCloseTo(15 / 1440, 10);
  expect(segment.start + segment.span).toBeCloseTo(1);
  expect(segment.continuesAfter).toBe(false);
  expect(segment.event.kind === 'timed' && segment.event.end.toPlainTime().toString()).toBe('23:50:00');
});

it('can disable the minimum to use exact durations and stack only actual overlaps', async () => {
  const utils = await setup({
    views: { timeline: timelineView({ period: 'month', slotMinutes: 1440, minEventMinutes: 0 }) },
    events: [
      fixtures_timed('first', { date: '2026-03-11', start: '09:00', end: '09:15' }),
      fixtures_timed('second', { date: '2026-03-11', start: '09:15', end: '09:30' }),
    ],
  });
  const day = utils.layout.days.find(candidate => candidate.key === '2026-03-11')!;

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo((day.span * 15) / 1440, 10);
  expect(utils.stacks('all')).toEqual(['first:0', 'second:0']);
});

it('stacks minimum display spans across compressed hidden dates', async () => {
  const utils = await setup({
    date: Temporal.PlainDate.from('2026-03-13'),
    views: { timeline: timelineView({ days: 4, hiddenDays: [6, 7], slotMinutes: 1440 }) },
    events: [
      fixtures_timed('friday', { date: '2026-03-13', start: '23:45', end: '23:50' }),
      fixtures_timed('monday', { date: '2026-03-16', start: '00:00', end: '00:05' }),
    ],
  });

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo(12 / 48, 10);
  expect(utils.stacks('all')).toEqual(['friday:0', 'monday:1']);
});

it.each(['2026-03-08', '2026-11-01'])('measures the minimum in displayed clock minutes on %s', async date => {
  const utils = await setup({
    date: Temporal.PlainDate.from(date),
    views: { timeline: timelineView({ days: 1, slotMinutes: 1440 }) },
    events: [fixtures_timed('brief', { date, start: '09:00', end: '09:05' })],
  });

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo(12 / 24, 10);
});

it('does not stretch all-day dates to a timed-event minimum', async () => {
  const utils = await setup({
    views: { timeline: timelineView({ days: 7, minEventMinutes: 2880 }) },
    events: [fixtures_allDay('fair', { start: '2026-03-11' })],
  });

  expect(utils.row('all')!.segments[0]!.span).toBeCloseTo(24 / 168, 10);
});

it('keeps an event crossing midnight as one segment and clips one starting before the range', async () => {
  const overnight = fixtures_timed('camp', { date: '2026-03-12', start: '20:00', end: '08:00', endDate: '2026-03-13' });
  const early = fixtures_timed('night', { date: '2026-03-07', start: '22:00', end: '02:00', endDate: '2026-03-08' });
  const utils = await setup({ view: 'timeline_week', events: [overnight, early] });
  const weekStart = fixtures_at('2026-03-08', '00:00');
  const weekEnd = fixtures_at('2026-03-15', '00:00');
  const camp = utils.row('all')?.segments.find(segment => segment.event.id === 'camp');
  const night = utils.row('all')?.segments.find(segment => segment.event.id === 'night');

  expect(utils.row('all')?.segments).toHaveLength(2);
  expect(camp).toMatchObject({ continuesBefore: false, continuesAfter: false });
  expect(camp?.start).toBeCloseTo(fractionOf(fixtures_at('2026-03-12', '20:00'), weekStart, weekEnd));
  expect(camp?.span).toBeCloseTo(fractionOf(fixtures_at('2026-03-13', '08:00'), weekStart, weekEnd) - (camp?.start ?? 0));
  expect(night).toMatchObject({ start: 0, continuesBefore: true, continuesAfter: false });
});

it('spans all-day events from midnight to midnight in the same stack', async () => {
  const utils = await setup({
    view: 'timeline_week',
    events: [
      fixtures_allDay('fair', { start: '2026-03-10', end: '2026-03-11' }),
      fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
    ],
  });
  const weekStart = fixtures_at('2026-03-08', '00:00');
  const weekEnd = fixtures_at('2026-03-15', '00:00');
  const fair = utils.row('all')?.segments.find(segment => segment.event.id === 'fair');

  expect(fair?.isAllDay).toBe(true);
  expect(fair?.isMultiDay).toBe(true);
  expect(utils.row('all')?.segments.find(segment => segment.event.id === 'yoga')?.isMultiDay).toBe(false);
  expect(fair?.start).toBeCloseTo(fractionOf(fixtures_at('2026-03-10', '00:00'), weekStart, weekEnd));
  expect((fair?.start ?? 0) + (fair?.span ?? 0)).toBeCloseTo(fractionOf(fixtures_at('2026-03-12', '00:00'), weekStart, weekEnd));
  expect(utils.stacks('all')).toEqual(['fair:0', 'yoga:1']);
});

it('shows an event in every resource row it references, in resource order', async () => {
  const utils = await setup({
    view: 'resources_timeline',
    resources: [fixtures_resource('ana'), fixtures_resource('room'), fixtures_resource('projector')],
    events: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['ana', 'room'] })],
  });

  expect(utils.layout.rows.map(row => `${row.resource?.id}:${row.segments.length}`)).toEqual(['ana:1', 'room:1', 'projector:0']);
});

it('has one row with no resource without groupBy', async () => {
  const utils = await setup({ resources: [fixtures_resource('ana')] });

  expect(utils.layout.rows).toEqual([expect.objectContaining({ key: 'all', resource: undefined, isUnavailable: false, unavailable: [] })]);
});

it('shades the complement of availability over the whole range', async () => {
  const utils = await setup({
    view: 'resources_timeline_week',
    resources: [fixtures_resource('ana', [{ date: '2026-03-11', start: '09:00', end: '17:00' }])],
  });
  const weekStart = fixtures_at('2026-03-08', '00:00');
  const weekEnd = fixtures_at('2026-03-15', '00:00');
  const shades = utils.row('ana')?.unavailable.map(segment => [segment.start, segment.start + segment.span]);

  expect(shades).toHaveLength(2);
  expect(shades?.[0]?.[0]).toBe(0);
  expect(shades?.[0]?.[1]).toBeCloseTo(fractionOf(fixtures_at('2026-03-11', '09:00'), weekStart, weekEnd));
  expect(shades?.[1]?.[0]).toBeCloseTo(fractionOf(fixtures_at('2026-03-11', '17:00'), weekStart, weekEnd));
  expect(shades?.[1]?.[1]).toBeCloseTo(1);
  expect(utils.row('ana')?.isUnavailable).toBe(false);
});

it('shades the whole row for a resource with no availability in the range', async () => {
  const utils = await setup({
    view: 'resources_timeline',
    resources: [fixtures_resource('room', [{ date: '2026-03-12', start: '09:00', end: '17:00' }])],
  });

  expect(utils.row('room')).toMatchObject({ isUnavailable: true, unavailable: [expect.objectContaining({ start: 0, span: 1 })] });
});

it('places now at the clock fraction and omits it outside the range', async () => {
  const today = await setup();

  expect(today.layout.now).toBeCloseTo((10 + 40 / 60) / 24);

  const tomorrow = await setup({ date: Temporal.PlainDate.from('2026-03-12') });

  expect(tomorrow.layout.now).toBeUndefined();
});
