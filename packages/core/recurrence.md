# Native recurrence

> [!WARNING]
> **Experimental.** Its API can change or be removed in any release, without notice.

Core provides daily and weekly recurrence using Temporal, with no recurrence-engine dependency. Register `recurrenceFeature` and
pass definitions alongside one-off events. React and Solid use their existing hooks, stores and parts.

```bash
pnpm add @calendar-tsx/core temporal-polyfill
```

## Timed series

```ts
import {
  createCalendar,
  createCalendarViews,
  listView,
  createRecurringEvent,
  recurrenceFeature,
} from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

const review = createRecurringEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-01-05T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: { freq: 'WEEKLY', interval: 2, byDay: ['MO', 'WE'], count: 20 },
  data: { title: 'Review' },
});

const views = createCalendarViews({ month: listView({ period: 'month' }) });
const calendar = createCalendar({
  timeZone: 'America/New_York',
  views: views.views,
  features: { ...views.features, recurrenceFeature },
  view: 'month',
  date: Temporal.PlainDate.from('2026-01-01'),
  events: [review],
  onNavigate: next => console.log(next),
});
```

`createRecurringEvent` adds `~source: 'recurrenceFeature'` and infers `data`. Explicit feature types reject its
inputs when the feature is absent; a missing runtime resolver throws.

## Rules

The `rrule` name and options match a subset of [`@calendar-tsx/rrule`](../rrule/readme.md). Only plain options
objects are accepted. Unsupported options throw, including selectors that would otherwise broaden the schedule.

| Option     | Daily                            | Weekly                                       |
| ---------- | -------------------------------- | -------------------------------------------- |
| `freq`     | `'DAILY'`                        | `'WEEKLY'`                                   |
| `interval` | Positive integer days, default 1 | Positive integer weeks, default 1            |
| `count`    | Nonnegative integer occurrences  | Nonnegative integer occurrences              |
| `until`    | Inclusive Temporal bound         | Inclusive Temporal bound                     |
| `byDay`    | Unsupported                      | Nonempty weekday array, default seed weekday |
| `wkst`     | Unsupported                      | Week start, default `'MO'`                   |

Weekdays are `'MO'`, `'TU'`, `'WE'`, `'TH'`, `'FR'`, `'SA'`, `'SU'`. Weekly dates are sorted and deduplicated.
`wkst` anchors interval weeks independently of the calendar's display setting. Dates before the seed are omitted;
the seed is included only if it matches the rule. COUNT includes matching nominal starts before the queried range,
and is applied before exclusions. `count: 0` produces no rule occurrences. COUNT and UNTIL may be combined.

`start` supplies the seed date, wall time and recurrence zone. All dates use the ISO 8601 calendar, and seeds use
years 1–9999. `until` must match the event kind: `ZonedDateTime` for timed events, `PlainDate` for all-day events.
Timed bounds compare instants, including nanoseconds, and can use another zone.

## Exceptions

```ts
const adjusted = createRecurringEvent({
  ...review,
  rdate: [Temporal.ZonedDateTime.from('2026-01-09T09:00[America/New_York]')],
  exdate: [Temporal.ZonedDateTime.from('2026-01-07T09:00[America/New_York]')],
  exrule: {
    freq: 'DAILY',
    start: Temporal.ZonedDateTime.from('2026-02-02T09:00[America/New_York]'),
    until: Temporal.ZonedDateTime.from('2026-02-06T09:00[America/New_York]'),
  },
});
```

`rdate` adds starts and deduplicates them. `exdate` and `exrule` remove starts, including RDATE additions; exclusions
do not replenish COUNT or trim durations. Timed exceptions identify instants; all-day exceptions identify dates.

`exrule` accepts one object or an array, using the same daily/weekly subset. Each exclusion can set an independent
`start`, clock time, zone, interval, COUNT and inclusive UNTIL. Omitted starts inherit the parent seed. Starts and
bounds must match the parent date kind. An exclusion whose UNTIL precedes its seed is empty.

## Time zones and duration

Changing the display zone converts occurrences after expansion and preserves their schedule. Compatible Temporal
resolution moves DST gaps forward and chooses the earlier offset in folds. An explicitly offset seed keeps its
instant, and subsecond precision is retained. Shifted gap candidates count toward COUNT. Candidates resolving to
the same instant are deduplicated.

Timed `duration` is required and positive. It measures elapsed time: days/weeks are multiples of 24 hours;
years/months are rejected. Timed ends are exclusive.

All-day series use `kind: 'allDay'`, a `PlainDate` start, and an optional positive whole-day/week duration, defaulting
to one day. Generated all-day ends are inclusive.

## Stores and occurrences

Definitions share the existing `events` array and stores. Generated events copy `resourceIds`, `display` and `data`,
and expose `occurrence: { seriesId, originalStart }` before display-zone conversion. Expansion includes starts
before the view when their duration overlaps it. Background events follow the existing layout rules.

IDs use the same scheme as the RRule package, so switching implementations preserves IDs for matching occurrences.
Update or remove a series by its definition ID. Replace one occurrence with an exception and a one-off event.
Inputs are immutable; replace arrays and definitions when editing. An initially empty store can use
`Calendar_EventDefinition<EventData>[]` from core.

Expansion seeks directly into the queried range, including finite series, without replaying historical starts.
Each query permits at most 10,000 daily or weekly periods per rule after seeking and clipping COUNT/UNTIL.
Exceeding this limit throws; no partial results are returned. Each definition caches at most four range/zone
queries, and clock ticks reuse resolution.

## Switching to RRule

Use [`@calendar-tsx/rrule`](../rrule/readme.md) for strings, monthly/yearly or subdaily schedules, ordinal weekdays,
and additional selectors. Native rule objects and event definitions are structurally compatible with that package:

```ts
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';

const advanced = createRRuleEvent({ ...review, rrule: { freq: 'MONTHLY', byDay: ['2FR'] } });
```

Replace the factory and registered feature when switching. An unchanged native definition produces matching starts,
ends, exceptions, occurrence metadata and IDs. Both features may also coexist in one calendar.
