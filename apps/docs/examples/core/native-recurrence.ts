import {
  createCalendar,
  createCalendarViews,
  listView,
  createRecurringEvent,
  recurrenceFeature,
} from '@calendar-tsx/core';
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';

// #region series
export const review = createRecurringEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-01-05T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: { freq: 'WEEKLY', interval: 2, byDay: ['MO', 'WE'], count: 20 },
  data: { title: 'Review' },
});

const views = createCalendarViews({ month: listView({ period: 'month' }) });
export const calendar = createCalendar({
  timeZone: 'America/New_York',
  views: views.views,
  features: { ...views.features, recurrenceFeature },
  view: 'month',
  date: Temporal.PlainDate.from('2026-01-01'),
  events: [review],
  onNavigate: next => console.log(next),
});
// #endregion series

// #region exceptions
export const adjusted = createRecurringEvent({
  ...review,
  rdate: [Temporal.ZonedDateTime.from('2026-01-09T09:00[America/New_York]')],
  exdate: [Temporal.ZonedDateTime.from('2026-01-07T09:00[America/New_York]')],
  exrule: {
    freq: 'DAILY',
    start: Temporal.ZonedDateTime.from('2026-02-02T09:00[America/New_York]'),
    until: Temporal.ZonedDateTime.from('2026-02-06T09:00[America/New_York]'),
  },
});
// #endregion exceptions

// #region upgrade
export const rruleReview = createRRuleEvent(adjusted);
export const advanced = createRRuleEvent({
  ...review,
  id: 'monthly-review',
  rrule: { freq: 'MONTHLY', byDay: ['2FR'] },
});
export const advancedCalendar = createCalendar({
  ...calendar.options,
  features: { ...views.features, rruleFeature },
  events: [rruleReview, advanced],
});
// #endregion upgrade
