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

## DST and axis positions

Time grids and timelines use a fixed 24-hour clock axis in `timeZone`: 09:00 aligns with the 09:00 slot on DST days,
and timeline dates keep equal widths. The two occurrences of a repeated hour share clock positions; visually
overlapping events receive separate lanes or stack rows. A transition-crossing bar encloses the clock positions
visited by its real interval. Actual event timestamps and durations remain available on `segment.event`.

Backgrounds, availability and the now indicator use the same axis. All-day spans follow date boundaries even when
midnight is skipped. Minimum and short event lengths measure displayed clock minutes (design D40).
Timed shading can split into separate bands at a DST transition; inverse layers retain the gaps between them.

Timeline rows expose `backgroundEvents` independently of foreground `segments`. Register `backgroundFeature` on
`timelineView` to add `row.backgrounds` for fixed, weekly or inverse layers. Both use fractions of the visible
track and take no stack rows. Unassigned background events shade every resource; scoped layers require a matching
resource row. All-day shading follows anchor dates; timed shading uses exact projected coverage.

## Hidden weekdays and visible hours

All built-in views accept `hiddenDays`, using ISO weekdays (`1` Monday through `7` Sunday). Time grids and timelines
also accept a `timeWindow` in nominal clock minutes:

```ts
import { timeGridView, timelineView } from '@calendar-tsx/core';

timeGridView({ days: 7, hiddenDays: [6, 7], timeWindow: { startMinutes: 480, endMinutes: 1080 } });
timelineView({ days: 1, timeWindow: { startMinutes: 1320, endMinutes: 1800 } }); // 22:00–06:00
```

Defaults show every weekday and `[0, 1440)`. Window bounds are integers: `0 <= startMinutes < 1440` and
`startMinutes < endMinutes <= startMinutes + 1440`. A positive integer `slotMinutes` need not divide the window;
the final slot has its actual proportional size. Slot models expose `dayOffset`, `start` and `span` for labels.

An overnight window belongs to its starting date. Hiding Tuesday leaves Monday's Tuesday-morning portion visible.
All-day items retain their anchor dates. Month rows keep their calendar-week boundaries; bars and overflow only
occupy visible cells. Hiding all seven weekdays is invalid. A hidden controlled day produces an empty layout.

Navigation exposes `inputRange` alongside `range` and `period`. Fetch events for `inputRange`: it includes the
following morning when an overnight window needs it. `range` remains the inclusive anchor envelope, and `period`
keeps its navigation meaning. Input filtering is coarse; layouts clip to actual visible windows afterward.

Layout models expose their shared `coordinates`. Timed segments retain exact `fragments`, including offsets and
occurrences, separately from D40's enclosing rectangle. Resource, event and clock changes reuse timed plans for a
stable view definition. Coordinate helper functions remain internal.

## Events

Events are plain objects (design D2, D7, D8), discriminated by `kind`: `'timed'` events take `ZonedDateTime` bounds,
`'allDay'` events take `PlainDate` bounds. `createEvent` returns its argument unchanged; use it to type an event where
it is written, with `data` inferring the payload type:

```ts
const yoga = createEvent({ id: 'yoga', kind: 'timed', start, end, data: { title: 'Yoga' } }); // Calendar_TimedEventInput<{ title: string }>
const fair = createEvent<EventData>({ id: 'fair', kind: 'allDay', start: Temporal.PlainDate.from('2026-03-11'), data });
```

## Background events

An event with `display: 'background'` is shaded under the other events instead of laid out as one (design D37). It
takes no lane or row and skips `eventOrder`; `day.events` and the list leave it out. Use it for dated items from your
data; use background layers for rules such as business hours:

```ts
createCalendar({
  ...options,
  events: [
    ...events,
    { id: 'holiday', kind: 'allDay', display: 'background', start: Temporal.PlainDate.from('2026-03-17'), data },
    { id: 'lunch', kind: 'timed', display: 'background', start: lunchStart, end: lunchEnd, data },
  ],
});
```

- Time grid: `column.backgroundEvents` segments (all-day ones cover the whole column) and `allDay.backgroundEvents`
  spans.
- Month: `week.backgroundEvents` spans, for all-day background events only.
- List: left out.
- Without `resourceIds`, a background event shades every resource column.

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
  model fields. Stages rerun when their input or `deps` change. Feature options are read untracked unless the feature
  lists their keys in `trackedOptions`.
- **Settings:** a feature's defaults, then the calendar option, then the view's setting, shallow-merged per layer.
- **State:** each slice is uncontrolled, controlled through `state`, or kept in an external store through `atoms`.
- **Types:** features extend the `Calendar_*_FeatureMap` interfaces by declaration merging, keyed by their export name.
  Options, view settings, state, API and model fields then exist only where the feature is registered.
- **Replacing an implementation:** `{ ...views.features, listLayout: myList }` replaces it in every view.
- **Layouts are features too:** `monthLayout`, `dayGridLayout`, `timeGridLayout`, `listLayout` and `timelineLayout` supply
  navigation and `build`; a new view kind is a layout feature plus a `Calendar_Layout_FeatureMap` entry.

## Background layers

`backgroundFeature` shades time in the time-grid and month views that list it (design D33). Each layer in the
`backgrounds` option is one kind of shading: fixed ranges, a function of the visible range, or the gaps they leave
(`inverse`), optionally limited to some resources.

```ts
import { backgroundFeature, createBackgroundLayer, createWeeklyRanges } from '@calendar-tsx/core';

// module scope: layers and their ranges functions are compared by reference
const backgrounds = [
  createBackgroundLayer({
    id: 'business-hours',
    kind: 'closed',
    inverse: true,
    ranges: createWeeklyRanges([
      {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: Temporal.PlainTime.from('09:00'),
        endTime: Temporal.PlainTime.from('17:00'),
      },
    ]),
  }),
  createBackgroundLayer({
    id: 'holidays',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-12-25') }],
  }),
];

const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { backgroundFeature } }),
  month: monthView({ maxEventsPerDay: 4, features: { backgroundFeature } }),
});

createCalendar({ ...options, views: views.views, features: { ...views.features }, backgrounds });
```

Time-grid columns get `backgrounds: { key, layer, kind, start, span }[]`, as fractions of the day. Month days get
`backgrounds: { key, layer, kind }[]` from all-day ranges, and from inverse layers on the days none of their ranges
touch. Render them with `TimeGridViewBackground` and `MonthViewDayBackground`.
