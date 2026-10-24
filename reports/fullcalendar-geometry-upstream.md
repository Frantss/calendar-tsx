# FullCalendar geometry baseline after D41

Checked 2026-10-23 against official v7 documentation and tagged v7.1.3 source. The
[latest release](https://github.com/fullcalendar/fullcalendar/releases/tag/v7.1.3)
is v7.1.3. This report establishes upstream capabilities; the local code audit determines
which remain gaps. API spelling, defaults, duration units and consumer-owned content are excluded.

## 1. Stack limits extend beyond month cells

- **What:** FullCalendar limits timed events across TimeGrid lanes and down Timeline stacks.
  It also limits TimeGrid all-day event rows. Overflow is represented geometrically and
  retains hidden-event data; the popover itself is outside this comparison.
- **Where:** [eventMaxStack](https://fullcalendar.io/docs/eventMaxStack),
  [dayMaxEventRows](https://fullcalendar.io/docs/dayMaxEventRows).
- **Why it matters:** month overflow alone does not cover these other packing surfaces.

## 2. Timeline backgrounds and business-hour fills are implemented

- **What:** resource timeline slices background events and business hours into each resource
  lane. Its background renderer positions both fill kinds on the horizontal time axis.
  The tagged example includes timed background events with and without a resource association.
- **Where:** v7.1.3
  [ResourceLane.tsx:139](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timeline/components/lane/ResourceLane.tsx#L139),
  [TimelineBg.tsx:40](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/components/TimelineBg.tsx#L40),
  [timeline-background-events.html](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/vanilla-scheduler/examples/timeline-background-events.html).
- **Why it matters:** the generic background-event documentation emphasizes TimeGrid and
  does not establish timeline coverage by itself. The renderer establishes that capability.

## 3. Built-in period coverage is broader

- **What:** DayGrid supports custom durations, including four-week grids, and a continuous
  year grid. Timeline has calendar-month and year presets as well as custom durations.
- **Where:** [DayGrid](https://fullcalendar.io/docs/daygrid-view),
  [Timeline](https://fullcalendar.io/docs/timeline-view).
- **Why it matters:** this is a built-in view-period comparison. It does not prove that a
  range-based layout engine needs new projection mathematics for those periods.

## 4. Multi-month geometry is a separate capability

- **What:** FullCalendar lays out individual months in a responsive grid or single-column
  stack. The year grid reflows according to available width; custom month counts are supported.
- **Where:** [Multi-Month Grid](https://fullcalendar.io/docs/multimonth-grid).
- **Why it matters:** one long DayGrid and multiple separately bounded month grids have
  different month, week and responsive layout boundaries.

## 5. Resource geometry includes DayGrid, groups and hierarchy

- **What:** vertical resource views support both TimeGrid and DayGrid. Timeline can insert
  resource group rows and expand or collapse nested resources. Nested data accepts either
  child arrays or parent references.
- **Where:** [Vertical Resource View](https://fullcalendar.io/docs/vertical-resource-view),
  [resourceGroupField](https://fullcalendar.io/docs/resourceGroupField),
  [Resource Parsing](https://fullcalendar.io/docs/resource-parsing),
  [resourcesInitiallyExpanded](https://fullcalendar.io/docs/resourcesInitiallyExpanded).
- **Why it matters:** flat resource columns and rows do not establish resource DayGrid,
  group-row placement or visible tree-row geometry. Resource label content remains consumer UI.

## 6. Date bounds affect content eligibility as well as navigation

- **What:** `validRange` marks dates outside the permitted range as disabled, constrains
  navigation and prevents editing into those dates. `visibleRange` can choose an exact
  rendered date envelope independently of a preset duration.
- **Where:** [validRange](https://fullcalendar.io/docs/validRange),
  [visibleRange](https://fullcalendar.io/docs/visibleRange), v7.1.3
  [DateProfileGenerator.ts](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/DateProfileGenerator.ts).
- **Why it matters:** hiding recurring weekdays and cropping daily hours do not establish
  date-bound eligibility. Navigation controls and event-editing enforcement are distinct concerns.

## 7. Extended windows exceed D41's accepted bounds

- **What:** TimeGrid starts its slot iteration at `slotMinTime` and ends at `slotMaxTime`,
  including negative starts and spans longer than 24 hours. Active input coverage expands
  for negative starts and ends beyond 24 hours. Timeline also extends its normalized range,
  but its timed-axis builder caps each successive civil window to 24 hours.
- **Where:** v7.1.3
  [time-slat-meta.ts:36](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/time-slat-meta.ts#L36),
  [DateProfileGenerator.ts:231](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/DateProfileGenerator.ts#L231),
  [timeline-date-profile.ts](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/timeline-date-profile.ts),
  [timeline-time-axis.ts](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/timeline-time-axis.ts).
- **Why it matters:** D41 already covers after-midnight overnight windows. The narrower
  remaining comparison is negative starts and windows longer than 24 nominal hours.
  Timeline's source does not establish duplicated overlapping per-anchor windows.

## 8. Slot headers and scrolling have separate upstream controls

- **What:** FullCalendar permits labels at a coarser cadence than its slots. It supplies
  initial scroll time, range-change reset behavior and programmatic scrolling to a time.
- **Where:** [slotDuration](https://fullcalendar.io/docs/slotDuration),
  [slotHeaderInterval](https://fullcalendar.io/docs/slotHeaderInterval),
  [scrollTime](https://fullcalendar.io/docs/scrollTime),
  [scrollToTime](https://fullcalendar.io/docs/scrollToTime).
- **Why it matters:** these controls are supported upstream, but their absence as named
  options does not establish missing coordinate geometry. Headless consumers can select
  labels from explicit slots and control a scroll element through DOM references.

## 9. Resource timeline virtualization is shipped in v7

- **What:** resource timeline virtualizes resource and group rows vertically, and time
  slots and header cells horizontally. Resource-free timeline is excluded. TimeGrid,
  DayGrid, vertical-resource, multi-month and list virtualization are listed as planned.
- **Where:** [Virtual Rendering](https://fullcalendar.io/docs/virtual-rendering),
  [virtualization](https://fullcalendar.io/docs/virtualization).
- **Why it matters:** viewport windowing is a real current upstream capability only within
  the documented resource timeline boundary. It is not evidence for missing virtualization
  in every other view.

## 10. DST axis policy is not an unfinished D41 feature

- **What:** FullCalendar's timed timeline enumerates real occurrences, uses distinct offset
  keys for repeated times and interpolates within actual slot instant bounds. calendar-tsx
  D40/D41 intentionally shares clock rows across occurrences and preserves exact source
  fragments separately from enclosing event geometry.
- **Where:** v7.1.3
  [timeline-time-axis.ts](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/timeline-time-axis.ts),
  local `docs/design.md:1080` and `docs/design.md:1122`.
- **Why it matters:** different accepted axis policies can yield different bars across DST.
  This comparison does not reclassify D40's fixed clock policy as a missing capability.

## Verification boundaries

Official documentation and tagged source were inspected. No upstream runtime or browser
test suite was executed. The source confirms timeline background rendering and extended
window construction, rather than inferring them from option names. Local runtime code was
not changed by this investigation.

## 11. Sub-minute slot geometry and window bounds are representable upstream

- **What:** FullCalendar's duration parser preserves seconds and milliseconds. Its
  `slotDuration`, `slotMinTime` and `slotMaxTime` options all use that parser. TimeGrid's
  slot builder advances from the exact minimum by the supplied duration until the maximum,
  without minute rounding or a slot-count cap. Thus `slotMinTime: '08:00:30'`,
  `slotMaxTime: '09:00:30'` and `slotDuration: '00:00:30'` construct 120 slots with their
  first boundary at 08:00:30. Timeline also uses durations, but rejects explicit durations
  whose slot count across the current range exceeds its default 1,000-slot limit. This
  report does not claim that a full-day 30-second Timeline axis passes that limit.
- **Where:** [Duration Object](https://fullcalendar.io/docs/duration-object), v7.1.3
  [duration.ts:34](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/headless-calendar/src/duration.ts#L34),
  [options.ts:127](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/options.ts#L127),
  [time-slat-meta.ts:36](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/time-slat-meta.ts#L36),
  [timeline-date-profile.ts:323](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/timeline/timeline-date-profile.ts#L323),
  local `packages/core/src/layout/layout-coordinates.ts:91` and
  `packages/core/src/layout/layout-coordinates.ts:407`.
- **Why it matters:** calendar-tsx rejects fractional-minute window bounds and slot steps.
  It cannot express those slot boundaries through built-in settings. This is a genuine
  representable-geometry limit, separate from expressing equivalent durations in different
  units. Event timestamps and exact source fragments retain their existing precision.
