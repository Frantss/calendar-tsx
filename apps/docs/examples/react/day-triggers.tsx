import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDayTrigger } from '@calendar-tsx/react';

import type { Booking } from '../core/setup';

// #region trigger
export const DayNumber = ({ day, locked }: { day: Calendar_DayGridDay<Booking>; locked: boolean }) => (
  <DayGridViewDayTrigger
    day={day}
    view='day'
    onClick={event => {
      // runs before the built-in navigation; preventing it keeps the current view
      if (locked) event.preventDefault();
    }}
  >
    {day.date.day}
  </DayGridViewDayTrigger>
);
// #endregion trigger
