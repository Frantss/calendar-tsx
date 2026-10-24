# FullCalendar DST rendering comparison

## Source verification: 2026-10-23, FullCalendar v7.1.3

The [official documentation](https://fullcalendar.io/docs/all) identifies v7.1.3 as the current release. This check
uses the exact tagged source archives from
[FullCalendar](https://github.com/fullcalendar/fullcalendar/tree/v7.1.3) and
[its workspace, including Premium](https://github.com/fullcalendar/fullcalendar-workspace/tree/v7.1.3).
The examples use `America/New_York`, with explicit UTC offsets distinguishing repeated-hour occurrences.

### 1. TimeGrid shares the fixed clock axis but not every crossing-event rule

- **What:** TimeGrid uses civil date markers and the configured clock window to calculate vertical positions. Its
  standard 00:00–24:00 day retains 48 half-hour slots across both DST changes. Two events at 01:15–01:45 in different
  occurrences therefore share vertical positions and participate in visual collision placement. Ordinary spring
  01:30 EST–03:30 EDT and autumn 00:30 EDT–02:30 EST crossings display two clock hours, matching D40.
- **Where:** FullCalendar
  [`packages/headless-calendar/src/env.ts:128`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/headless-calendar/src/env.ts#L128)
  converts exact instants into civil markers;
  [`packages/preact/src/timegrid/components/util.ts:66`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/components/util.ts#L66)
  projects those markers;
  [`packages/preact/src/timegrid/seg-placement-adapter.ts:66`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/seg-placement-adapter.ts#L66)
  computes endpoint geometry before collision placement;
  [`packages/vanilla-tests/src/date-selection/dst-selection.ts:5`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/vanilla-tests/src/date-selection/dst-selection.ts#L5)
  records and asserts the fixed slot count. Local comparison:
  `packages/core/src/layout/layout-axis.ts:35`; `packages/core/src/tests/layout-dst.spec.ts:113`.
- **Why it matters:** matching the ordinary clock axis does not establish identical handling of all intervals that
  cross an offset transition. FullCalendar uses endpoint projection; D40 encloses every projected interval part.

### 2. A rollback event with a civil end before its start has different geometry

- **What:** For 2026-11-01 01:30 EDT–01:15 EST, 45 real minutes elapse. FullCalendar retains the exact end instant but
  internally represents its civil end as start plus elapsed duration: 02:15. TimeGrid consequently projects a
  01:30–02:15 rectangle. D40 instead encloses the visited clock intervals, 01:30–02:00 and 01:00–01:15, yielding one
  01:00–02:00 rectangle. These are different display policies. This specific FullCalendar geometry is derived from
  the tagged source rather than claimed as a browser observation.
- **Where:** FullCalendar
  [`packages/preact/src/structs/event-instance.ts:192`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/structs/event-instance.ts#L192)
  builds the civilly ordered range;
  [`packages/preact/src/structs/event-parse.ts:218`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/structs/event-parse.ts#L218)
  applies it to timed input;
  [`packages/preact/src/timegrid/seg-placement-adapter.ts:66`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/seg-placement-adapter.ts#L66)
  projects the adjusted endpoints. Local comparison: `packages/core/src/layout/layout-axis.ts:61`;
  `packages/core/src/tests/layout-dst.spec.ts:136`.
- **Why it matters:** both implementations preserve actual event timestamps, but their bars cover different clock
  bands for the same event.

### 3. Even civilly ordered endpoints can differ when the interval crosses the repeated hour

- **What:** For 2026-11-01 01:15 EDT–01:45 EST, FullCalendar keeps the civilly ordered endpoint markers and projects
  01:15–01:45. D40 encloses both sides of the transition and projects 01:00–02:00. Real duration is 90 minutes. This
  follows directly from the same source branches as Finding 2.
- **Where:** FullCalendar
  [`packages/preact/src/structs/event-instance.ts:210`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/structs/event-instance.ts#L210);
  [`packages/preact/src/timegrid/seg-placement-adapter.ts:66`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/seg-placement-adapter.ts#L66).
  Local comparison: `packages/core/src/layout/layout-axis.ts:35`; `packages/core/src/layout/layout-axis.ts:61`.
- **Why it matters:** the TimeGrid difference is broader than preventing negative-width or negative-height events.

### 4. Timed Timeline uses real occurrences, including a separate repeated hour

- **What:** FullCalendar Premium's timed Timeline resolves each civil slot boundary to all real occurrences. It
  skips nonexistent spring slots and renders both autumn occurrences, with distinct offset-based keys. At a
  half-hour slot duration this gives 46 slots on the spring day and 50 on the autumn day. Event slicing and
  coordinates use exact instants. With the usual half-hour or hour slots, spring 01:30 EST–03:30 EDT spans one
  rendered hour; autumn 00:30 EDT–02:30 EST spans three. Two 01:15–01:45 events in separate occurrences occupy
  different horizontal positions. The rollback event in Finding 2 spans 45 minutes from the first 01:30 to the
  second 01:15. Whole-day Timeline axes use civil-marker arithmetic instead.
- **Where:** FullCalendar workspace
  [`premium/packages/preact-scheduler/src/timeline/timeline-time-axis.ts:44`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/timeline-time-axis.ts#L44)
  builds real slot occurrences;
  [`premium/packages/preact-scheduler/src/timeline/TimelineLaneSlicer.ts:107`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/TimelineLaneSlicer.ts#L107)
  slices exact event instants;
  [`premium/packages/preact-scheduler/src/timeline/TimelineCoords.ts:52`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/TimelineCoords.ts#L52)
  interpolates within real slot spans. Upstream regression coverage:
  [`timeline-dst-slots.ts:1`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/vanilla-scheduler-tests/src/timeline/timeline-dst-slots.ts#L1)
  and
  [`timeline-dst-event-rendering.ts:1`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/vanilla-scheduler-tests/src/timeline/timeline-dst-event-rendering.ts#L1).
  Local comparison: `packages/core/src/tests/layout-dst.spec.ts:67`; `docs/design.md:1080`.
- **Why it matters:** the local fixed 24-hour Timeline follows the user's accepted D40 choice but differs from
  FullCalendar's timed Timeline across DST. Calling the original axis-alignment bug resolved remains accurate;
  claiming full DST behavioral parity with FullCalendar does not.

### Verification scope

The sources above were read from the tagged release archives. The comparison was traced through parsing, range
construction, slicing and coordinate calculation, and cross-checked against upstream DST regression tests. Those
upstream browser tests were inspected, not executed in this source check. No implementation files changed.

The parent agent independently exercised the published `fullcalendar@7.1.3` Vanilla bundle with
`temporal-polyfill@1.0.6` in Chromium. The TimeGrid used a 00:00–04:00 window, 30-minute slots at 40 pixels, skeleton
CSS, and `slotEventOverlap: false`. Observed event rectangles, relative to the time canvas:

| Input event                                        | Rendered civil markers                      | Top / height      |
| -------------------------------------------------- | ------------------------------------------- | ----------------- |
| Spring 01:30 EST–03:30 EDT                         | 01:30–03:30                                 | 120px / 160px     |
| Autumn 00:30 EDT–02:30 EST                         | 00:30–02:30                                 | 40px / 160px      |
| Autumn 01:30 EDT–01:15 EST                         | 01:30–02:15                                 | 120px / 60px      |
| Separate first- and second-pass 01:15–01:45 events | Both 01:15–01:45, separate half-width lanes | Both 100px / 40px |

For the rollback event the public API still reported the true 05:30Z–06:15Z endpoints. This browser observation
confirms Findings 1 and 2 in the published release. Timeline evidence above remains the tagged source and upstream
test assertions.

### Additional published-release browser verification

Subsequent Chromium checks supersede the source-only qualification in Finding 2 and the Timeline verification
limit stated above. FullCalendar TimeGrid also confirmed Finding 3: 01:15 EDT–01:45 EST retained civil markers
01:15–01:45 and rendered at top 100px with height 40px, representing 30 displayed minutes. The exact instants were
1793510100000–1793515500000, a real duration of 90 minutes.

The published Scheduler v7.1.3 bundle was then loaded after the base FullCalendar global bundle, using the base
skeleton CSS. `timelineDay` used a 00:00–04:00 window and 30-minute slots at 60 pixels. Event parent positioning
styles supplied these coordinates relative to the time canvas:

| Input event                 | Left / width  | Displayed elapsed coverage |
| --------------------------- | ------------- | -------------------------- |
| Spring 01:30 EST–03:30 EDT  | 180px / 120px | 1 hour                     |
| Autumn 00:30 EDT–02:30 EST  | 60px / 360px  | 3 hours                    |
| Autumn 01:30 EDT–01:15 EST  | 180px / 90px  | 45 minutes                 |
| First-pass 01:15–01:45 EDT  | 150px / 60px  | 30 minutes                 |
| Second-pass 01:15–01:45 EST | 270px / 60px  | 30 minutes                 |

The first- and second-pass events shared the same top coordinate, 18.5px, in the tested set of concurrent events,
but occupied distinct horizontal spans. This independently confirms the real-occurrence Timeline behavior in
Finding 4 against the published release.
