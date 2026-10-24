import {
  calendarFeatures,
  calendarViews,
  createCalendar,
  timeGridView,
  interactionFeature,
  eventMoveFeature,
  eventTransferFeature,
  pointerFeature,
} from '@calendar-tsx/core';
import type { Calendar_EventInput, Calendar_TransferProposal } from '@calendar-tsx/core';
import type { Booking } from './interactions';
import { initialDate, initialEvents } from './interactions';

export const features = calendarFeatures({
  interactions: interactionFeature(),
  movement: eventMoveFeature(),
  transfers: eventTransferFeature(),
  pointer: pointerFeature(),
});
export const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
export type TransferEvents = Record<string, Calendar_EventInput<Booking>[]>;

// #region transaction
export function applyTransfer(events: TransferEvents, proposal: Calendar_TransferProposal<Booking>): TransferEvents {
  return {
    ...events,
    [proposal.sourceId]: events[proposal.sourceId].filter(event => event.id !== proposal.before.id),
    [proposal.destinationId]: [...events[proposal.destinationId], proposal.after],
  };
}
// #endregion transaction

// #region setup
export function createTransferCalendars() {
  let events: TransferEvents = { left: initialEvents, right: [] };
  const onEventTransfer = (proposal: Calendar_TransferProposal<Booking>) => {
    events = applyTransfer(events, proposal);
    left['~update']({ ...left.options, events: events.left });
    right['~update']({ ...right.options, events: events.right });
  };
  const left = createCalendar({
    id: 'left',
    features,
    views,
    view: 'day',
    date: initialDate,
    timeZone: 'UTC',
    events: events.left,
    onEventTransfer,
    onNavigate: (next): void => left['~update']({ ...left.options, view: next.view, date: next.date }),
  });
  const right = createCalendar({
    id: 'right',
    features,
    views,
    view: 'day',
    date: initialDate,
    timeZone: 'UTC',
    events: events.right,
    onEventTransfer,
    onNavigate: (next): void => right['~update']({ ...right.options, view: next.view, date: next.date }),
  });
  return { left, right };
}
// #endregion setup
