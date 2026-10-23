import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import { calendar_navigation } from '#calendar-navigation';
import { calendarView_list, calendarView_month, calendarView_timeGrid } from '#calendar-views';

const views = {
  month: calendarView_month({ maxEventsPerDay: 4 }),
  week: calendarView_timeGrid({ days: 7 }),
  day: calendarView_timeGrid({ days: 1 }),
  three_days: calendarView_timeGrid({ days: 3 }),
  list_week: calendarView_list({ days: 7 }),
};

const date = (value: string) => Temporal.PlainDate.from(value);
const range = (navigation: { start: Temporal.PlainDate; end: Temporal.PlainDate }) => `${navigation.start}…${navigation.end}`;

it('pads a month range to whole weeks starting on Sunday', async () => {
  const navigation = calendar_navigation(views, 'month', date('2026-03-11'), { firstDayOfWeek: 7 });

  expect(range(navigation.period)).toBe('2026-03-01…2026-03-31');
  expect(range(navigation.range)).toBe('2026-03-01…2026-04-04');
});

it('starts weeks on the configured first day', async () => {
  const sunday = calendar_navigation(views, 'week', date('2026-03-11'), { firstDayOfWeek: 7 });
  const monday = calendar_navigation(views, 'week', date('2026-03-11'), { firstDayOfWeek: 1 });

  expect(range(sunday.range)).toBe('2026-03-08…2026-03-14');
  expect(range(monday.range)).toBe('2026-03-09…2026-03-15');
});

it('defaults the first day of the week to Sunday', async () => {
  expect(range(calendar_navigation(views, 'list_week', date('2026-03-11')).range)).toBe('2026-03-08…2026-03-14');
});

it('anchors non-week durations on the date itself', async () => {
  expect(range(calendar_navigation(views, 'day', date('2026-03-11')).range)).toBe('2026-03-11…2026-03-11');
  expect(range(calendar_navigation(views, 'three_days', date('2026-03-11')).range)).toBe('2026-03-11…2026-03-13');
});

it('echoes the view key and date', async () => {
  const navigation = calendar_navigation(views, 'list_week', date('2026-03-11'));

  expect(navigation.view).toBe('list_week');
  expect(navigation.date.toString()).toBe('2026-03-11');
});

it('throws for an unknown view', async () => {
  expect(() => calendar_navigation(views, 'agenda' as keyof typeof views, date('2026-03-11'))).toThrow('unknown view "agenda"');
});
