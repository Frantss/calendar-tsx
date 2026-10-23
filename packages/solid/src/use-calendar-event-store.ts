import { useSelector } from '@tanstack/solid-store';

import type { Calendar_EventInput } from '@calendar-tsx/core';
import { createEventStore } from '@calendar-tsx/core';

/** Opt-in managed events (D2); pass `events()` to `useCalendar` as ordinary input. */
export const useCalendarEventStore = <TData>(initial: Calendar_EventInput<TData>[] = []) => {
  const eventStore = createEventStore(initial);
  const events = useSelector(eventStore.store, state => state.events);

  return { ...eventStore, events };
};
