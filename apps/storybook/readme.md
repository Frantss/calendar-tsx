# Storybook

The smoke stories reuse the docs' compositions. The focused catalog uses a shared composition that renders
background layers, background events, availability, overflow details, and all four layouts. Fixtures use a fixed
date, time zone, locale, and clock. Clock interaction stories advance a local clock explicitly. Vite resolves
core, React, and RRule to their source entries for hot reload and tests without package builds.

Run from the repository root:

```bash
pnpm run storybook
pnpm run build:storybook
pnpm run test:storybook
```

The dev server uses port 6006. The static build is written to `apps/storybook/storybook-static`.
Tests use Storybook's Vitest addon and the workspace's Playwright Chromium browser. They run without a Storybook
server. Install the browser once with `pnpm exec playwright install --only-shell chromium` if needed.

## Catalog

The catalog has 146 stories. Every story has screenshot coverage.
Interaction stories also assert navigation, event updates, recurrence results, feature state, or accessibility.

| Group           | File                                                            | Coverage                                                                                |
| --------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Smoke           | [calendar](stories/calendar.stories.tsx)                        | Original views, dark/mobile month, navigation                                           |
| Day grid        | [day-grid](stories/views/day-grid.stories.tsx)                  | Month, week, rolling days, fixed weeks, quarter/year, spanning events, hidden weekdays  |
| Time grid       | [time-grid](stories/views/time-grid.stories.tsx)                | Day/week, workweek, all-day row, overlap modes, lane expansion, minimum sizes, clipping |
| List            | [list](stories/views/list.stories.tsx)                          | Week/month/year, empty state, multi-day events, resource grouping, ordering             |
| Timeline        | [timeline](stories/views/timeline.stories.tsx)                  | Single/resource rows, scales, stacking, brief events, clipping, horizontal scroll       |
| Resources       | [resources](stories/features/resources.stories.tsx)             | Assignment, ordering, grouping, availability                                            |
| Overflow        | [overflow](stories/features/overflow.stories.tsx)               | Counts, spanning bars, resource scope, server hints, consumer details panel             |
| Visible hours   | [visible-hours](stories/features/visible-hours.stories.tsx)     | Business/overnight windows, off-hour starts, partial slots, hidden anchors              |
| Backgrounds     | [backgrounds](stories/features/backgrounds.stories.tsx)         | Background events and layers, inverse/weekly/resource rules, per-view overrides         |
| Navigation      | [navigation](stories/features/navigation.stories.tsx)           | Actions, controlled updates, triggers, prevented navigation, input range                |
| Clock           | [clock](stories/features/clock.stories.tsx)                     | Today/now, hidden/outside time, midnight rollover                                       |
| Time zones      | [time-zones](stories/features/time-zones.stories.tsx)           | Display-zone conversion, gaps/folds, repeated lanes, timeline dates, skipped midnight   |
| Recurrence      | [recurrence](stories/features/recurrence.stories.tsx)           | Native rules, bounds/exceptions, editing, monthly/yearly RRule rules and zones          |
| Event updates   | [event-updates](stories/features/event-updates.stories.tsx)     | Store actions, filtering, ordering                                                      |
| Composition     | [composition](stories/features/composition.stories.tsx)         | Event content, render element/function, keyboard, focus, localized/custom labels        |
| Custom features | [custom-features](stories/features/custom-features.stories.tsx) | Highlight example, overrides, internal/controlled/external state, instance isolation    |
| Styling         | [themes](stories/styling/themes.stories.tsx)                    | All themes, compact density, tokens, forced colors, narrow viewport                     |

Theme galleries render the same four layouts. Processed theme CSS is scoped to the gallery and removed when it
unmounts. Shadcn and Material UI examples supply host CSS variables; they do not install those component libraries.
The forced-colors story uses Playwright media emulation in tests. In the Storybook preview, enable forced colors
through the browser's rendering tools or the operating system.

SSR hydration, invalid configuration, type contracts, and caching remain covered by the existing package tests.

## Per-story screenshots

Every story inherits `parameters.screenshot: true` from the project preview and compares its rendered canvas with a PNG baseline.
Screenshot tests run after loaders, rendering, and the story's `play` function. Omit the parameter to use the
default capture settings. Set it to `false` only when deliberately excluding a story from screenshot coverage.

For a custom viewport, target, or comparison, use an object. Check the parameter with the local
[`ScreenshotParameters`](.storybook/screenshot.ts) type:

```tsx
import type { ScreenshotParameters } from '../.storybook/screenshot';

export const Mobile = {
  parameters: {
    screenshot: {
      viewport: { width: 390, height: 844 },
      selector: '[data-part="day-grid-root"]',
      options: { comparatorOptions: { allowedMismatchedPixels: 0 } },
    },
  } satisfies ScreenshotParameters,
};

export const InteractionOnly = {
  parameters: { screenshot: false } satisfies ScreenshotParameters,
};
```

The initial viewport is 1280 × 720 and resets before every story. Capture expands its height to include the target,
so long stories remain visible inside Vitest's iframe. Selectors resolve inside the story canvas;
a missing target fails the test. `options` accepts Vitest's `ScreenshotMatcherOptions`, including screenshot
and comparator options. The setup waits for fonts and Vitest waits for a stable image before comparing.

Run or update an individual story by its test name:

```bash
pnpm --filter @calendar-tsx/storybook run test -t '^Mobile Month$'
pnpm --filter @calendar-tsx/storybook run test:update -t '^Mobile Month$'
# Update all screenshot baselines:
pnpm --filter @calendar-tsx/storybook run test:update
```

Review changed PNGs under each story directory's `__screenshots__` folder before committing them. Vitest keeps separate baselines for
each browser and operating system. CI fails on missing or changed baselines and uploads actual and diff images
from `.vitest/attachments` when a test fails. Intentional changes need updated baselines from the same platform.

## Linux baselines

CI uses the `ubuntu-24.04-arm` runner inside `mcr.microsoft.com/playwright:v1.63.0-noble`. Use that image with
`--platform linux/arm64` when updating Linux baselines from
macOS. Copy the repository into the container without `node_modules`, install with `pnpm install --frozen-lockfile`,
then run `pnpm --filter @calendar-tsx/storybook run test:update`. Copy the resulting `*-linux.png` files back into
the corresponding `__screenshots__` directories. Keep the image version aligned with the root Playwright dependency, and use the same
architecture as CI.

## References

- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
- [Storybook portable stories](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest)
- [Vitest screenshot testing](https://vitest.dev/guide/browser/visual-regression-testing)
