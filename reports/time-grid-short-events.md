# Time-grid short events

## A brief event collapses to a sliver with long slots

- **What:** the time grid's minimum display length is a fixed 15 minutes, whatever the slot length. With 1-hour slots
  and `compact.css` (`--calendar-slot-height: 2rem`), a 15-minute event is 8px tall before `--calendar-event-gap`
  (4px), so it renders 4px tall and its label is clipped. Regular density gives 12px less the gap, 8px, still below
  the 14.3px line of a short event's content.
- **Where:** `packages/core/src/layout/layout-time-grid.ts:39` (`DEFAULT_MIN_EVENT_MINUTES = 15`) and `:246`; the
  timeline instead defaults to half a slot at `packages/core/src/layout/layout-timeline.ts:235` (D49). The gap comes
  from `packages/themes/base.css` (time-grid event block size). Reproduced in the playground with
  `view=rooms_workweek&density=compact&slot=60`.
- **Why it matters:** D39 promises brief events stay readable; with slots longer than 30 minutes the fixed floor no
  longer covers one line of text, and the time grid and timeline now disagree on how the floor scales.

## Resolution

Fixed at the user's request: `timeGridView` now defaults `minEventMinutes` to half of `slotMinutes`, as the timeline
does (D39 revised, D49), and `default.css` covers the content of a time-grid event whose content box is shorter than
one em. Covered by `packages/core/src/tests/layout-time-grid.spec.ts` and
`packages/themes/src/tests/default-theme.spec.tsx`.
