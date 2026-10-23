# Themes findings

## `minColumnWidth` does not reach the time grid's columns

- **What:** `base.css` sizes the time grid's columns on `time-grid-root` from `--cal-min-column-width`, but
  `TimeGridView` does not emit that variable. Only `TimeGridViewBody`, a child of the root, does. Custom properties
  inherit downward, so the root always uses the `0px` fallback, and a view's `minColumnWidth` has no effect on layout.
- **Where:** `packages/themes/base.css:65` reads it; `packages/react/src/time-grid-view.tsx:38` emits the root's
  variables without it; `packages/react/src/time-grid-view.tsx:144` emits it on the body.
- **Why it matters:** `minColumnWidth` is the documented way to make week and resource grids scroll horizontally
  (C11). No test covers it, in `packages/react` or `packages/themes`.
