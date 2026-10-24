import { createCalendar, createCalendarViews, listView } from '@calendar-tsx/core';
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';

// #region series
export const review = createRRuleEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-01-01T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  data: { title: 'Month-end review' },
});

const views = createCalendarViews({ month: listView({ period: 'month' }) });
export const calendar = createCalendar({
  timeZone: 'America/New_York',
  views: views.views,
  features: { ...views.features, rruleFeature },
  view: 'month',
  date: Temporal.PlainDate.from('2026-01-01'),
  events: [review],
  onNavigate: next => console.log(next),
});
// #endregion series

// #region options
export const optionsReview = createRRuleEvent({
  ...review,
  rrule: {
    freq: 'MONTHLY',
    byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
    bySetPos: [-1],
    until: Temporal.ZonedDateTime.from('2027-01-01T00:00[America/New_York]'),
  },
  rdate: [Temporal.ZonedDateTime.from('2026-02-26T09:00[America/New_York]')],
  exdate: [Temporal.ZonedDateTime.from('2026-02-27T09:00[America/New_York]')],
});
// #endregion options

// #region all-day
export const holiday = createRRuleEvent({
  id: 'holiday',
  kind: 'allDay',
  start: Temporal.PlainDate.from('2026-01-01'),
  duration: Temporal.Duration.from({ days: 2 }),
  rrule: 'FREQ=YEARLY',
  data: { title: 'Holiday' },
});
// #endregion all-day

// #region bounded-exclusions
export const boundedReview = createRRuleEvent({
  id: 'weekly-review',
  kind: 'allDay',
  start: Temporal.PlainDate.from('2026-01-05'),
  rrule: { freq: 'WEEKLY', count: 4 },
  exrule: {
    freq: 'WEEKLY',
    start: Temporal.PlainDate.from('2026-01-19'),
    until: Temporal.PlainDate.from('2026-01-26'),
  },
  data: { title: 'Review' },
});
// #endregion bounded-exclusions
