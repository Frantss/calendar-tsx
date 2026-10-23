# @calendar-tsx/core

Framework-agnostic calendar engine that powers [`@calendar-tsx/react`](../react). It derives month, time-grid and
list layouts from controlled view/date options and event input, in a single time zone.

## Quick example

```ts
import { calendarView_month, calendarView_timeGrid, calendar_create } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

const calendar = calendar_create({
  timeZone: 'America/New_York',
  views: { month: calendarView_month({ maxEventsPerDay: 4 }), week: calendarView_timeGrid({ days: 7 }) },
  view: 'week',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [],
  onNavigate: next => {
    // store next.view / next.date, then pass them back in through `~update`
  },
});

calendar.store.state.layout; // { kind: 'timeGrid', columns, slots, allDay, ... }
calendar.api.next(); // emits onNavigate; never writes state
```

Adapters drive the instance through `'~mount'` (starts the clock) and `'~update'(options)` (writes only when a tracked
input changed).
