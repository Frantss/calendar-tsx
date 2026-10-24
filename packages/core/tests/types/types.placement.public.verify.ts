import {
  createEventRelocationPolicy,
  eventMoveFeature,
  externalDropFeature,
  eventTransferFeature,
  createCalendar,
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
} from '@calendar-tsx/core';
import type { Calendar_EventRelocationPolicy } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

const eventRelocationPolicy = createEventRelocationPolicy({
  allowConversion: true,
  conversionDuration: 'reset',
  defaultTimedMinutes: 60,
  allowResourceChange: true,
  resourceMode: 'replace-all',
});
const conversion: 'reset' = eventRelocationPolicy.conversionDuration;
const resource: 'replace-all' = eventRelocationPolicy.resourceMode;
const minutes: 60 = eventRelocationPolicy.defaultTimedMinutes;
const enabled: true = eventRelocationPolicy.allowConversion;
void [conversion, resource, minutes, enabled];

eventMoveFeature({ relocationPolicy: eventRelocationPolicy, enabled: true });
externalDropFeature({ relocationPolicy: eventRelocationPolicy });
eventTransferFeature({ relocationPolicy: eventRelocationPolicy });

const partial = createEventRelocationPolicy({ conversionDuration: 'preserve', resourceMode: 'replace-source' });
const preserve: 'preserve' = partial.conversionDuration;
const source: 'replace-source' = partial.resourceMode;
void [preserve, source];
// @ts-expect-error omitted settings are not filled in by the helper
void partial.defaultTimedMinutes;
eventMoveFeature({ relocationPolicy: createEventRelocationPolicy({}) });

const existing: Calendar_EventRelocationPolicy = { allowConversion: false };
eventMoveFeature({ relocationPolicy: createEventRelocationPolicy(existing) });

// @ts-expect-error duration conversion supports reset or preserve
createEventRelocationPolicy({ conversionDuration: 'keep' });
// @ts-expect-error resource reassignment supports replace-all or replace-source
createEventRelocationPolicy({ resourceMode: 'append' });
// @ts-expect-error durations are expressed as numbers of minutes
createEventRelocationPolicy({ defaultTimedMinutes: '60' });
// @ts-expect-error conversion permission is a boolean
createEventRelocationPolicy({ allowConversion: 'yes' });

const features = calendarFeatures({ interactions: interactionFeature(), create: externalDropFeature() });
const date = Temporal.PlainDate.from('2026-10-23');
const calendar = createCalendar({
  features,
  views: calendarViews({
    features,
    views: { day: timeGridView({ days: 1, features: { create: { relocationPolicy: { allowConversion: false } } } }) },
  }),
  date,
  view: 'day',
  timeZone: 'UTC',
  events: [{ id: 'a', kind: 'allDay', start: date, data: { bookingId: 42 } }],
  eventRelocationPolicy,
  externalDrop: { relocationPolicy: { defaultTimedMinutes: 90 } },
  onNavigate: () => {},
  onExternalDrop: proposal => {
    const id: number = proposal.after.data.bookingId;
    void id;
  },
});
// @ts-expect-error a shared relocation policy does not install movement
void calendar.api.move;
// @ts-expect-error creation remains independent of selection
void calendar.api.selection;
// @ts-expect-error movement policy fields belong inside relocationPolicy
eventMoveFeature({ allowConversion: true });
// @ts-expect-error creation uses the same relocationPolicy property as movement
externalDropFeature({ placement: eventRelocationPolicy });
// @ts-expect-error live policies retain the declared resource modes
calendar['~update']({ ...calendar.options, eventRelocationPolicy: { resourceMode: 'append' } });
