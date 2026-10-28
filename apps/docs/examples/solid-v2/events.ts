// #region store
import type { Calendar_EventInput } from '@calendar-tsx/core';
import { useCalendar, useCalendarEventStore } from '@calendar-tsx/solid/v2';
import { createSignal } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import type { Booking } from './quick-start';
import { features, views } from './quick-start';

export const useBookingCalendar = (initial: Calendar_EventInput<Booking>[]) => {
  const eventStore = useCalendarEventStore(initial);
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO('UTC'));
  const calendar = useCalendar(() => ({
    timeZone: 'UTC',
    features,
    views,
    view: 'week',
    date: date(),
    events: eventStore.events(),
    onNavigate: next => setDate(next.date),
  }));
  return { calendar, eventStore };
};
// #endregion store
