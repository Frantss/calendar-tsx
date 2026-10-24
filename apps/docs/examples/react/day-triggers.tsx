import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDayTrigger } from '@calendar-tsx/react';

import type { Booking, DayCalendar } from '../core/setup';

// #region trigger
export const DayNumber = ({
  calendar,
  day,
  locked,
}: {
  calendar: DayCalendar;
  day: Calendar_DayGridDay<Booking>;
  locked: boolean;
}) => (
  <DayGridViewDayTrigger
    calendar={calendar}
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
