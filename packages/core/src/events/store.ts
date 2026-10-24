import { createStore } from '@tanstack/store';

import type { Calendar_EventDefinition, Calendar_EventInput } from '#events/event.types';

/**
 * Opt-in managed events for consumers without their own cache (D2). Its `events` are passed to
 * the calendar as ordinary input; it is not meant to mirror another store.
 */
const eventStore_create = <TEvent extends { id: string }>(initial: TEvent[]) => {
  const store = createStore({ events: initial });

  return {
    store,
    /** Upserts by id. */
    add: (events: TEvent[]) =>
      store.setState(state => {
        const incoming = new Map(events.map(event => [event.id, event]));

        return { events: [...state.events.filter(event => !incoming.has(event.id)), ...incoming.values()] };
      }),
    remove: (id: string) => store.setState(state => ({ events: state.events.filter(event => event.id !== id) })),
    update: (id: string, updater: (event: TEvent) => TEvent) =>
      store.setState(state => ({ events: state.events.map(event => (event.id === id ? updater(event) : event)) })),
    reset: (events: TEvent[]) => store.setState(() => ({ events })),
  };
};

export type Calendar_EventStore<TEvent extends { id: string }> = ReturnType<typeof eventStore_create<TEvent>>;

export function createEventStore<TData>(
  initial?: Calendar_EventInput<TData>[],
): Calendar_EventStore<Calendar_EventInput<TData>>;
export function createEventStore<TData, TSource extends string = string>(
  initial: (Calendar_EventDefinition<TData> & { '~source'?: TSource })[],
): Calendar_EventStore<Calendar_EventDefinition<TData, Record<TSource, unknown>>>;
export function createEventStore<TData>(
  initial: Calendar_EventDefinition<TData>[] = [],
): Calendar_EventStore<Calendar_EventInput<TData>> | Calendar_EventStore<Calendar_EventDefinition<TData>> {
  return eventStore_create(initial);
}
