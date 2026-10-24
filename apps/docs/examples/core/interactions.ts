import {
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
  pointerFeature,
  dateSelectionFeature,
  eventMoveFeature,
  eventResizeFeature,
} from '@calendar-tsx/core';
import type { Calendar_EventInput, Calendar_State } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

// #region registry
export const features = calendarFeatures({
  interactions: interactionFeature(),
  pointer: pointerFeature(),
  selection: dateSelectionFeature(),
  movement: eventMoveFeature(),
  resizing: eventResizeFeature(),
});
export const views = calendarViews({
  features,
  views: { day: timeGridView({ days: 1, allDay: false, slotMinutes: 30 }) },
});
// #endregion registry

export type Booking = { title: string; bookingId: number };
export type EditingState = Calendar_State<Booking, unknown, typeof views, typeof features>;
export const initialDate = Temporal.PlainDate.from('2026-10-23');
const start = initialDate.toZonedDateTime({ timeZone: 'UTC', plainTime: '09:00' });
export const initialEvents: Calendar_EventInput<Booking>[] = [
  {
    id: 'booking-1',
    kind: 'timed',
    start,
    end: start.add({ hours: 1 }),
    data: { title: 'Planning', bookingId: 42 },
  },
];
