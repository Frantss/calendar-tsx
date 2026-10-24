import {
  calendarFeatures,
  calendarViews,
  createCalendar,
  timeGridView,
  createEventRelocationPolicy,
  interactionFeature,
  eventMoveFeature,
  externalDropFeature,
  crossCalendarFeature,
} from '@calendar-tsx/core';
import { initialDate, initialEvents } from './interactions';

// #region placement
const eventRelocationPolicy = createEventRelocationPolicy({
  allowConversion: true,
  conversionDuration: 'reset',
  defaultTimedMinutes: 60,
  allowResourceChange: true,
  resourceMode: 'replace-all',
});

export const features = calendarFeatures({
  interactions: interactionFeature(),
  movement: eventMoveFeature(),
  creation: externalDropFeature({ relocationPolicy: { allowConversion: false } }),
  transfers: crossCalendarFeature({ relocationPolicy: { resourceMode: 'replace-source' } }),
});

export const calendar = createCalendar({
  features,
  views: calendarViews({ features, views: { day: timeGridView({ days: 1 }) } }),
  view: 'day',
  date: initialDate,
  timeZone: 'UTC',
  events: initialEvents,
  eventRelocationPolicy,
  crossCalendar: { id: 'bookings' },
  onNavigate: (next): void => calendar['~update']({ ...calendar.options, view: next.view, date: next.date }),
});
// #endregion placement
