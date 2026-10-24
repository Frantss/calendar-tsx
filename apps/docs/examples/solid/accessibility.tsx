import type { Calendar_TimeGridSegment } from '@calendar-tsx/core';
import { CalendarProvider, TimeGridViewEvent } from '@calendar-tsx/solid';
import type { JSX } from 'solid-js';

import type { Booking } from '../core/setup';
import type { AppCalendar } from './app';

// #region locale
export const GermanCalendar = (props: { calendar: AppCalendar; children: JSX.Element }) => (
  // trigger labels read "Go to Mittwoch, 11. März 2026"
  <CalendarProvider value={props.calendar} locale='de-DE'>
    {props.children}
  </CalendarProvider>
);
// #endregion locale

// #region label
export const Event = (props: { segment: Calendar_TimeGridSegment<Booking> }) => {
  const label = () => {
    const event = props.segment.event;
    const start = event.kind === 'allDay' ? '' : event.start.toLocaleString('en-US', { timeStyle: 'short' });

    return `${event.data.title}, ${start}`;
  };

  return (
    <TimeGridViewEvent segment={props.segment} aria-label={label()}>
      {props.segment.event.data.title}
    </TimeGridViewEvent>
  );
};
// #endregion label
