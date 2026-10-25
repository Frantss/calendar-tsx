# @calendar-tsx/rrule

> [!WARNING]
> **Experimental.** The API can change or be removed in any release, without notice.

RFC 5545 recurrence for calendar-tsx, powered by `rrule-temporal`. For daily
and weekly schedules without the extra dependency, use the native recurrence in [`@calendar-tsx/core`](../core).

```bash
npm i @calendar-tsx/rrule @calendar-tsx/core temporal-polyfill
```

```ts
import { calendarFeatures } from '@calendar-tsx/core';
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';

const features = calendarFeatures({ recurrence: rruleFeature() });
const review = createRRuleEvent({
  id: 'month-end-review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-01-01T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  data: { title: 'Month-end review' },
});
```

Pass `features` to `calendarViews` and `createCalendar`, and recurring definitions in `events` alongside one-off
events. See [recurrence](../../apps/docs/content/docs/core/features/recurrence.mdx).
