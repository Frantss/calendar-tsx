# @calendar-tsx/core

> [!WARNING]
> **Experimental.** `@calendar-tsx/core` is an experiment. Its API can change or be removed in any release, without notice.

Framework-agnostic calendar engine that powers [`@calendar-tsx/react`](../react). It derives month, time-grid,
list and timeline layouts from controlled view/date options and event input, in a single time zone.

## Quick example

```ts
import { monthView, timeGridView, createCalendarViews, createCalendar } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

// module scope: views and features are compared by reference
const views = createCalendarViews({
  month: monthView({ maxEventsPerDay: 4 }),
  week: timeGridView({ days: 7 }),
});

const calendar = createCalendar({
  timeZone: 'America/New_York',
  views: views.views,
  features: { ...views.features },
  view: 'week',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [],
  onNavigate: next => {
    // store next.view / next.date, then pass them back in through `~update`
  },
});

calendar.store.state.layout; // month | timeGrid: the layouts the views register
calendar.api.next(); // emits onNavigate; never writes state
```

Adapters drive the instance through `'~mount'` (starts the clock) and `'~update'(options)` (writes only when a tracked
input changed).

Until `'~mount'`, the state derives "now" from `initialNow` when given, otherwise from the clock. To render on a server
and hydrate on the client, pass the same `initialNow` to both.

## Features

Functionality beyond navigation and layout is added through features (design D29). A feature is a constant object; a
view lists the features it uses, and `createCalendarViews` collects them for the calendar's `features`. A feature
listed only in `features` runs in every view.

```ts
const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { xFeature }, x: { perView: true } }),
  day: timeGridView({ days: 1 }), // xFeature does not run here
});

createCalendar({ ...options, views: views.views, features: { ...views.features }, x: { calendarWide: true } });
```

- **Hooks:** `getInitialState`, `constructApi`, an `events` stage after the core sort, and a `decorate` pass that adds
  model fields. Stages rerun when their input or `deps` change.
- **Settings:** a feature's defaults, then the calendar option, then the view's setting, shallow-merged per layer.
- **State:** each slice is uncontrolled, controlled through `state`, or kept in an external store through `atoms`.
- **Types:** features extend the `Calendar_*_FeatureMap` interfaces by declaration merging, keyed by their export name.
  Options, view settings, state, API and model fields then exist only where the feature is registered.
- **Replacing an implementation:** `{ ...views.features, listLayout: myList }` replaces it in every view.
- **Layouts are features too:** `monthLayout`, `timeGridLayout`, `listLayout` and `timelineLayout` supply
  navigation and `build`; a new view kind is a layout feature plus a `Calendar_Layout_FeatureMap` entry.
