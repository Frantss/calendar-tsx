# @calendar-tsx/core

> [!WARNING]
> **Experimental.** `@calendar-tsx/core` is an experiment. Its API can change or be removed in any release, without notice.

Framework-agnostic calendar engine that powers [`@calendar-tsx/react`](../react). It derives day-grid, time-grid,
list and timeline layouts from controlled view/date options and event input, in a single time zone.

Calendar APIs, built-in features, helpers and public types use the same entry point:

```ts
import {
  backgroundFeature,
  createBackgroundLayer,
  createWeeklyRanges,
  recurrenceFeature,
  createRecurringEvent,
} from '@calendar-tsx/core';
```

Configure features with their factories, register them with
`calendarFeatures`, and bind views with `calendarViews`. See the
[factory assembly API](../../docs/calendar-assembly.md) and
[core feature organization and exports](../../docs/core-features.md) for module ownership and the public entry.

## Quick example

```ts
import { dayGridView, timeGridView, calendarFeatures, calendarViews, createCalendar } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

// module scope: views and features are compared by reference
const features = calendarFeatures({});
const views = calendarViews({
  features,
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
    week: timeGridView({ days: 7 }),
  },
});

const calendar = createCalendar({
  timeZone: 'America/New_York',
  views,
  features,
  view: 'week',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [],
  onNavigate: next => {
    // store next.view / next.date, then pass them back in through `~update`
  },
});

calendar.store.state.layout; // dayGrid | timeGrid: the layouts the views register
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

Timeline rows expose `backgroundEvents` independently of foreground `segments`. Register `backgroundFeature(layers)` in the feature registry and bind it with
`calendarViews` to add `row.backgrounds` for fixed, weekly or inverse layers. Both use fractions of the visible
track and take no stack rows. Unassigned background events shade every resource; scoped layers require a matching
resource row. All-day shading follows anchor dates; timed shading uses exact projected coverage.

## Hidden weekdays and visible hours

Core exports the `DayOfWeek` const object with ISO values (`DayOfWeek.Monday` is `1`, `DayOfWeek.Sunday` is `7`).
Use it for `firstDayOfWeek`, `hiddenDays` and weekly background rules' `daysOfWeek`. Numeric literals remain valid.

All built-in views accept `hiddenDays`. Time grids and timelines
also accept a `timeWindow` in nominal clock minutes:

```ts
import { DayOfWeek, timeGridView, timelineView } from '@calendar-tsx/core';

timeGridView({
  days: 7,
  hiddenDays: [DayOfWeek.Saturday, DayOfWeek.Sunday],
  timeWindow: { startMinutes: 480, endMinutes: 1080 },
});
timelineView({ days: 1, timeWindow: { startMinutes: 1320, endMinutes: 1800 } }); // 22:00–06:00
```

Defaults show every weekday and `[0, 1440)`. Window bounds are integers: `0 <= startMinutes < 1440` and
`startMinutes < endMinutes <= startMinutes + 1440`. A positive integer `slotMinutes` need not divide the window;
the final slot has its actual proportional size. Slot models expose `dayOffset`, `start` and `span` for labels.

An overnight window belongs to its starting date. Hiding Tuesday leaves Monday's Tuesday-morning portion visible.
All-day items retain their anchor dates. Month rows keep their calendar-week boundaries; bars and overflow only
occupy visible cells. Hiding all seven weekdays is invalid. When hidden weekdays would leave the range without a date, as a one-day view on
a hidden weekday would, the range shows its dates anyway.

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

Core exports `createRecurringEvent` and `recurrenceFeature` for [native daily/weekly schedules](recurrence.md).
Recurring definitions share `events` with one-off inputs. Use the optional
[`@calendar-tsx/rrule`](../rrule/readme.md) for more capable rules. `Calendar_EventDefinition<TData, TFeatures>` includes inputs
contributed by registered features; `Calendar_EventInput<TData>` remains the concrete timed/all-day union used by
layouts. Stores retain definitions, and generated events expose `occurrence.seriesId` and `occurrence.originalStart`.

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
- Day grid: `section.rows[].backgroundEvents` spans, for all-day background events only.
- List: left out.
- Without `resourceIds`, a background event shades every resource column.

## Brief event sizes

`timeGridView` lays out timed events shorter than half a slot as half a slot long, with their own lane if they would
otherwise cover the next event. The event's actual start and end are unchanged. Set `minEventMinutes` to override the
minimum, or `0` to use exact durations.

## Timeline event sizes

`timelineView` lays out short timed events with a minimum display duration of half a slot. Stacking uses that enlarged span, so neighboring brief events stay separate. The event's actual start and end are unchanged. Set `minEventMinutes` to override the minimum, or `0` to use exact durations. Bars clip at the visible range's end; all-day events keep their date spans.

For coarse timelines, combine daily slots with `minSlotWidth`, for example `timelineView({ period: 'quarter', slotMinutes: 1440, minSlotWidth: '6rem' })`. The default minimum then occupies half a daily column instead of a one-pixel sliver.

## Resource agendas

List agendas can group resources and dates with the same factory:

```ts
import { listView } from '@calendar-tsx/core';

listView({ weeks: 1, groupBy: 'resource' });
listView({ weeks: 1, groupBy: ['date', 'resource'] });
```

`layout.sections` contains the outer resource or date groups and their event-bearing days. `layout.days` indexes the same days in render order. Resource agendas include only events assigned to known resources, in resource input order; shared events appear under each assigned resource. Ordinary lists continue to include unassigned events.

## Features

Feature factories return reusable configuration definitions (design D54). Register each definition under a
consumer-chosen key, then pass the registry into `calendarViews` and `createCalendar`:

```ts
const features = calendarFeatures({ background: backgroundFeature(defaultBackgrounds) });
const views = calendarViews({
  features,
  views: {
    week: timeGridView({ weeks: 1 }),
    day: timeGridView({ days: 1, features: { background: dayBackgrounds } }),
  },
});

createCalendar({ ...options, features, views });
```

Every view inherits the registered features. Overrides use the factory's configuration input shape. Objects
shallow-merge with defaults; arrays replace them. An empty background array clears that view's layers. Omitted
entries inherit defaults, and adding an override to one view does not change another view's participation.

- Hooks can contribute initial state, actions, source resolution, event stages and layout decoration.
- Feature hooks read their resolved configuration from `context.config`. The runtime includes it in stage cache
  dependencies. State and actions belong to the calendar instance and are shared across views.
- Sources carry a stable `~source` identity. Resolver lookup uses the configured definition's `~id`, so registry
  aliases preserve event-input types and runtime resolution. Resolution remains calendar-wide and is cached by
  input reference, input range and display zone.
- State can be internal, controlled through `state`, or kept in external `atoms`.
- Features extend the `Calendar_*_FeatureMap` interfaces using their stable identities. Registry aliases preserve
  state, action, event-input and model contributions. Layout feature maps receive canonical identities.
- Duplicate feature identities and registry keys that conflict with a view's layout are rejected.
- Feature definitions and factory defaults are fixed at creation. Pass a new `views` reference to update view
  overrides. Changing registered definitions through `~update` throws; create a new instance instead.
- Views supply their layout features. Consumers do not register layouts in the feature registry.

See [feature organization and exports](../../docs/core-features.md) for the module layout and public entry.

`Calendar_Api_FeatureMap<TData, TResourceData>` receives the same event and resource payload types as the options
map. Use them in an action's parameters or return type; `createCalendar` and the adapters infer them from the calendar
input. Existing declarations without type parameters remain valid. Explicit API annotations use
`Calendar_Api<TViews, TFeatures, TData, TResourceData>`; omitted payload parameters default to `unknown`.

## Background layers

`backgroundFeature(layers)` shades time in the time-grid, day-grid and timeline views (design D33). Each layer passed to the
factory is one kind of shading: fixed ranges, a function of the visible range, or the gaps they leave
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

const features = calendarFeatures({ background: backgroundFeature(backgrounds) });
const views = calendarViews({
  features,
  views: {
    week: timeGridView({ days: 7 }),
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
  },
});

createCalendar({ ...options, views, features });
```

Time-grid columns get `backgrounds: { key, layer, kind, start, span }[]`, as fractions of the day. Day-grid cells get
`backgrounds: { key, layer, kind }[]` from all-day ranges, and from inverse layers on the days none of their ranges
touch. Render them with `TimeGridViewBackground` and `DayGridViewDayBackground`.
