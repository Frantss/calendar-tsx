import type { Calendar_MonthDay } from '@calendar-tsx/core';
import { MonthViewDayTrigger } from '@calendar-tsx/solid';

import type { Booking } from '../core/setup';

// #region trigger
export const DayNumber = (props: { day: Calendar_MonthDay<Booking>; locked: boolean }) => (
  <MonthViewDayTrigger
    day={props.day}
    view='day'
    onClick={event => {
      // runs before the built-in navigation; preventing it keeps the current view
      if (props.locked) event.preventDefault();
    }}
  >
    {props.day.date.day}
  </MonthViewDayTrigger>
);
// #endregion trigger
