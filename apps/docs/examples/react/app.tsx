import { useCalendar } from '@calendar-tsx/react';
import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { ViewKey } from '../core/setup';
import { bookings, rooms, timeZone, views, features } from '../core/setup';

// #region calendar
export const useAppCalendar = () => {
  const [view, setView] = useState<ViewKey>('week');
  const [date, setDate] = useState(() => Temporal.Now.plainDateISO());

  return useCalendar({
    timeZone,
    views,
    features,
    view,
    date,
    events: bookings,
    resources: rooms,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  });
};

export type AppCalendar = ReturnType<typeof useAppCalendar>;
// #endregion calendar
