import type { Calendar_EventInput } from '@calendar-tsx/core';
import { useCalendar, useCalendarEventStore } from '@calendar-tsx/react';
import { useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { Booking, ViewKey } from '../core/setup';
import { bookings, timeZone, views, features } from '../core/setup';

// #region store
export const useBookingCalendar = () => {
  const [view, setView] = useState<ViewKey>('week');
  const [date, setDate] = useState(() => Temporal.Now.plainDateISO());
  const eventStore = useCalendarEventStore<Booking>(bookings);

  const calendar = useCalendar({
    timeZone,
    views,
    features,
    view,
    date,
    events: eventStore.events,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  });

  const book = (booking: Calendar_EventInput<Booking>) => eventStore.add([booking]);
  const cancel = (id: string) => eventStore.remove(id);

  return { calendar, book, cancel };
};
// #endregion store

// #region filter
// hiding is filtering the input; memoize so the array only changes when its inputs do
export const useVisibleEvents = (events: Calendar_EventInput<Booking>[], hidden: Set<string>) =>
  useMemo(() => events.filter(event => !hidden.has(event.id)), [events, hidden]);
// #endregion filter
