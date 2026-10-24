# Playground interaction verification

## 2026-10-24

The playground uses the production feature registry, DOM drivers, layout projection,
and React bindings. Operations are disabled by default and independently enabled in
the Interactions section. Edited events and feature settings are encoded in shared
URLs; resetting edits restores the original inputs.

### Browser checks

- PASS: resizing with selection and movement disabled; pointer end resize and keyboard
  start/end changes; invalid ranges report a rejection.
- PASS: time-grid selection, timeline movement, and day-grid selection display projected
  drafts and commit through the production APIs.
- PASS: timed-to-all-day conversion produces one inclusive date by default; the all-day
  hit surface starts after the time-axis gutter.
- PASS: native external dragging creates an event; keyboard creation and cross-calendar
  dragging persist the result. Transferred events appear only in the destination.
- PASS: overlap, business-hours, and room-availability controls reject incompatible edits.
- PASS: a 550 ms touch hold followed by a drag moves an event. Dragging near the scroll
  edge advances scroll position. Escape removes the draft without changing events.
- PASS: reloading restores edited times; iframe edits update the parent URL; Reset calendar
  edits clears overrides and disables the reset button.

### UI delivery checks

- PASS, layout: inspected at 1440 px and 390 px. The mobile document has equal scroll and
  client widths, 390 px. Calendar scrolling remains inside the preview.
- PASS, themes and feedback: light and dark previews retain readable controls; accepted
  drafts have a dashed outline; rejection text identifies the failed constraint.
- PASS, keyboard: native buttons and labeled inputs expose selection, movement, both resize
  edges, creation, and transfers. Enter activates resize controls; Escape cancels dragging.
- PASS, visual direction: retained the existing compact documentation UI and system fonts.
  ENERGY 1 / RHYTHM 1 / MOTION 1. The calendar remains the focal point; the existing accent
  marks drafts and focus. No decorative animation or visual assets were added.

### Existing finding outside this change

- `apps/docs/src/routes/_site/docs/playground.tsx:142` derives time-zone options solely
  from `Intl.supportedValuesOf('timeZone')`. In the tested Chromium, this omits `UTC`.
  A shared link with `tz=UTC` runs the calendar in UTC while the select displays its
  first option, “Yours”. This makes the displayed configuration disagree with the active
  calendar zone.
