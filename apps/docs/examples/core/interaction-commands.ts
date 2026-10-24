import type {
  Calendar_MoveApi,
  Calendar_TransferApi,
  Calendar_InteractionScope,
  Calendar_DateTarget,
  Calendar_EventInput,
} from '@calendar-tsx/core';
import { createExternalDraggable } from '@calendar-tsx/core';
import type { Booking } from './interactions';

// #region command
export function moveEvent(
  calendar: { api: { move: Calendar_MoveApi<Booking> } },
  eventId: string,
  target: Calendar_DateTarget,
) {
  const session = calendar.api.move?.begin(eventId);
  if (session?.status !== 'active') return session?.status ?? 'unavailable';

  session.session.update(target);
  const result = session.session.commit();
  if (result.status !== 'committed') session.session.cancel();
  return result;
}
// #endregion command

// #region external
export function attachPalette(
  element: HTMLElement,
  makeEvent: () => Calendar_EventInput<Booking>,
  scope: Calendar_InteractionScope,
) {
  return createExternalDraggable(
    element,
    () => ({
      event: makeEvent(),
      metadata: { source: 'booking-palette' },
    }),
    { scope, pointer: {} },
  );
}
// #endregion external

// #region transfer
export function transferEvent(
  source: { api: { transfer: Calendar_TransferApi<Booking> } },
  destination: { api: { transfer: Calendar_TransferApi<Booking> } },
  eventId: string,
  target: Calendar_DateTarget,
  sourceResourceId?: string,
) {
  const prepared = source.api.transfer?.prepare(eventId, sourceResourceId);
  if (!prepared) return 'unavailable';
  try {
    const session = destination.api.transfer?.begin(prepared);
    if (session?.status !== 'active') return session?.status ?? 'unavailable';
    session.session.update(target);
    const result = session.session.commit();
    if (result.status !== 'committed') session.session.cancel();
    return result;
  } finally {
    prepared.release();
  }
}
// #endregion transfer
