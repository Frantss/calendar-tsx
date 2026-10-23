import { createCalendar, createEventStore } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import type { Booking } from './setup';
import { bookings, timeZone, views } from './setup';

// #region store
const eventStore = createEventStore<Booking>(bookings);

const calendar = createCalendar({
  timeZone,
  views: views.views,
  features: { ...views.features },
  view: 'week',
  date: Temporal.Now.plainDateISO(),
  events: eventStore.store.state.events,
  onNavigate: next => calendar['~update']({ ...calendar.options, view: next.view, date: next.date }),
});

// pass every new list to the calendar as ordinary input
eventStore.store.subscribe(({ events }) => calendar['~update']({ ...calendar.options, events }));

eventStore.add([
  {
    id: 'review',
    start: Temporal.ZonedDateTime.from(`2026-03-11T14:00[${timeZone}]`),
    end: Temporal.ZonedDateTime.from(`2026-03-11T15:00[${timeZone}]`),
    data: { title: 'Review' },
  },
]); // upserts by id
eventStore.update('review', event => ({ ...event, data: { title: 'Design review' } }));
eventStore.remove('standup');
// #endregion store
