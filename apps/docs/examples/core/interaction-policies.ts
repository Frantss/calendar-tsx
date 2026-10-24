import {
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
  pointerFeature,
  eventMoveFeature,
  eventResizeFeature,
  constraintsFeature,
  touchFeature,
  autoScrollFeature,
} from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import type { Calendar_WeeklyRule } from '@calendar-tsx/core';

// #region policies
const businessHours: Calendar_WeeklyRule[] = [
  {
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: Temporal.PlainTime.from('09:00'),
    endTime: Temporal.PlainTime.from('17:00'),
  },
];
export const features = calendarFeatures({
  interactions: interactionFeature(),
  pointer: pointerFeature({ distance: 4 }),
  touch: touchFeature({ delay: 500, tolerance: 8 }),
  scroll: autoScrollFeature({ edge: 40, speed: 600 }),
  movement: eventMoveFeature({
    relocationPolicy: {
      allowConversion: true,
      conversionDuration: 'reset',
      defaultTimedMinutes: 60,
      resourceMode: 'replace-all',
    },
  }),
  resizing: eventResizeFeature({ fromStart: true }),
  constraints: constraintsFeature({
    preventOverlap: true,
    businessHours,
    resourceAvailability: true,
  }),
});
export const views = calendarViews({
  features,
  views: {
    editable: timeGridView({ days: 1 }),
    readOnly: timeGridView({
      days: 1,
      features: {
        movement: { enabled: false },
        resizing: { enabled: false },
      },
    }),
  },
});
// #endregion policies
