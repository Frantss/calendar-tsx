import { calendarFeatures } from '#features/calendar-features';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { getCalendarNavigation } from '#calendar-navigation';
import { calendarViews, listView, dayGridView, timeGridView } from '#calendar-views';

const views = {
  month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
  grid_weeks: dayGridView({ weeks: 4, maxEventsPerDay: 4 }),
  week: timeGridView({ days: 7 }),
  day: timeGridView({ days: 1 }),
  three_days: timeGridView({ days: 3 }),
  list_week: listView({ days: 7 }),
};

const date = (value: string) => Temporal.PlainDate.from(value);
const range = (navigation: { start: Temporal.PlainDate; end: Temporal.PlainDate }) => `${navigation.start}…${navigation.end}`;

it('pads a month range to whole weeks starting on Sunday', async () => {
  const navigation = getCalendarNavigation(views, 'month', date('2026-03-11'), { firstDayOfWeek: 7 });

  expect(range(navigation.period)).toBe('2026-03-01…2026-03-31');
  expect(range(navigation.range)).toBe('2026-03-01…2026-04-04');
});

it('starts weeks on the configured first day', async () => {
  const sunday = getCalendarNavigation(views, 'week', date('2026-03-11'), { firstDayOfWeek: 7 });
  const monday = getCalendarNavigation(views, 'week', date('2026-03-11'), { firstDayOfWeek: 1 });

  expect(range(sunday.range)).toBe('2026-03-08…2026-03-14');
  expect(range(monday.range)).toBe('2026-03-09…2026-03-15');
});

it('defaults the first day of the week to Sunday', async () => {
  expect(range(getCalendarNavigation(views, 'list_week', date('2026-03-11')).range)).toBe('2026-03-08…2026-03-14');
});

it('aligns month padding and multiweek grids to the configured first day', () => {
  const month = getCalendarNavigation(views, 'month', date('2026-03-11'), { firstDayOfWeek: 1 });
  const weeks = getCalendarNavigation(views, 'grid_weeks', date('2026-03-11'), { firstDayOfWeek: 1 });

  expect(range(month.period)).toBe('2026-03-01…2026-03-31');
  expect(range(month.range)).toBe('2026-02-23…2026-04-05');
  expect(range(weeks.period)).toBe('2026-03-09…2026-04-05');
  expect(weeks.range).toEqual(weeks.period);
});

it('registers one layout feature for both month and week day grids', () => {
  const gridsFeatures = calendarFeatures({});
  const grids = calendarViews({ features: gridsFeatures, views: { month: views.month, weeks: views.grid_weeks } });

  expect(Object.values(grids).map(view => Object.keys(view['~features']))).toEqual([['dayGridLayout'], ['dayGridLayout']]);
});

it('anchors non-week durations on the date itself', async () => {
  expect(range(getCalendarNavigation(views, 'day', date('2026-03-11')).range)).toBe('2026-03-11…2026-03-11');
  expect(range(getCalendarNavigation(views, 'three_days', date('2026-03-11')).range)).toBe('2026-03-11…2026-03-13');
});

it('echoes the view key and date', async () => {
  const navigation = getCalendarNavigation(views, 'list_week', date('2026-03-11'));

  expect(navigation.view).toBe('list_week');
  expect(navigation.date.toString()).toBe('2026-03-11');
});

it('throws for an unknown view', async () => {
  expect(() => getCalendarNavigation(views, 'agenda' as keyof typeof views, date('2026-03-11'))).toThrow('unknown view "agenda"');
});
