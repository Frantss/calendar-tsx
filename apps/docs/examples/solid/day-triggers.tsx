import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDayTrigger } from '@calendar-tsx/solid';

import type { Booking } from '../core/setup';

// #region trigger
export const DayNumber = (props: { day: Calendar_DayGridDay<Booking>; locked: boolean }) => (
  <DayGridViewDayTrigger
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
