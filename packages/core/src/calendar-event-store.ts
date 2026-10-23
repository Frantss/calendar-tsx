import { createStore } from '@tanstack/store';

import type { Calendar_EventInput } from '#calendar.types';

/**
 * Opt-in managed events for consumers without their own cache (D2). Its `events` are passed to
 * the calendar as ordinary input; it is not meant to mirror another store.
 */
export const createEventStore = <TData>(initial: Calendar_EventInput<TData>[] = []) => {
  const store = createStore({ events: initial });

  return {
    store,
    /** Upserts by id. */
    add: (events: Calendar_EventInput<TData>[]) =>
      store.setState(state => {
        const incoming = new Map(events.map(event => [event.id, event]));

        return { events: [...state.events.filter(event => !incoming.has(event.id)), ...incoming.values()] };
      }),
    remove: (id: string) => store.setState(state => ({ events: state.events.filter(event => event.id !== id) })),
    update: (id: string, updater: (event: Calendar_EventInput<TData>) => Calendar_EventInput<TData>) =>
      store.setState(state => ({ events: state.events.map(event => (event.id === id ? updater(event) : event)) })),
    reset: (events: Calendar_EventInput<TData>[]) => store.setState(() => ({ events })),
  };
};
