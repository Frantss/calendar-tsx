# Storybook

React calendar stories with per-story screenshot tests. Fixtures use a fixed date, time zone, locale and clock;
core, React and RRule resolve to their source entries.

[Timeline stories](stories/views/timeline.stories.tsx) cover nested rows, independent parent expansion and initially
collapsed resources.

```bash
pnpm run storybook        # dev server on port 6006
pnpm run build:storybook  # writes apps/storybook/storybook-static
pnpm run test:storybook   # Vitest + Playwright Chromium, no server needed
```

Install the browser once with `pnpm exec playwright install --only-shell chromium`.

## Screenshots

Every story inherits `parameters.screenshot: true` and compares its canvas with a PNG baseline after `play`. Pass an
object typed with [`ScreenshotParameters`](.storybook/screenshot.ts) for a custom `viewport`, `selector` or
comparator `options`, or `false` to exclude a story. The default viewport is 1280 × 720.

```bash
pnpm --filter @calendar-tsx/storybook run test -t '^Mobile Month$'
pnpm --filter @calendar-tsx/storybook run test:update -t '^Mobile Month$'
pnpm --filter @calendar-tsx/storybook run test:update
```

Baselines live in each story directory's `__screenshots__`, one per browser and OS. CI runs on `ubuntu-24.04-arm` in
`mcr.microsoft.com/playwright:v1.63.0-noble`; to update Linux baselines from macOS, run `test:update` in that image
with `--platform linux/arm64` (fresh `pnpm install --frozen-lockfile`, no host `node_modules`) and copy back the
`*-linux.png` files. Keep the image version aligned with the root Playwright dependency.
