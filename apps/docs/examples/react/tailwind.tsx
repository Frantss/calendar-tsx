import type { Calendar_MonthDay } from '@calendar-tsx/core';
import { MonthViewDay, MonthViewDayTrigger } from '@calendar-tsx/react';

import type { Booking } from '../core/setup';

// #region utilities
export const Day = ({ day }: { day: Calendar_MonthDay<Booking> }) => (
  <MonthViewDay day={day} className='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
    <MonthViewDayTrigger
      day={day}
      view='day'
      className='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
    >
      {day.date.day}
    </MonthViewDayTrigger>
  </MonthViewDay>
);
// #endregion utilities
