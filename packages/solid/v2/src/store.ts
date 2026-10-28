import { createMemo, createSignal, onCleanup, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { ReadonlyStore } from '@tanstack/store';

export const useSelector = <TState, TSelected>(
  store: Pick<ReadonlyStore<TState>, 'state' | 'subscribe'>,
  selector: (state: TState) => TSelected,
): Accessor<TSelected> => {
  const [state, setState] = createSignal<TState>(() => untrack(() => store.state), { ownedWrite: true });
  const subscription = store.subscribe(() => setState(() => store.state));
  onCleanup(() => subscription.unsubscribe());
  return createMemo(() => selector(state()));
};
