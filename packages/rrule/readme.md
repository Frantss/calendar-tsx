# @calendar-tsx/rrule

> [!WARNING]
> **Experimental.** Its API can change or be removed in any release, without notice.

Recurrence for calendar-tsx, powered by `rrule-temporal` 2.2.8. Register `rruleFeature` and pass recurring definitions alongside
one-off events. React and Solid use their existing hooks and parts.

```bash
pnpm add @calendar-tsx/rrule @calendar-tsx/core temporal-polyfill
```

For native daily/weekly schedules with compatible options and no recurrence-engine dependency, use
[native recurrence in `@calendar-tsx/core`](../core/recurrence.md). Switching factories and registered features preserves
matching occurrences and their IDs.

## Timed series

```ts
import { createCalendar, calendarViews, calendarFeatures, listView } from '@calendar-tsx/core';
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';

const features = calendarFeatures({ recurrence: rruleFeature() });
const views = calendarViews({ features, views: { month: listView({ period: 'month' }) } });
const review = createRRuleEvent({
  id: 'month-end-review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-01-01T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  data: { title: 'Month-end review' },
});

const calendar = createCalendar({
  timeZone: 'America/New_York',
  views,
  features,
  view: 'month',
  date: Temporal.PlainDate.from('2026-01-01'),
  events: [review],
  onNavigate: next => {
    /* apply next.view and next.date to your controlled options */
  },
});
```

`createRRuleEvent` adds the source discriminator and infers `data`. Importing its types does not register the feature:
include `rruleFeature` in `features`. Explicit feature types reject recurring input when that feature is absent;
untyped input without a resolver throws.

`start` owns the seed date, clock time and recurrence zone. A DTSTART in a string must agree with it; a conflicting
TZID throws. The rule determines whether the seed is an occurrence. Changing the calendar's display zone converts
occurrences after expansion and does not move their schedule.

Timed `duration` is required and positive. Days and weeks mean elapsed multiples of 24 hours; years and months are
rejected. Subsecond precision from `start` is retained. Across a DST gap, Temporal's `compatible` disambiguation
moves the nominal time forward. Across a fold, it chooses the earlier offset. An explicitly offset seed retains its
instant. COUNT counts nominal rule candidates, including a gap candidate shifted forward.

## Options objects

`rrule` also accepts native `rrule-temporal` options: string frequencies and camel-case selector arrays:

```ts
createRRuleEvent({
  ...review,
  rrule: {
    freq: 'MONTHLY',
    byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
    bySetPos: [-1],
    until: Temporal.ZonedDateTime.from('2027-01-01T00:00[America/New_York]'),
  },
});
```

Selectors follow `rrule-temporal`, including ordinal weekdays such as `byDay: ['2FR']`. Use Temporal for `until`;
omit `dtstart` and `tzid`. Instantiated rule objects are not accepted. RRULE string UNTIL values can be
local DATE-TIME or UTC DATE-TIME ending in `Z`; UTC bounds are checked against the resolved instant, inclusively.

## Inclusions and exclusions

```ts
createRRuleEvent({
  ...review,
  rdate: [Temporal.ZonedDateTime.from('2026-02-26T09:00[America/New_York]')],
  exdate: [Temporal.ZonedDateTime.from('2026-02-27T09:00[America/New_York]')],
  exrule: { freq: 'YEARLY', byMonth: [12] },
});
```

`exrule` accepts one rule or an array of rules. Inclusions are merged and deduplicated; EXDATE and EXRULE win over
both RRULE and RDATE. Exclusions do not replenish COUNT. Timed exception dates identify instants and may use another
zone. All-day exception dates must be `Temporal.PlainDate`.

Each options-object exclusion can set its own `start`. If omitted, it inherits the parent seed. A timed exclusion
uses its start's own zone and clock time; an all-day exclusion uses a `PlainDate`. `start` and `until` must match
the parent event's date kind. COUNT and INTERVAL are measured from the exclusion's seed; UNTIL is inclusive.

```ts
createRRuleEvent({
  id: 'weekly-review',
  kind: 'allDay',
  start: Temporal.PlainDate.from('2026-01-05'),
  rrule: { freq: 'WEEKLY', count: 4 },
  exrule: {
    freq: 'WEEKLY',
    start: Temporal.PlainDate.from('2026-01-19'),
    until: Temporal.PlainDate.from('2026-01-26'),
  },
  data: { title: 'Review' },
});
```

This leaves January 5 and 12. Each entry in an exclusion array can use a different seed and bounds. Timed rules
exclude matching instants, even when the exclusion and parent use different zones. An exclusion starting after
its UNTIL produces no excluded dates. String exclusions and inline EXRULE lines inherit the parent seed.

A string may contain DTSTART, multiple RRULE lines, RDATE, EXDATE and EXRULE. DATE and DATE-TIME values use RFC basic
notation, for example `EXDATE;TZID=America/New_York:20260227T090000` or `EXDATE:20260227T140000Z`. Folded lines are
supported. Whole VCALENDAR/VEVENT documents and RDATE periods are not accepted.

## All-day series

```ts
const holiday = createRRuleEvent({
  id: 'holiday',
  kind: 'allDay',
  start: Temporal.PlainDate.from('2026-01-01'),
  duration: Temporal.Duration.from({ days: 2 }),
  rrule: 'FREQ=YEARLY',
  data: { title: 'Holiday' },
});
```

All-day `duration` defaults to one day and accepts positive whole days/weeks. Two days produce an inclusive end on
the following date. Use daily or coarser frequencies and DATE values for UNTIL and exception dates. The seed and
exception dates must use the ISO 8601 calendar; the rule engine supports seed years 1–9999.

## Occurrences and stores

Generated events have stable IDs derived from the series ID and scheduled start. Their `occurrence` contains
`seriesId` and `originalStart`, in the recurrence zone before display-zone conversion. IDs do not depend on the
visible range or display zone. One-off IDs share the same namespace; duplicate IDs receive the core development
warning.

`resourceIds`, `display` and `data` are copied to each occurrence. Background series follow existing background
layout rules. `createEventStore` and both adapters' `useCalendarEventStore` hold definitions; update or remove the
series by its ID. For an initially empty store that will hold series, type its initial array as
`Calendar_EventDefinition<EventData>[]`. To replace one occurrence, exclude its original start and add a one-off event.

Expansion runs before normalization, visibility filtering, background splitting, ordering and feature event stages.
It includes starts before the view when their duration overlaps it. Input arrays and definitions are immutable;
replace them when editing. Clock ticks reuse the current expansion. Each definition caches up to four range/zone
queries. The engine's full-result cache is disabled.

The engine receives nominal UTC `Temporal.ZonedDateTime` values; the calendar resolves their wall fields in the
series zone. This preserves the compatible gap/fold and COUNT policy above while removing JavaScript `Date`
transport and implementation branding mismatches. Output uses this library's `temporal-polyfill` namespace.

`rrule-temporal` can seek into eligible range queries and enforces work limits. Default limits are 10,000 outer
iterations and 1,000,000 candidate evaluations. Options objects can set `maxIterations` and
`maxCandidateEvaluations`; exhausted budgets throw rather than returning a partial set. Complex or large queries
can still be expensive. The former `rrule` subdaily selector stall is covered by a passing empty-set regression.
