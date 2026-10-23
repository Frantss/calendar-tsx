import { useSelector } from '@tanstack/react-store';
import { useState } from 'react';

import type { Calendar_EventInput } from '@calendar-tsx/core';
import { calendarEventStore_create } from '@calendar-tsx/core';

/** Opt-in managed events (D2); pass `events` to `useCalendar` as ordinary input. */
export const useCalendarEventStore = <TData>(initial: Calendar_EventInput<TData>[] = []) => {
  const [eventStore] = useState(() => calendarEventStore_create(initial));
  const events = useSelector(eventStore.store, state => state.events);

  return { ...eventStore, events };
};
