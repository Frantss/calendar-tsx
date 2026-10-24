import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { listView, timeGridView } from '#calendar-views';
import { createCalendar } from '#calendar';
import { createCalendarViews } from '#calendar-views';
import type { Calendar_ListGrouping, Calendar_ListLayout } from '#calendar.types';
import { fixtures_allDay, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import type { CalendarSetup_Overrides } from '#tests/calendar.setup';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

const setup = async (overrides: CalendarSetup_Overrides = {}) => {
  const utils = await calendarSetup_create({ view: 'list_week', ...overrides });

  return { ...utils, layout: utils.state().layout as Calendar_ListLayout<unknown> };
};

it('lists only days with events, in order', async () => {
  const utils = await setup({
    events: [
      fixtures_timed('swim', { date: '2026-03-13', start: '14:00', end: '15:00' }),
      fixtures_timed('yoga', { date: '2026-03-09', start: '09:00', end: '10:00' }),
      fixtures_allDay('fair', { start: '2026-03-12', end: '2026-03-13' }),
    ],
  });

  expect(utils.layout.days.map(day => `${day.key}:${day.events.map(event => event.id).join(',')}`)).toEqual([
    '2026-03-09:yoga',
    '2026-03-12:fair',
    '2026-03-13:fair,swim',
  ]);
});

it('has no days when the range has no events', async () => {
  const utils = await setup({ date: Temporal.PlainDate.from('2026-04-15') });

  expect(utils.layout.days).toEqual([]);
});

const periodViews = {
  ...calendarSetup_defaults.views,
  list_month: listView({ period: 'month' }),
  list_year: listView({ period: 'year' }),
};

it('lists the calendar month containing the date and steps to the next 1st', async () => {
  const utils = await setup({
    view: 'list_month',
    views: periodViews,
    events: [
      fixtures_timed('feb', { date: '2026-02-28', start: '09:00', end: '10:00' }),
      fixtures_timed('first', { date: '2026-03-01', start: '09:00', end: '10:00' }),
      fixtures_timed('last', { date: '2026-03-31', start: '09:00', end: '10:00' }),
      fixtures_timed('apr', { date: '2026-04-01', start: '09:00', end: '10:00' }),
    ],
  });

  expect(utils.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-03-01'), end: Temporal.PlainDate.from('2026-03-31') });
  expect(utils.layout.days.map(day => day.key)).toEqual(['2026-03-01', '2026-03-31']);

  utils.instance.api.next();
  utils.instance.api.prev();

  expect(utils.mocks.onNavigate.mock.calls.map(([next]) => next.date.toString())).toEqual(['2026-04-01', '2026-02-01']);
});

it('lists the calendar year containing the date and steps to the next 1 January', async () => {
  const utils = await setup({
    view: 'list_year',
    views: periodViews,
    events: [
      fixtures_allDay('new-year', { start: '2025-12-31', end: '2026-01-01' }),
      fixtures_timed('summer', { date: '2026-07-14', start: '09:00', end: '10:00' }),
      fixtures_timed('later', { date: '2027-01-01', start: '09:00', end: '10:00' }),
    ],
  });

  expect(utils.state().context.range).toMatchObject({ start: Temporal.PlainDate.from('2026-01-01'), end: Temporal.PlainDate.from('2026-12-31') });
  expect(utils.layout.days.map(day => day.key)).toEqual(['2026-01-01', '2026-07-14']);

  utils.instance.api.next();

  expect(utils.mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2027-01-01');
});

it('takes either days or a period, not both', () => {
  // @ts-expect-error -- `days` and `period` are exclusive (D36)
  expect(() => listView({ days: 7, period: 'month' })).toThrow('provide exactly one');
});

const grouped = (groupBy: Calendar_ListGrouping, overrides: CalendarSetup_Overrides = {}) =>
  setup({
    view: 'resource_list',
    views: { resource_list: listView({ weeks: 1, groupBy }) },
    resources: [fixtures_resource('b'), fixtures_resource('a'), fixtures_resource('empty')],
    events: [
      fixtures_allDay('shared', { start: '2026-03-11', end: '2026-03-12', resourceIds: ['a', 'b'] }),
      fixtures_timed('b-only', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['b'] }),
      fixtures_timed('unassigned', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('unknown', { date: '2026-03-11', start: '09:00', end: '10:00', resourceIds: ['missing'] }),
      fixtures_background(fixtures_allDay('background', { start: '2026-03-11', resourceIds: ['a'] })),
    ],
    ...overrides,
  });

it.each([{ groupBy: 'resource' }, { groupBy: ['resource'] }, { groupBy: ['resource', 'date'] }] as const)(
  'groups resources before dates with $groupBy',
  async ({ groupBy }) => {
    const { layout } = await grouped(groupBy);
    expect(layout.sections.map(section => section.resource?.id)).toEqual(['b', 'a']);
    expect(layout.sections.map(section => section.days.map(day => day.date.toString()))).toEqual([
      ['2026-03-11', '2026-03-12'],
      ['2026-03-11', '2026-03-12'],
    ]);
    expect(layout.days.map(day => day.events.map(event => event.id))).toEqual([['shared', 'b-only'], ['shared'], ['shared'], ['shared']]);
    expect(layout.days.every(day => day.resource)).toBe(true);
    expect(new Set(layout.days.map(day => day.key)).size).toBe(4);
    expect(new Set(layout.sections.map(section => section.key)).size).toBe(2);
    expect(layout.days[0]).toBe(layout.sections[0]?.days[0]);
  },
);

it('groups dates before resources in chronological and resource input order', async () => {
  const { layout } = await grouped(['date', 'resource']);
  expect(layout.sections.map(section => section.date?.toString())).toEqual(['2026-03-11', '2026-03-12']);
  expect(layout.sections.map(section => section.days.map(day => day.resource?.id))).toEqual([
    ['b', 'a'],
    ['b', 'a'],
  ]);
  expect(layout.days.map(day => day.events.map(event => event.id))).toEqual([['shared', 'b-only'], ['shared'], ['shared'], ['shared']]);
});

it.each([{ groupBy: 'date' }, { groupBy: ['date'] }] as const)('keeps ordinary lists and flat days with $groupBy', async ({ groupBy }) => {
  const { layout } = await grouped(groupBy);
  expect(layout.sections).toHaveLength(1);
  expect(layout.sections[0]?.resource).toBeUndefined();
  expect(layout.sections[0]?.date).toBeUndefined();
  expect(layout.days[0]?.key).toBe('2026-03-11');
  expect(layout.days[0]?.resource).toBeUndefined();
  expect(layout.days[0]?.events.map(event => event.id)).toEqual(['shared', 'b-only', 'unassigned', 'unknown']);
  expect(layout.days[0]).toBe(layout.sections[0]?.days[0]);
});

it('projects overnight events onto visible dates and preserves custom event order', async () => {
  const utils = await grouped(['date', 'resource'], {
    views: { resource_list: listView({ weeks: 1, hiddenDays: [4], groupBy: ['date', 'resource'] }) },
    events: [
      fixtures_timed('a', { date: '2026-03-11', start: '23:00', endDate: '2026-03-13', end: '00:00', resourceIds: ['a'] }),
      fixtures_allDay('z', { start: '2026-03-11', end: '2026-03-12', resourceIds: ['a'] }),
    ],
    eventOrder: (a, b) => b.id.localeCompare(a.id),
  });
  expect(utils.layout.days.map(day => day.date.toString())).toEqual(['2026-03-11']);
  expect(utils.layout.days[0]?.events.map(event => event.id)).toEqual(['z', 'a']);
});

it.each([{ resources: [] }, { resources: [fixtures_resource('a')] }])('has no sections without matching resource events', async ({ resources }) => {
  const { layout } = await grouped('resource', {
    resources,
    events: [fixtures_allDay('unassigned', { start: '2026-03-11' })],
  });
  expect(layout.sections).toEqual([]);
  expect(layout.days).toEqual([]);
});

it('rejects unsupported or repeated list grouping keys', () => {
  // @ts-expect-error month is a day-grid grouping key
  expect(() => listView({ weeks: 1, groupBy: 'month' })).toThrow('distinct date or resource');
  // @ts-expect-error grouping keys must be unique
  expect(() => listView({ weeks: 1, groupBy: ['resource', 'resource'] })).toThrow('distinct date or resource');
  // @ts-expect-error date grouping is specific to lists
  expect(() => timeGridView({ days: 1, groupBy: ['date', 'resource'] })).toThrow('distinct month or resource');
});

it('keeps resource data typed through the calendar layout', () => {
  const views = createCalendarViews({ agenda: listView({ weeks: 1, groupBy: 'resource' }) });
  const calendar = createCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: views.features,
    view: 'agenda',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: () => {},
    resources: [{ ...fixtures_resource('a'), data: { capacity: 12 } }],
    events: [fixtures_allDay('meeting', { start: '2026-03-11', resourceIds: ['a'] })],
  });
  const layout = calendar.store.state.layout;
  const capacity: number | undefined = layout.sections[0]?.resource?.data.capacity;
  expect(capacity).toBe(12);
  expect(layout.days[0]?.resource?.data.capacity).toBe(12);
});

it('groups timed events by their date in the calendar time zone', async () => {
  const { layout } = await grouped(['date', 'resource'], {
    events: [
      {
        id: 'utc',
        kind: 'timed',
        resourceIds: ['a'],
        data: { title: 'UTC meeting' },
        start: Temporal.ZonedDateTime.from('2026-03-12T01:00[UTC]'),
        end: Temporal.ZonedDateTime.from('2026-03-12T02:00[UTC]'),
      },
    ],
  });
  expect(layout.sections.map(section => section.date?.toString())).toEqual(['2026-03-11']);
  expect(layout.days[0]?.events[0]?.id).toBe('utc');
});
