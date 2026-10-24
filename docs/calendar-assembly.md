# Calendar assembly API

Status: implemented. This document records the factory assembly API and per-view configuration rules. See D54 in the
[design spec](./design.md) for the decision and its relationship to D29 and D53.

The implemented [core feature organization and exports](./core-features.md) keeps implementations in feature-owned
modules. All public calendar and feature symbols are imported from `@calendar-tsx/core`.

## Assembly

Build the configuration in three stages:

1. Call feature factories with their default configuration, then collect their definitions with `calendarFeatures`.
2. Pass that registry to `calendarViews`, alongside named view definitions and their feature overrides.
3. Pass `features` and `views` directly to `createCalendar`, or to an adapter's `useCalendar` hook.

```ts
const features = calendarFeatures({
  background: backgroundFeature(defaultBackgrounds),
  recurrence: recurrenceFeature(),
});

const views = calendarViews({
  features,
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
    week: timeGridView({
      weeks: 1,
      hiddenDays: [DayOfWeek.Saturday, DayOfWeek.Sunday],
      timeWindow: { startMinutes: 480, endMinutes: 1080 },
      slotMinutes: 30,
      features: {
        background: workWeekBackgrounds,
      },
    }),
  },
});

const calendar = createCalendar({
  features,
  views,
  timeZone: 'America/Montevideo',
  events,
  view,
  date,
  onNavigate,
});
```

The view collection is used directly as `views`. Consumers do not unwrap `views.views` or spread `views.features`.
View factories continue to supply their layouts.

## Feature factories and registration keys

Each feature owns its factory signature. `backgroundFeature(defaultBackgrounds)` takes the background layers
directly. `recurrenceFeature()` needs no configuration. `calendarFeatures` accepts an object of their returned
definitions; it does not introduce a second options argument or a `{ feature, options }` wrapper.

The object's keys identify registrations and their view overrides. In this example, the key is `background`, not
the export name `backgroundFeature`. The configured definition must retain the feature's own identity so its
options, event inputs, state, actions and model contributions remain typed independently of the chosen key.

Factories produce configuration definitions. `createCalendar` creates calendar state and actions. Reusing a
definition across views does not create separate feature state for those views. Separate calendar instances own
separate state.

## Per-view overrides

Registering a feature makes it participate in every view. Omitting a feature entry from a view inherits the
registered defaults. An override affects that view only; it does not change another view's participation or
configuration. A feature still supplies only the model contributions supported by the view's layout.

An override uses the same configuration input shape as the feature factory. The background factory takes an
array, so its override is an array:

```ts
features: {
  background: workWeekBackgrounds,
}
```

The override replaces the background array. To extend the defaults, spread them explicitly into the replacement.
An empty array means there are no background layers in that view; it does not unregister the feature. There is
no second call to `backgroundFeature` inside a view.

Recurrence source resolution remains calendar-wide. A view override does not create a separate event source
resolver or a separate set of recurrence state.

## React setup

This example includes its background layers and one event. Rendering parts belong inside `CalendarProvider`.
Definitions stay at module scope so their references remain stable. This setup is also
[a compiled React example](../apps/docs/examples/react/assembly.tsx).

```tsx
import { useState, type ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';

import {
  backgroundFeature,
  calendarFeatures,
  calendarViews,
  createBackgroundLayer,
  createEvent,
  createWeeklyRanges,
  dayGridView,
  DayOfWeek,
  recurrenceFeature,
  timeGridView,
} from '@calendar-tsx/core';
import { CalendarProvider, useCalendar } from '@calendar-tsx/react';

const timeZone = 'America/Montevideo';

const defaultBackgrounds = [
  createBackgroundLayer({
    id: 'christmas',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-12-25') }],
  }),
];

const workWeekBackgrounds = [
  ...defaultBackgrounds,
  createBackgroundLayer({
    id: 'outside-business-hours',
    kind: 'closed',
    inverse: true,
    ranges: createWeeklyRanges([
      {
        daysOfWeek: [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday],
        startTime: Temporal.PlainTime.from('09:00'),
        endTime: Temporal.PlainTime.from('17:00'),
      },
    ]),
  }),
];

const events = [
  createEvent({
    id: 'planning',
    kind: 'timed',
    start: Temporal.ZonedDateTime.from('2026-10-26T10:00-03:00[America/Montevideo]'),
    end: Temporal.ZonedDateTime.from('2026-10-26T11:00-03:00[America/Montevideo]'),
    data: { title: 'Planning' },
  }),
];

const features = calendarFeatures({
  background: backgroundFeature(defaultBackgrounds),
  recurrence: recurrenceFeature(),
});

const views = calendarViews({
  features,
  views: {
    month: dayGridView({
      period: 'month',
      maxEventsPerDay: 3,
    }),
    week: timeGridView({
      weeks: 1,
      hiddenDays: [DayOfWeek.Saturday, DayOfWeek.Sunday],
      timeWindow: { startMinutes: 480, endMinutes: 1080 },
      slotMinutes: 30,
      features: {
        background: workWeekBackgrounds,
      },
    }),
    day: timeGridView({
      days: 1,
      timeWindow: { startMinutes: 360, endMinutes: 1320 },
      slotMinutes: 15,
      features: {
        background: [],
      },
    }),
  },
});

type ViewKey = keyof typeof views;

export function Scheduler({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>('week');
  const [date, setDate] = useState(() => Temporal.PlainDate.from('2026-10-26'));

  const calendar = useCalendar({
    features,
    views,
    events,
    timeZone,
    firstDayOfWeek: DayOfWeek.Monday,
    view,
    date,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  });

  return (
    <CalendarProvider value={calendar} locale='en-US'>
      {children}
    </CalendarProvider>
  );
}
```

Month inherits the holiday backgrounds. Week uses holidays plus business-hour shading. Day has no background
layers. All three views retain recurrence support. Navigation stays controlled through `view`, `date` and
`onNavigate`; accessible-label locale stays on the provider.

## Validation and configuration lifetime

The registry and view binder preserve consumer keys and each feature's contributions. Unknown override keys,
invalid override types and missing or incompatible registrations are rejected. A configured definition carries
its stable identity independently of its alias, including for recurrence input types and source resolution.
Canonical model-feature keys preserve structural compatibility with React and Solid parts.

Object overrides shallow-merge with factory defaults. Nested objects are replaced. Arrays replace the entire
array. Duplicate registrations of one feature identity are rejected, and no feature-disabling syntax is provided.
Features with no configuration arguments reject overrides.

Definitions and factory defaults are fixed at calendar creation. Keep references stable, and supply a new view
definition and `views` map to update an override. A new registry object containing the same definitions is allowed;
replacing definitions through `~update` throws. Create a new calendar to change registered definitions or defaults.

State and actions initialize once per calendar. Factories and view assembly do not initialize state. Resolved
configuration is cached per view definition and included in stage dependencies. A rejected update leaves the
current calendar options and state unchanged.
