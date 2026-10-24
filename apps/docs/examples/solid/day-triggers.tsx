import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDayTrigger } from '@calendar-tsx/solid';

import type { Booking, DayCalendar } from '../core/setup';

// #region trigger
export const DayNumber = (props: { calendar: DayCalendar; day: Calendar_DayGridDay<Booking>; locked: boolean }) => (
  <DayGridViewDayTrigger
    calendar={props.calendar}
    day={props.day}
    view='day'
    onClick={event => {
      // runs before the built-in navigation; preventing it keeps the current view
      if (props.locked) event.preventDefault();
    }}
  >
    {props.day.date.day}
  </DayGridViewDayTrigger>
);
// #endregion trigger
