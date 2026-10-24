import { useSelector } from '@tanstack/react-store';
import { useState } from 'react';

import type { Calendar_EventDefinition, Calendar_EventInput, Calendar_EventStore } from '@calendar-tsx/core';
import { createEventStore } from '@calendar-tsx/core';

type EventStore<TEvent extends { id: string }> = Calendar_EventStore<TEvent> & { events: TEvent[] };

/** Opt-in managed events (D2); pass `events` to `useCalendar` as ordinary input. */
export function useCalendarEventStore<TData>(
  initial?: Calendar_EventInput<TData>[],
): EventStore<Calendar_EventInput<TData>>;
export function useCalendarEventStore<TData>(
  initial: Calendar_EventDefinition<TData>[],
): EventStore<Calendar_EventDefinition<TData>>;
export function useCalendarEventStore<TData>(
  initial: Calendar_EventDefinition<TData>[] = [],
): EventStore<Calendar_EventInput<TData>> | EventStore<Calendar_EventDefinition<TData>> {
  const [eventStore] = useState(() => createEventStore(initial));
  const events = useSelector(eventStore.store, state => state.events);

  return { ...eventStore, events };
}
