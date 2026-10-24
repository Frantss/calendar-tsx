# calendar-tsx

> [!WARNING]
> **Experimental.** The API can change or be removed in any release, without notice.

A headless, framework-agnostic calendar library on [TanStack Store](https://tanstack.com/store) and
[Temporal](https://tc39.es/proposal-temporal/docs/). The core computes a render-ready view model for day grids, time
grids, lists and resource timelines; the React and Solid bindings render it as unstyled, composable parts.

| Package                                   | Description                                         |
| ----------------------------------------- | --------------------------------------------------- |
| [`@calendar-tsx/core`](packages/core)     | Framework-agnostic engine with native recurrence    |
| [`@calendar-tsx/react`](packages/react)   | React bindings                                      |
| [`@calendar-tsx/solid`](packages/solid)   | Solid bindings                                      |
| [`@calendar-tsx/rrule`](packages/rrule)   | Optional recurrence powered by rrule-temporal       |
| [`@calendar-tsx/themes`](packages/themes) | Stylesheets: a positioning base and optional themes |

## Documentation

- [Documentation site](apps/docs): usage, one root per framework (`pnpm --filter @calendar-tsx/docs run dev`).
- [Design spec](docs/design.md): requirements and the decision log (`D1`…).
- [Releases](docs/releases.md): changesets and the release workflow.
- [Storybook](apps/storybook/readme.md): example catalog and screenshot tests.

## Development

```bash
pnpm install
pnpm run build
pnpm run check:all
pnpm run test
```
