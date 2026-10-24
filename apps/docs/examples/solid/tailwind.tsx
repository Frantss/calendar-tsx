import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDay, DayGridViewDayTrigger } from '@calendar-tsx/solid';

import type { Booking, DayCalendar } from '../core/setup';

// #region utilities
export const Day = (props: { calendar: DayCalendar; day: Calendar_DayGridDay<Booking> }) => (
  <DayGridViewDay day={props.day} class='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
    <DayGridViewDayTrigger
      calendar={props.calendar}
      day={props.day}
      view='day'
      class='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
    >
      {props.day.date.day}
    </DayGridViewDayTrigger>
  </DayGridViewDay>
);
// #endregion utilities
