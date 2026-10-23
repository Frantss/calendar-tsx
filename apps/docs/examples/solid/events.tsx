import type { Calendar_EventInput } from '@calendar-tsx/core';
import { useCalendar, useCalendarEventStore } from '@calendar-tsx/solid';
import type { Accessor } from 'solid-js';
import { createMemo, createSignal } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

import type { Booking, ViewKey } from '../core/setup';
import { bookings, timeZone, views } from '../core/setup';

// #region store
export const useBookingCalendar = () => {
  const [view, setView] = createSignal<ViewKey>('week');
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO());
  const eventStore = useCalendarEventStore<Booking>(bookings);

  const calendar = useCalendar(() => ({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: view(),
    date: date(),
    events: eventStore.events(), // an accessor: read it inside
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  }));

  const book = (booking: Calendar_EventInput<Booking>) => eventStore.add([booking]);
  const cancel = (id: string) => eventStore.remove(id);

  return { calendar, book, cancel };
};
// #endregion store

// #region filter
// hiding is filtering the input; a memo keeps the array stable until its inputs change
export const useVisibleEvents = (events: Accessor<Calendar_EventInput<Booking>[]>, hidden: Accessor<Set<string>>) =>
  createMemo(() => events().filter(event => !hidden().has(event.id)));
// #endregion filter
