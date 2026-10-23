import { useCalendar } from '@calendar-tsx/solid';
import { createSignal } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

import type { ViewKey } from '../core/setup';
import { bookings, rooms, timeZone, views } from '../core/setup';

// #region calendar
export const useAppCalendar = () => {
  const [view, setView] = createSignal<ViewKey>('week');
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO());

  return useCalendar(() => ({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: view(),
    date: date(),
    events: bookings,
    resources: rooms,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  }));
};

export type AppCalendar = ReturnType<typeof useAppCalendar>;
// #endregion calendar
