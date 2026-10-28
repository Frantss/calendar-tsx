# @calendar-tsx/core

## 0.3.0

### Minor Changes

- e10dee3: Keep optional feature state isolated across providers and infer calendar-wide feature fields on layout models.

  Navigation triggers now require a `calendar` prop and check `view` against that instance's registered keys. Pass
  `calendar={calendar}` to day-grid, time-grid and timeline triggers.

  Locale belongs on `CalendarProvider` or `Calendar`. Move `locale` out of core and hook options; the hooks now reject
  it. `Calendar` continues to forward its locale to the provider.

- 5ebb6de: Move feature implementations, types, tests and runtime mechanics into feature-owned modules. Keep public features, helpers, types and extension maps available from `@calendar-tsx/core`.
- 5dcea5c: Use `@calendar-tsx/core` as the single public code entry point. Feature factories, helpers and types remain available from root, with their implementations organized by feature internally.

  Breaking: replace imports from `@calendar-tsx/core/background` and `@calendar-tsx/core/recurrence` with imports from `@calendar-tsx/core`.

- 4845668: Implement the D54 factory assembly API: configure features with factories, collect them with `calendarFeatures`, bind typed view overrides with `calendarViews`, and pass both results directly to the calendar or adapter hook.

  Breaking: replace feature constants with factory calls and `createCalendarViews` with `calendarViews({ features, views })`. Move feature options into factory arguments or per-view `features` overrides. Registered features now participate in every view. Object overrides shallow-merge with defaults; arrays replace them. Registration aliases preserve feature types and event-source identities. Feature definitions remain fixed after calendar creation; change per-view configuration through new view definitions.

- c5a703e: Export `DayOfWeek`, a const object with named ISO weekday values from `Monday: 1` through `Sunday: 7`. Use its members for `firstDayOfWeek`, `hiddenDays` and weekly background rules. Existing numeric values remain valid.

### Patch Changes

- 10fcb23: Organize core source into calendar, view, event, date, layout and feature modules. Move types and focused tests beside their implementations, with shared integration tests and support files in dedicated folders. Preserve the root entry, public names, declaration merging and runtime behavior.

## 0.2.0

### Minor Changes

- 3624ad6: A range whose dates are all hidden weekdays, such as a one-day view on a hidden Saturday, now shows those dates
  instead of an empty layout.
- 20fd12d: Add native daily and weekly recurrence to `@calendar-tsx/core` with Temporal dates, compatible RRule option objects, independently bounded exclusions, and stable occurrence IDs across implementations.

  Preserve inferred event-source keys in core and adapter stores when native and RRule recurrence are both used.

- a2136fc: Add optional recurrence powered by rrule-temporal with Temporal dates, string and options-object rules, exceptions, and stable occurrence metadata. Resolve feature-owned definitions before layout and retain series in the existing event stores.
- 3b0b1b8: Give each calendar role its own color in the themes: events use `--calendar-event-color` (tinted with a start stripe,
  solid for all-day and multi-day bars), today keeps the accent, and the now line, background events, weekends and hour
  lines are styled apart. Bar and timeline segments expose `isAllDay`/`isMultiDay` (`data-all-day`, `data-multi-day`),
  day cells, columns and headers expose `data-weekday`, and time-grid and timeline models expose `slotMinutes` and
  `hourOffset` (`--cal-slots-per-hour`, `--cal-hour-offset`). Events no longer follow `--calendar-accent`; set
  `--calendar-event-color` instead.
- ebec94d: `timeGridView` now lays brief timed events out at least half a slot long by default, matching `timelineView`; the
  default 30-minute slots keep the previous 15 minutes. The default theme covers the label of a time-grid event too
  short for one line instead of showing a clipped slice of text.
- 686e1a1: Add background events and background layers to timeline rows, with resource targeting and exact coverage across
  DST, overnight windows and hidden weekdays. Export timeline background parts in React and Solid, with positioning,
  existing color tokens and forced-color hatching in the themes.
- 0be3009: Add hidden ISO weekdays to built-in views and visible clock windows to time grids and timelines, including
  overnight windows. Expose navigation input coverage and proportional slot geometry while preserving the fixed
  clock-axis DST rendering policy.

## 0.0.1

### Patch Changes

- Release the current calendar engine, React and Solid bindings, and theme stylesheets.
