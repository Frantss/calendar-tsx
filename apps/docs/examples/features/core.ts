import type { Calendar_State } from '@calendar-tsx/core';
import { createCalendar, createCalendarViews, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import { bookings, timeZone } from '../core/setup';
import { highlightFeature } from './highlight-feature';

// #region register
const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { highlightFeature } }),
  day: timeGridView({ days: 1, features: { highlightFeature }, highlight: { only: true } }),
  plain: timeGridView({ days: 1 }), // highlightFeature does not run here
});

const calendar = createCalendar({
  timeZone,
  views: views.views,
  features: { ...views.features },
  view: 'week',
  date: Temporal.Now.plainDateISO(),
  events: bookings,
  onNavigate: () => {},
  highlight: { only: false }, // calendar-wide setting from highlightFeature
});

calendar.api.highlight('standup'); // exists because highlightFeature is registered

const state: Calendar_State<unknown, unknown, typeof views.views, typeof views.features> = calendar.store.state;
export const highlighted = state.highlighted; // 'standup'
// #endregion register
