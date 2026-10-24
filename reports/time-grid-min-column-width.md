# Time-grid minimum column width

## Source inspection during coordinate integration: 2026-10-23

- **What:** the React and Solid body parts emit the model's `--cal-min-column-width`, while the parent root's
  column template reads that custom property. The root parts do not emit it, and custom properties inherit from
  ancestors to descendants rather than from the body to its parent.
- **Where:** `packages/react/src/time-grid-view.tsx:41`; `packages/react/src/time-grid-view.tsx:179`;
  `packages/solid/src/time-grid-view.tsx`; `packages/themes/base.css:84`.
- **Why it matters:** the view's `minColumnWidth` does not establish the root track minimum through the emitted
  model geometry alone. Consumers setting the custom property on an ancestor can produce different sizing.

## Browser verification: 2026-10-23

A temporary Chromium probe rendered a seven-day time grid in a 700px container using `base.css` and
`minColumnWidth: '480px'`. The body emitted the configured value, while the root did not. A rendered day column
measured less than 480px. Setting the root custom property as an experimental control made the same column at
least 480px wide. Both assertions passed; this is a rendered sizing defect, not only a missing API.

The probe used `packages/themes`' existing browser runner and `themesSetup_render`. Its temporary spec was removed
after execution. No production files were changed by the verification. FullCalendar's documented
[dayMinWidth](https://fullcalendar.io/docs/dayMinWidth) establishes minimum-width horizontal scrolling as an
upstream capability in TimeGrid, DayGrid and vertical resource views.

## Regression verification: 2026-10-23

- **What:** React and Solid now emit `--cal-min-column-width` on the time-grid root. In Chromium, all seven
  columns honor a configured 480px minimum in the 700px theme harness. Headers and the spanning all-day bar
  align with those columns, and the root scrolls horizontally.
- **Where:** `packages/react/src/time-grid-view.tsx:46`; `packages/solid/src/time-grid-view.tsx:47`;
  `packages/themes/src/tests/default-theme.spec.tsx:134`; `packages/react/src/tests/time-grid-view.spec.tsx:104`;
  `packages/solid/src/tests/time-grid-view.spec.tsx:97`.
- **Why it matters:** the public setting now reaches the shared track template, including its header and all-day
  subgrids. Body descendants inherit the same custom property from the root.

The permanent rendered-width regression failed before the correction: `expected 90.5625 to be greater than or
equal to 480`. Both adapter regressions failed because the root custom property was empty. After the correction,
the default-theme suite and both time-grid adapter suites pass: **46 tests**.

Required workspace verification also passed:

- `pnpm run build`, including documentation prerendering.
- `pnpm run check:all`, with the npm cache directed to `/private/tmp/calendar-coordinate-npm-cache`.
- `pnpm run test`: **328 tests passed** (core 168, React 46, Solid 48, themes 66).
- Formatting and `git diff --check` passed. Existing build and lint warnings remain outside this correction.
