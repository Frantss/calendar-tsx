import { createEvent } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

import { timeZone } from './setup';

// #region create
// typed where it is written; `data` infers the payload type
export const review = createEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from(`2026-03-11T14:00[${timeZone}]`),
  end: Temporal.ZonedDateTime.from(`2026-03-11T15:00[${timeZone}]`),
  data: { title: 'Review' },
});
// #endregion create

// #region background
export const closures = [
  createEvent({
    id: 'holiday',
    kind: 'allDay',
    display: 'background',
    start: Temporal.PlainDate.from('2026-03-17'),
    data: { title: 'Holiday' },
  }),
  createEvent({
    id: 'maintenance',
    kind: 'timed',
    display: 'background',
    start: Temporal.ZonedDateTime.from(`2026-03-11T12:00[${timeZone}]`),
    end: Temporal.ZonedDateTime.from(`2026-03-11T13:00[${timeZone}]`),
    resourceIds: ['room-a'],
    data: { title: 'Maintenance' },
  }),
];
// #endregion background
