import { calendarFeatures, calendarViews } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import {
  createCalendar,
  dayGridView,
  timeGridView,
  interactionFeature,
  pointerFeature,
  touchFeature,
  autoScrollFeature,
  externalDropFeature,
  crossCalendarFeature,
  eventMoveFeature,
} from '@calendar-tsx/core';
import type { Calendar_EventInput } from '@calendar-tsx/core';
import { createCalendarInteractionHost, dayGridSurface, timeGridSurface } from '@calendar-tsx/core';
const date = Temporal.PlainDate.from('2026-10-23');
const event: Calendar_EventInput<{ title: string }> = { id: 'a', kind: 'allDay', start: date, data: { title: 'A' } };
const features = {
  interactionFeature: interactionFeature(),
  pointerFeature: pointerFeature(),
  touchFeature: touchFeature(),
  autoScrollFeature: autoScrollFeature(),
  externalDropFeature: externalDropFeature(),
  crossCalendarFeature: crossCalendarFeature(),
  eventMoveFeature: eventMoveFeature(),
};
const views = (() => {
  const registered = calendarFeatures(features);
  return {
    features: registered,
    views: calendarViews({
      features: registered,
      views: { month: dayGridView({ period: 'month', maxEventsPerDay: 3 }) },
    }),
  };
})();
const calendar = createCalendar({
  ...views,
  date,
  timeZone: 'UTC',
  view: 'month',
  events: [event],
  crossCalendar: { id: 'a' },
  onNavigate: () => {},
  onExternalDrop: proposal => {
    const title: string = proposal.after.data.title;
    void title;
    // @ts-expect-error callbacks retain the consumer payload
    void proposal.after.data.missing;
  },
  onEventTransfer: proposal => {
    const title: string = proposal.before.data.title;
    void title;
  },
});
const host = createCalendarInteractionHost(calendar);
const created = calendar.api.externalDrop.evaluate(event, { kind: 'allDay', at: date });
if (created.status === 'valid') {
  const title: string = created.proposal.after.data.title;
  void title;
}
const source = calendar.api.transfer.prepare('a');
if (source) {
  const result = calendar.api.transfer.evaluate(source, { kind: 'allDay', at: date });
  if (result.status === 'valid') {
    const title: string = result.proposal.after.data.title;
    void title;
  }
}
host.cancel();
dayGridSurface('section', 'row');
timeGridSurface('column');
const plainViews = (() => {
  const registered = calendarFeatures({});
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { day: timeGridView({ days: 1 }) } }),
  };
})();
const plain = createCalendar({
  ...plainViews,
  view: 'day',
  date,
  timeZone: 'UTC',
  events: [event],
  onNavigate: () => {},
});
// @ts-expect-error pointer registration is required
createCalendarInteractionHost(plain);
// @ts-expect-error external creation does not leak into display calendars
void plain.api.externalDrop;
const missing = (() => {
  const registered = calendarFeatures({ interactionFeature: interactionFeature(), touchFeature: touchFeature() });
  return {
    features: registered,
    views: calendarViews({ features: registered, views: { day: timeGridView({ days: 1 }) } }),
  };
})();
// @ts-expect-error touch requires pointer in the same active view
createCalendar({ ...missing, view: 'day', date, timeZone: 'UTC', events: [event], onNavigate: () => {} });

const creatingFeatures = calendarFeatures({ interactions: interactionFeature(), create: externalDropFeature() });
const creating = createCalendar({
  features: creatingFeatures,
  views: calendarViews({ features: creatingFeatures, views: { day: timeGridView({ days: 1 }) } }),
  date,
  timeZone: 'UTC',
  view: 'day',
  events: [event],
  onNavigate: () => {},
});
const creatingStart = creating.api.externalDrop.begin(event);
if (creatingStart.status === 'active') {
  const result = creatingStart.session.update({ kind: 'allDay', at: date });
  if (result.status === 'valid') {
    const title: string = result.proposal.after.data.title;
    void title;
  }
  // @ts-expect-error creation sessions reject non-date targets
  creatingStart.session.update(true);
}
// @ts-expect-error programmatic creation does not install pointer
void creating.api.pointer;
// @ts-expect-error creation does not install movement
void creating.api.move;
const receivingFeatures = calendarFeatures({
  interactions: interactionFeature(),
  transfer: crossCalendarFeature({ id: 'receiver' }),
});
const receiving = createCalendar({
  features: receivingFeatures,
  views: calendarViews({ features: receivingFeatures, views: { day: timeGridView({ days: 1 }) } }),
  date,
  timeZone: 'UTC',
  view: 'day',
  events: [event],
  onNavigate: () => {},
});
if (source) {
  const start = receiving.api.transfer.begin(source);
  if (start.status === 'active') {
    const result = start.session.commit();
    if (result.status === 'committed') {
      const title: string = result.proposal.after.data.title;
      void title;
    }
  }
}
// @ts-expect-error a receiver does not install movement
void receiving.api.move;
// @ts-expect-error a receiver does not install pointer
void receiving.api.pointer;
// @ts-expect-error transfer preparation has one namespace
void receiving.api.crossCalendar;
