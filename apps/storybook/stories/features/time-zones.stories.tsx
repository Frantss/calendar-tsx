import { timeGridView, timelineView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { Temporal } from 'temporal-polyfill';
import { scenario, timed, allDay, background, at } from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Time zones and DST' };
export const DisplayZoneConversion = story(
  scenario({
    timeZone: 'Europe/London',
    view: timeGridView({ days: 1, timeWindow: { startMinutes: 720, endMinutes: 1200 } }),
    events: [timed('New York 09:00', '2026-03-11T09:00', '2026-03-11T10:00')],
  }),
  {
    play: async ({ canvasElement }) => {
      const event = canvasElement.querySelector<HTMLElement>('[data-part="time-grid-event"]');
      await expect(event?.style.getPropertyValue('--cal-start')).toBe('0.125');
    },
  },
);
export const SpringForward = story(
  scenario({
    date: '2026-03-08',
    view: timeGridView({ days: 1, timeWindow: { startMinutes: 0, endMinutes: 300 }, minEventMinutes: 0 }),
    events: [timed('Across missing hour', '2026-03-08T01:30', '2026-03-08T03:30')],
  }),
);
export const RepeatedHourOverlap = story(
  scenario({
    date: '2026-11-01',
    view: timeGridView({ days: 1, timeWindow: { startMinutes: 0, endMinutes: 240 }, minEventMinutes: 0 }),
    events: [
      timed('First 01:15', '2026-11-01T01:15-04:00', '2026-11-01T01:45-04:00'),
      timed('Second 01:15', '2026-11-01T01:15-05:00', '2026-11-01T01:45-05:00'),
    ],
  }),
  {
    play: async ({ canvasElement }) => {
      const events = [...canvasElement.querySelectorAll<HTMLElement>('[data-part="time-grid-event"]')];
      await expect(events).toHaveLength(2);
      await expect(events[0]!.style.getPropertyValue('--cal-start')).toBe(
        events[1]!.style.getPropertyValue('--cal-start'),
      );
      await expect(events[0]!.style.getPropertyValue('--cal-lane')).not.toBe(
        events[1]!.style.getPropertyValue('--cal-lane'),
      );
    },
  },
);
export const RollbackCrossingEvent = story(
  scenario({
    date: '2026-11-01',
    view: timeGridView({ days: 1, timeWindow: { startMinutes: 0, endMinutes: 240 }, minEventMinutes: 0 }),
    events: [
      timed('Across rollback', '2026-11-01T01:30-04:00', '2026-11-01T01:15-05:00'),
      background(timed('Exact background bands', '2026-11-01T01:30-04:00', '2026-11-01T01:15-05:00')),
    ],
  }),
);
export const TimelineAcrossDST = story(
  scenario({
    date: '2026-03-08',
    view: timelineView({ days: 3, slotMinutes: 1440, minSlotWidth: '10rem' }),
    events: [
      allDay('Equal date widths', '2026-03-08', '2026-03-10'),
      timed('After transition', '2026-03-08T09:00', '2026-03-08T10:00'),
    ],
  }),
);
export const SkippedMidnight = story(
  scenario({
    date: '2026-09-06',
    timeZone: 'America/Santiago',
    view: timelineView({ days: 2, slotMinutes: 1440, minSlotWidth: '12rem' }),
    events: [allDay('Midnight transition', '2026-09-06')],
    backgrounds: [
      {
        id: 'skipped-midnight',
        kind: 'holiday',
        ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-09-06') }],
      },
    ],
    clock: { now: () => at('2026-09-06T09:00', 'America/Santiago').toInstant(), subscribe: () => () => {} },
  }),
);
