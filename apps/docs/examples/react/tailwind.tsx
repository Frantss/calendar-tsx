import type { Calendar_DayGridDay } from '@calendar-tsx/core';
import { DayGridViewDay, DayGridViewDayTrigger } from '@calendar-tsx/react';

import type { Booking, DayCalendar } from '../core/setup';

// #region utilities
export const Day = ({ calendar, day }: { calendar: DayCalendar; day: Calendar_DayGridDay<Booking> }) => (
  <DayGridViewDay day={day} className='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
    <DayGridViewDayTrigger
      calendar={calendar}
      day={day}
      view='day'
      className='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
    >
      {day.date.day}
    </DayGridViewDayTrigger>
  </DayGridViewDay>
);
// #endregion utilities
