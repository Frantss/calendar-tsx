# Themes findings

## `minColumnWidth` does not reach the time grid's columns

- **What:** `base.css` sizes the time grid's columns on `time-grid-root` from `--cal-min-column-width`, but
  `TimeGridView` does not emit that variable. Only `TimeGridViewBody`, a child of the root, does. Custom properties
  inherit downward, so the root always uses the `0px` fallback, and a view's `minColumnWidth` has no effect on layout.
- **Where:** `packages/themes/base.css:65` reads it; `packages/react/src/time-grid-view.tsx:38` emits the root's
  variables without it; `packages/react/src/time-grid-view.tsx:144` emits it on the body.
- **Why it matters:** `minColumnWidth` is the documented way to make week and resource grids scroll horizontally
  (C11). No test covers it, in `packages/react` or `packages/themes`.

## High-contrast borders fall below the stated 5:1 on muted surfaces

- **What:** `high-contrast.css` and the themes readme state that every boundary is 5:1 or more. In light mode the
  border (`#6b6b6b`) is 5.33:1 against the surface but 4.47:1 against the muted surface (`#ebebeb`), which outside-month
  days use as their background. Dark mode stays above 5:1 (6.92:1 and 5.12:1).
- **Where:** `packages/themes/high-contrast.css:14` (surface-muted) and `:17` (border); the claim is at
  `packages/themes/high-contrast.css:2-3` and `packages/themes/readme.md:85`; outside-month days take the muted
  surface at `packages/themes/default.css:143-146`.
- **Why it matters:** the claim describes the theme's purpose, and the docs site now quotes measured values instead.
  The two sources also disagree on the text threshold: the CSS comment says 7:1 or more, the readme 9:1 or more. The
  measured minimum is 9.11:1, so both hold, but the stated threshold differs.

## `base.css` falls back to a shorter day header than the default theme

- **What:** the default theme raised `--calendar-day-header-height` to `2.25rem` (and compact to `1.75rem`) to leave a
  gap above the first bar, but `base.css` still falls back to `2rem` when no theme sets the token.
- **Where:** `packages/themes/base.css:30` and `:51`; `packages/themes/default.css` sets `2.25rem`.
- **Why it matters:** `base.css` is described as falling back to the theme's defaults, so a custom theme on `base.css`
  alone lays out month weeks with the older, tighter header. It may be intentional, since the gap exists for the default
  theme's day-number circle; nothing records either way.
