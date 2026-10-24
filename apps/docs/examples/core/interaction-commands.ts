import type { Calendar_DomCalendar, Calendar_DateTarget, Calendar_EventInput } from '@calendar-tsx/core';
import { createExternalDraggable } from '@calendar-tsx/core';
import type { Booking } from './interactions';

// #region command
export function moveEvent(calendar: Calendar_DomCalendar<Booking>, eventId: string, target: Calendar_DateTarget) {
  const session = calendar.api.move?.begin(eventId);
  if (session?.status !== 'active') return session?.status ?? 'unavailable';

  calendar.api.interactions.update(session.token, target);
  const result = calendar.api.interactions.commit(session.token);
  if (result !== 'committed') calendar.api.interactions.cancel(session.token);
  return result;
}
// #endregion command

// #region external
export function attachPalette(element: HTMLElement, makeEvent: () => Calendar_EventInput<Booking>) {
  return createExternalDraggable(element, () => ({
    event: makeEvent(),
    metadata: { source: 'booking-palette' },
  }));
}
// #endregion external

// #region transfer
export function transferEvent(
  source: Calendar_DomCalendar<Booking>,
  destination: Calendar_DomCalendar<Booking>,
  eventId: string,
  target: Calendar_DateTarget,
  sourceResourceId?: string,
) {
  const prepared = source.api.crossCalendar?.prepare(eventId, sourceResourceId);
  if (!prepared) return 'unavailable';
  try {
    const session = destination.api.transfer?.begin(prepared);
    if (session?.status !== 'active') return session?.status ?? 'unavailable';
    destination.api.interactions.update(session.token, target);
    const result = destination.api.interactions.commit(session.token);
    if (result !== 'committed') destination.api.interactions.cancel(session.token);
    return result;
  } finally {
    prepared.release();
  }
}
// #endregion transfer
