import { useCalendar } from '@calendar-tsx/react';
import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { ViewKey } from '../core/setup';
import { bookings, timeZone, views, features } from '../core/setup';

const isViewKey = (value: string | null): value is ViewKey => value !== null && value in views;

// #region url
const fromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const date = params.get('date');

  return {
    view: isViewKey(view) ? view : 'week',
    date: date ? Temporal.PlainDate.from(date) : Temporal.Now.plainDateISO(),
  };
};

export const useUrlCalendar = () => {
  const [{ view, date }, setNavigation] = useState(fromUrl);

  return useCalendar({
    timeZone,
    views,
    features,
    view,
    date,
    events: bookings,
    onNavigate: next => {
      // `next.range` is known here, before rendering: start fetching its events now
      window.history.replaceState(null, '', `?view=${next.view}&date=${next.date.toString()}`);
      setNavigation({ view: next.view, date: next.date });
    },
  });
};
// #endregion url
