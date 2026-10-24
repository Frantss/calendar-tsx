# @calendar-tsx/themes

## 0.2.0

### Minor Changes

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

### Patch Changes

- c4e7996: The time-grid base layout keeps its axis track when a grid has no columns.

## 0.0.1

### Patch Changes

- Release the current calendar engine, React and Solid bindings, and theme stylesheets.
