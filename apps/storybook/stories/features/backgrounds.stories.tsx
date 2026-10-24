import { dayGridView, timeGridView, timelineView, listView } from '@calendar-tsx/core';
import { expect } from 'storybook/test';
import { Temporal } from 'temporal-polyfill';
import {
  scenario,
  background,
  allDay,
  timed,
  bookings,
  resources,
  holiday,
  businessHours,
  dayWindow,
} from '../support/fixtures';
import { scenarioAnnotations, story } from '../support/scenario';

export default { ...scenarioAnnotations, title: 'Features/Backgrounds' };
const day = timeGridView({ days: 1, timeWindow: dayWindow });
const lunch = background(timed('Lunch shading', '2026-03-11T12:00', '2026-03-11T13:00'));
export const TimedBackground = story(scenario({ view: day, events: [...bookings, lunch] }));
export const AllDayBackground = story(
  scenario({ events: [...bookings, background(allDay('Holiday shading', '2026-03-11', '2026-03-13'))] }),
);
export const CrossMidnightBackground = story(
  scenario({
    view: timeGridView({ days: 2, timeWindow: { startMinutes: 0, endMinutes: 1440 } }),
    events: [background(timed('Night shading', '2026-03-11T23:00', '2026-03-12T03:00'))],
  }),
);
export const ResourceScopedBackground = story(
  scenario({
    resources,
    view: timeGridView({ days: 1, timeWindow: dayWindow, groupBy: 'resource' }),
    events: [...bookings, background(timed('Room A shading', '2026-03-11T12:00', '2026-03-11T13:00', ['a']))],
  }),
);
export const BackgroundOnlyAgenda = story(scenario({ view: listView({ weeks: 1 }), events: [lunch] }), {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No bookings in this range')).toBeVisible();
    await expect(canvas.queryByText('Lunch shading')).not.toBeInTheDocument();
  },
});
export const TimelineBackgroundEvent = story(
  scenario({ view: timelineView({ days: 1, timeWindow: dayWindow }), events: [...bookings, lunch] }),
);
export const HolidayLayer = story(scenario({ backgrounds: [holiday] }));
export const WeeklyBusinessHours = story(scenario({ view: day, backgrounds: [businessHours] }));
export const InverseLayer = story(
  scenario({ view: day, backgrounds: [{ id: 'closed', kind: 'closed', inverse: true, ranges: [] }] }),
);
export const OverlappingLayers = story(scenario({ view: day, backgrounds: [holiday, businessHours] }));
export const ResourceScopedLayer = story(
  scenario({
    resources,
    view: timeGridView({ days: 1, timeWindow: dayWindow, groupBy: 'resource' }),
    backgrounds: [{ ...businessHours, resourceIds: ['a'] }],
  }),
);
export const PerViewOverride = story(
  scenario({
    backgrounds: [holiday],
    view: dayGridView({
      period: 'month',
      maxEventsPerDay: 3,
      features: {
        background: [
          { ...holiday, id: 'override', ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-18') }] },
        ],
      },
    }),
  }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector('[data-layer="override"]')).toBeInTheDocument();
      await expect(canvasElement.querySelector('[data-layer="holiday"]')).not.toBeInTheDocument();
    },
  },
);
export const ClearedOverride = story(
  scenario({
    backgrounds: [holiday],
    view: dayGridView({ period: 'month', maxEventsPerDay: 3, features: { background: [] } }),
  }),
  {
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector('[data-part="day-grid-day-background"]')).not.toBeInTheDocument();
    },
  },
);
export const TimelineLayers = story(
  scenario({
    backgrounds: [businessHours],
    resources,
    view: timelineView({ days: 1, timeWindow: dayWindow, groupBy: 'resource' }),
  }),
);
