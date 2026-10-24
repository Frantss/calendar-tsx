import { createCalendarDragScope } from '@calendar-tsx/core';
import type { Calendar_TransferProposal } from '@calendar-tsx/core';
import { useCalendar, useCalendarInteractionBindings } from '@calendar-tsx/react';
import { useState } from 'react';
import { features, views, applyTransfer } from '../core/transfers';
import type { TransferEvents } from '../core/transfers';
import { initialDate, initialEvents } from '../core/interactions';
import type { Booking } from '../core/interactions';

// #region setup
export function useTransferCalendars() {
  const [dragScope] = useState(createCalendarDragScope);
  const [events, setEvents] = useState<TransferEvents>({ left: initialEvents, right: [] });
  const [leftDate, setLeftDate] = useState(initialDate);
  const [rightDate, setRightDate] = useState(initialDate);
  const onEventTransfer = (proposal: Calendar_TransferProposal<Booking>) =>
    setEvents(current => applyTransfer(current, proposal));

  const left = useCalendar({
    id: 'left',
    features,
    views,
    view: 'day',
    date: leftDate,
    timeZone: 'UTC',
    events: events.left,
    onEventTransfer,
    onNavigate: next => setLeftDate(next.date),
  });
  const right = useCalendar({
    id: 'right',
    features,
    views,
    view: 'day',
    date: rightDate,
    timeZone: 'UTC',
    events: events.right,
    onEventTransfer,
    onNavigate: next => setRightDate(next.date),
  });
  const leftBindings = useCalendarInteractionBindings(left, { dragScope });
  const rightBindings = useCalendarInteractionBindings(right, { dragScope });
  return { left, right, leftBindings, rightBindings };
}
// #endregion setup
