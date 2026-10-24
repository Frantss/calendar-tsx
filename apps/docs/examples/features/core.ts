import type { Calendar_State } from '@calendar-tsx/core';
import { createCalendar, calendarViews, calendarFeatures, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone } from '../core/setup';
import { highlightFeature } from './highlight-feature';

// #region register
const features = calendarFeatures({ highlight: highlightFeature({ only: false }) });
const views = calendarViews({
  features: features,
  views: {
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1, features: { highlight: { only: true } } }),
    plain: timeGridView({ days: 1 }), // inherits the registered feature defaults
  },
});

const calendar = createCalendar({
  timeZone,
  views,
  features,
  view: 'week',
  date: Temporal.Now.plainDateISO(),
  events: bookings,
  onNavigate: () => {},
});

calendar.api.highlight('standup'); // exists because highlightFeature is registered

const state: Calendar_State<unknown, unknown, typeof views, typeof features> = calendar.store.state;
export const highlighted = state.highlighted; // 'standup'
// #endregion register
