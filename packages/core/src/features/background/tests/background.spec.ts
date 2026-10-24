import { calendarFeatures } from '#features/calendar-features';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';

import { createCalendar } from '#calendar';
import { backgroundFeature } from '#features/background/background-feature';
import { createBackgroundLayer, createWeeklyRanges } from '#features/background/background-ranges';
import { fixedClock } from '#calendar-clock';
import { dayGridView, timeGridView, calendarViews } from '#calendar-views';
import type { Calendar_BackgroundLayer, Calendar_BackgroundSegment, Calendar_DayBackground } from '#calendar.types';
import { fixtures_at, fixtures_resource, fixtures_timeZone } from '#tests/calendar.fixtures';

const viewsFeatures = calendarFeatures({ backgroundFeature: backgroundFeature() });
const views = calendarViews({
  features: viewsFeatures,
  views: {
    week: timeGridView({ days: 7 }),
    resources: timeGridView({ days: 1, groupBy: 'resource' }),
    month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
    plain: timeGridView({ days: 1 }),
  },
});

const businessHours = createBackgroundLayer({
  id: 'business-hours',
  kind: 'closed',
  inverse: true,
  ranges: createWeeklyRanges([
    { daysOfWeek: [1, 2, 3, 4, 5], startTime: Temporal.PlainTime.from('09:00'), endTime: Temporal.PlainTime.from('17:00') },
  ]),
});

const holiday = createBackgroundLayer({
  id: 'holiday',
  kind: 'holiday',
  ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }],
});

const setup = (view: keyof typeof views, backgrounds: Calendar_BackgroundLayer[]) =>
  createCalendar({
    timeZone: fixtures_timeZone,
    views: views,
    features: { ...viewsFeatures, backgroundFeature: backgroundFeature(backgrounds) },
    view,
    // Wednesday; the week runs Sunday 8 (a 23-hour DST day) to Saturday 14
    date: Temporal.PlainDate.from('2026-03-11'),
    firstDayOfWeek: 7,
    onNavigate: vi.fn(),
    events: [],
    resources: [fixtures_resource('a'), fixtures_resource('b')],
    clock: fixedClock(Temporal.Instant.from('2026-03-11T15:00:00Z')),
  });

const columns = (calendar: ReturnType<typeof setup>) => {
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'timeGrid') throw new Error('expected a time grid');

  return Object.fromEntries(
    layout.columns.map(column => [
      column.key,
      (column as { backgrounds?: Calendar_BackgroundSegment[] }).backgrounds?.map(
        ({ kind, start, span }) => `${kind} ${start.toFixed(4)}+${span.toFixed(4)}`,
      ),
    ]),
  );
};

const days = (calendar: ReturnType<typeof setup>) => {
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'dayGrid') throw new Error('expected a day grid');

  return Object.fromEntries(
    layout.sections
      .flatMap(section => section.rows)
      .flatMap(week =>
        week.days.map(day => [day.key, (day as { backgrounds?: Calendar_DayBackground[] }).backgrounds?.map(background => background.kind)]),
      ),
  );
};

const fraction = (hours: number, dayHours = 24) => (hours / dayHours).toFixed(4);

it('shades the gaps of an inverse weekly layer', () => {
  const week = columns(setup('week', [businessHours]));

  expect(week['all:2026-03-11']).toEqual([`closed ${fraction(0)}+${fraction(9)}`, `closed ${fraction(17)}+${fraction(7)}`]);
  expect(week['all:2026-03-14']).toEqual([`closed ${fraction(0)}+${fraction(24)}`]);
});

it('shades the whole column for an all-day range', () => {
  expect(columns(setup('week', [holiday]))['all:2026-03-11']).toEqual([`holiday ${fraction(0)}+${fraction(24)}`]);
});

it('merges overlapping ranges within a layer', () => {
  const blocked: Calendar_BackgroundLayer = {
    id: 'blocked',
    kind: 'blocked',
    ranges: [
      { start: fixtures_at('2026-03-12', '13:00'), end: fixtures_at('2026-03-12', '15:00') },
      { start: fixtures_at('2026-03-12', '14:00'), end: fixtures_at('2026-03-12', '16:00') },
    ],
  };

  expect(columns(setup('week', [blocked]))['all:2026-03-12']).toEqual([`blocked ${fraction(13)}+${fraction(3)}`]);
});

it('stacks layers in input order', () => {
  expect(columns(setup('week', [businessHours, holiday]))['all:2026-03-11']?.map(item => item.split(' ')[0])).toEqual([
    'closed',
    'closed',
    'holiday',
  ]);
});

it('aligns background fractions with the fixed clock axis on a DST day', () => {
  const layer: Calendar_BackgroundLayer = {
    id: 'yoga',
    kind: 'busy',
    ranges: [{ start: fixtures_at('2026-03-08', '09:00'), end: fixtures_at('2026-03-08', '10:00') }],
  };

  expect(columns(setup('week', [layer]))['all:2026-03-08']).toEqual([`busy ${fraction(9)}+${fraction(1)}`]);
});

it('limits a layer to the resources it names', () => {
  const resources = columns(setup('resources', [{ ...holiday, resourceIds: ['a'] }]));

  expect(resources['a:2026-03-11']).toEqual([`holiday ${fraction(0)}+${fraction(24)}`]);
  expect(resources['b:2026-03-11']).toEqual([]);
});

it('skips resource layers in columns without a resource', () => {
  expect(columns(setup('week', [{ ...holiday, resourceIds: ['a'] }]))['all:2026-03-11']).toEqual([]);
});

it('marks month days from all-day ranges and the days an inverse layer leaves closed', () => {
  const blocked: Calendar_BackgroundLayer = {
    id: 'blocked',
    kind: 'blocked',
    ranges: [{ start: fixtures_at('2026-03-12', '13:00'), end: fixtures_at('2026-03-12', '15:00') }],
  };
  const month = days(setup('month', [businessHours, holiday, blocked]));

  expect(month['2026-03-11']).toEqual(['holiday']);
  expect(month['2026-03-12']).toEqual([]);
  expect(month['2026-03-14']).toEqual(['closed']);
  expect(month['2026-03-15']).toEqual(['closed']);
});

it('passes the visible range and time zone to a ranges function', () => {
  const ranges = vi.fn(() => []);

  const calendar = setup('week', [{ id: 'spy', kind: 'spy', ranges }]);

  expect(calendar.store.state.layout.kind).toBe('timeGrid');

  expect(ranges).toHaveBeenCalledWith(
    { start: Temporal.PlainDate.from('2026-03-08'), end: Temporal.PlainDate.from('2026-03-14') },
    fixtures_timeZone,
  );
});

it('inherits background layers in views without overrides', () => {
  expect(columns(setup('plain', [holiday]))['all:2026-03-11']).toEqual([`holiday ${fraction(0)}+${fraction(24)}`]);
});

it('re-derives when the backgrounds change', () => {
  const calendar = setup('week', []);

  expect(columns(calendar)['all:2026-03-11']).toEqual([]);

  calendar['~update']({
    ...calendar.options,
    views: { ...calendar.options.views, week: { ...calendar.options.views.week, features: { backgroundFeature: [holiday] } } },
  });

  expect(columns(calendar)['all:2026-03-11']).toEqual([`holiday ${fraction(0)}+${fraction(24)}`]);
});

it('ends a weekly rule the next day when it ends at or before its start', () => {
  const night = createWeeklyRanges([{ daysOfWeek: [3], startTime: Temporal.PlainTime.from('22:00'), endTime: Temporal.PlainTime.from('02:00') }]);
  const ranges = night({ start: Temporal.PlainDate.from('2026-03-11'), end: Temporal.PlainDate.from('2026-03-11') }, fixtures_timeZone);

  expect(ranges).toEqual([{ start: fixtures_at('2026-03-11', '22:00'), end: fixtures_at('2026-03-12', '02:00') }]);
});
