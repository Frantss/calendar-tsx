# Playground geometry controls

## Verification: 2026-10-23

- **What:** playground links and controls retain minimum column widths in pixels, hidden ISO weekdays and visible
  clock hours. End times at or before the start belong to the next day; equal times represent 24 hours. At least
  one weekday stays visible. Month and agenda views receive hidden weekdays; time grids also receive width and
  clock-window settings.
- **Where:** `apps/docs/src/playground/config.ts:185`; `apps/docs/src/playground/views.ts:32`;
  `apps/docs/src/routes/_site/docs/playground.tsx:319`; `apps/docs/src/routes/playground/preview.tsx:217`.
- **Why it matters:** the playground can exercise the shared coordinate model and minimum-width sizing through its
  controls and copied links. Custom clock windows open at their starting hour rather than the full-day sample
  scroll position.

## Automated evidence

`apps/docs/src/playground/config.spec.ts` covers shared-link round trips, malformed link values, duplicate and
all-hidden weekday lists, 22:00–06:00 overnight windows, 08:00–17:00 daytime windows and 08:00–08:00 full-day windows.
The five cases failed before implementation and pass afterward. They are included in the root test command through
the docs package's test script, using the existing Vite+ browser configuration.

## Browser evidence

The local playground was exercised with the in-app browser's native controls and Playwright inspection APIs. The
optional Playwright CLI was not cached (`ENOTCACHED`); no installation was needed for these browser checks.

- A configured 480px minimum produced five 480px weekday columns, a 2464px scroll width and a 1246px client width
  in the standalone preview. The overnight axis showed hourly labels from 22:00 through 05:00 across 16 half-hour
  slots, and its initial vertical scroll was 0.
- The live iframe retained five weekday columns and 16 half-hour slots for 22:00–06:00. Equal 08:00 start/end values
  produced 48 half-hour slots. Native next-week navigation retained the width, hidden-day and clock-window settings.
- Reloading restored the controls from the URL. Reset restored 0px, all weekdays visible and 00:00–00:00.
- Month showed five weekday cells per row. Rooms retained the same width/window settings across its three resources.
- All weekday checkboxes were exercised. With six hidden days, the remaining weekday checkbox was disabled.
- At a 390px viewport, the document width was 390px and all new inputs ended at x=361px. Tab from the width field
  moved to the start-time field with a solid focus outline. Desktop controls were checked in light and dark themes.
- No browser errors were recorded during the checks.

## UI delivery checks

- **PASS, layout and direction:** retained the existing compact settings layout, native inputs and theme tokens.
  Energy 1, rhythm 1, motion 1. The calendar preview remains the focal point; no decorative UI was added.
- **PASS, functional controls:** width, both time fields, each weekday checkbox, last-visible-day protection, reset,
  reload and navigation were exercised against the rendered preview.
- **PASS, responsive and keyboard behavior:** measured the 390px document without outer overflow; native inputs
  retained labels and visible focus. Hidden weekdays use a labelled group with its help text attached.
- **PASS, copy and scope:** control hints state units, overnight ownership and 24-hour behavior. Existing loading,
  empty and preview-failure states remain available. No assets or product claims were added.

## Required workspace checks

- **PASS:** `pnpm run build`, including docs prerendering.
- **PASS:** `pnpm run check:all`, with npm cache at `/private/tmp/calendar-coordinate-npm-cache`. Existing lint and
  build warnings remain; no new warnings were reported for the added controls or tests.
- **PASS:** `pnpm run test`: 333 tests (core 168, React 46, Solid 48, themes 66, docs 5).
- **PASS:** changed-file formatting and `git diff --check`.

Command output is retained at `/private/tmp/calendar-playground-build.log`, `/private/tmp/calendar-playground-check.log`
and `/private/tmp/calendar-playground-tests.log`. Browser viewport overrides were reset after mobile verification.
