import type { Calendar_TimeGridSegment } from '@calendar-tsx/core';
import { CalendarProvider, TimeGridViewEvent } from '@calendar-tsx/react';
import type { ReactNode } from 'react';

import type { Booking } from '../core/setup';
import type { AppCalendar } from './app';

// #region locale
export const GermanCalendar = ({ calendar, children }: { calendar: AppCalendar; children: ReactNode }) => (
  // trigger labels read "Go to Mittwoch, 11. März 2026"
  <CalendarProvider value={calendar} locale='de-DE'>
    {children}
  </CalendarProvider>
);
// #endregion locale

// #region label
export const Event = ({ segment }: { segment: Calendar_TimeGridSegment<Booking> }) => {
  const start = 'allDay' in segment.event ? '' : segment.event.start.toLocaleString('en-US', { timeStyle: 'short' });

  return (
    <TimeGridViewEvent segment={segment} aria-label={`${segment.event.data.title}, ${start}`}>
      {segment.event.data.title}
    </TimeGridViewEvent>
  );
};
// #endregion label
