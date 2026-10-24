import { createRecurringEvent, listView, dayGridView, timeGridView } from '@calendar-tsx/core';
import { createRRuleEvent } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';
import { expect } from 'storybook/test';
import { scenario, at } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Recurrence' };
const daily = createRecurringEvent({
  id: 'daily',
  kind: 'timed',
  start: at('2026-03-09T09:00'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: { freq: 'DAILY', count: 5 },
  data: { title: 'Daily review' },
});
export const DailySeries = story(scenario({ view: listView({ weeks: 1 }), events: [daily] }), {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button', { name: 'Daily review' })).toHaveLength(5);
  },
});
export const WeeklySeries = story(
  scenario({
    events: [createRecurringEvent({ ...daily, rrule: { freq: 'WEEKLY', byDay: ['MO', 'WE', 'FR'], count: 9 } })],
  }),
);
export const AllDaySeries = story(
  scenario({
    events: [
      createRecurringEvent({
        id: 'all-day-series',
        kind: 'allDay',
        start: Temporal.PlainDate.from('2026-03-02'),
        duration: Temporal.Duration.from({ days: 2 }),
        rrule: { freq: 'WEEKLY', count: 4 },
        data: { title: 'Two-day workshop' },
      }),
    ],
  }),
);
export const CountAndUntil = story(
  scenario({
    view: listView({ weeks: 1 }),
    events: [createRecurringEvent({ ...daily, rrule: { freq: 'DAILY', count: 5, until: at('2026-03-11T09:00') } })],
  }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.getAllByRole('button', { name: 'Daily review' })).toHaveLength(3);
    },
  },
);
export const IncludedAndExcludedDates = story(
  scenario({
    view: listView({ weeks: 1 }),
    events: [createRecurringEvent({ ...daily, rdate: [at('2026-03-14T09:00')], exdate: [at('2026-03-11T09:00')] })],
  }),
  {
    play: async ({ canvasElement }) => {
      await expect(
        canvasElement.querySelector('[data-part="list-day"][data-date="2026-03-11"]'),
      ).not.toBeInTheDocument();
      await expect(canvasElement.querySelector('[data-part="list-day"][data-date="2026-03-14"]')).toBeInTheDocument();
    },
  },
);
export const ReplaceOccurrence = story(
  scenario({ view: listView({ weeks: 1 }), events: [daily], eventControls: true }),
  {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Replace occurrence' }));
      await expect(canvas.getByRole('button', { name: 'Replacement booking' })).toBeVisible();
      await expect(canvas.getAllByRole('button', { name: 'Daily review' })).toHaveLength(4);
    },
  },
);
export const EditSeries = story(scenario({ view: listView({ weeks: 1 }), events: [daily], eventControls: true }), {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit series' }));
    await expect(canvas.getAllByRole('button', { name: 'Edited series' })).toHaveLength(5);
  },
});
const monthly = createRRuleEvent({
  id: 'monthly',
  kind: 'timed',
  start: at('2026-01-01T09:00'),
  duration: Temporal.Duration.from({ hours: 1 }),
  rrule: 'FREQ=MONTHLY;BYDAY=2FR',
  data: { title: 'Second Friday review' },
});
export const MonthlyOrdinalWeekday = story(scenario({ events: [monthly] }), {
  play: async ({ canvasElement }) => {
    const event = canvasElement.querySelector<HTMLElement>('[data-part="day-grid-row-event"]');
    await expect(event).toHaveTextContent('Second Friday review');
    await expect(event?.style.getPropertyValue('--cal-col-start')).toBe('5');
  },
});
export const LastBusinessDay = story(
  scenario({
    view: listView({ period: 'quarter' }),
    events: [
      createRRuleEvent({
        ...monthly,
        rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
        data: { title: 'Month-end review' },
      }),
    ],
  }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.getAllByRole('button', { name: 'Month-end review' })).toHaveLength(3);
    },
  },
);
export const YearlySeries = story(
  scenario({
    view: dayGridView({ period: 'year', groupBy: 'month', maxEventsPerDay: 3 }),
    events: [
      createRRuleEvent({
        id: 'annual',
        kind: 'allDay',
        start: Temporal.PlainDate.from('2020-03-11'),
        rrule: 'FREQ=YEARLY',
        data: { title: 'Annual review' },
      }),
    ],
  }),
);
export const IndependentExclusionRules = story(
  scenario({
    view: listView({ period: 'month' }),
    events: [
      createRRuleEvent({
        ...monthly,
        start: at('2026-03-02T09:00'),
        rrule: { freq: 'WEEKLY', count: 5 },
        exrule: { freq: 'WEEKLY', start: at('2026-03-16T09:00'), until: at('2026-03-23T09:00') },
      }),
    ],
  }),
  {
    play: async ({ canvas }) => {
      await expect(canvas.getAllByRole('button', { name: 'Second Friday review' })).toHaveLength(3);
    },
  },
);
export const SeriesZoneAndDisplayZone = story(
  scenario({
    timeZone: 'Europe/London',
    view: timeGridView({ weeks: 1, timeWindow: { startMinutes: 720, endMinutes: 1080 } }),
    events: [monthly],
    caption: 'The series repeats at 09:00 America/New_York. This calendar displays Europe/London.',
  }),
);
