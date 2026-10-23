# Timeline coverage in the themes built on default.css

Found while adding the timeline look to `packages/themes/default.css` (D33). Themes that import `default.css` inherit
the timeline look; these two override event or header rules by listing part names, and the lists predate the timeline.

## Finding 1 — `high-contrast.css` does not outline timeline events

- **What:** the outlined-event rule (2px text-coloured border, surface fill, weight 600) and the dashed continuation
  edges list `month-week-event`, `time-grid-all-day-event` and `time-grid-event` only.
- **Where:** `packages/themes/high-contrast.css:25-35` (outline), `:42-58` (dashed edges), `:38-40` (bar line height).
- **Why it matters:** under the high-contrast theme, timeline events keep the default accent tint with a 1px border,
  which the theme exists to replace (WCAG AAA outlines), and events continuing past the range get no dashed edge.

## Finding 2 — `revenuecat.css` keeps the brand red on today's timeline day header

- **What:** the rule that swaps today's header text from the brand red to the text colour in light mode targets
  `time-grid-column-header[data-today]` only.
- **Where:** `packages/themes/revenuecat.css:25-28`.
- **Why it matters:** `default.css` writes today's `timeline-day-header` in the accent, so with this theme the
  timeline shows small brand-red text on white, the contrast case the rule's own comment calls too light.

## Resolution

Both findings were fixed at the user's request, in the same change as the timeline:

- `high-contrast.css` adds `timeline-event` to the outline, bar line-height and dashed-edge rules. Covered by the
  timeline cases in `packages/themes/src/tests/high-contrast-theme.spec.tsx`.
- `revenuecat.css` applies the today-header contrast rule to `timeline-day-header[data-today]` too. Covered by the
  timeline case in `packages/themes/src/tests/revenuecat-theme.spec.tsx`.
