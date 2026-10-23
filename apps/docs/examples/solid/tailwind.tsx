import type { Calendar_MonthDay } from '@calendar-tsx/core';
import { MonthViewDay, MonthViewDayTrigger } from '@calendar-tsx/solid';

import type { Booking } from '../core/setup';

// #region utilities
export const Day = (props: { day: Calendar_MonthDay<Booking> }) => (
  <MonthViewDay day={props.day} class='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
    <MonthViewDayTrigger
      day={props.day}
      view='day'
      class='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
    >
      {props.day.date.day}
    </MonthViewDayTrigger>
  </MonthViewDay>
);
// #endregion utilities
