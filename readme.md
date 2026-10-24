# calendar-tsx

> [!WARNING]
> **Experimental.** calendar-tsx is an experiment. Its API can change or be removed in any release, without notice.

A headless, framework-agnostic calendar library. The core computes a render-ready view model — day grids for months or whole weeks with
spanning bars, time grids with overlap lanes and resource columns, lists, resource timelines — on [TanStack Store](https://tanstack.com/store)
and [Temporal](https://tc39.es/proposal-temporal/docs/). The React and Solid bindings render it as unstyled, composable
parts.

## Key ideas

- Framework-agnostic core; React and Solid bindings on top
- Controlled view and date: navigation actions only emit `onNavigate`
- Events are input; the core never owns them
- Opt-in selection, movement, resizing, touch, external drops and cross-calendar transfers
- Strict Temporal types, laid out in one `timeZone`
- Unstyled: geometry arrives as `--cal-*` custom properties and `data-*` attributes; optional themes style it
- Composable parts with a `render` prop (element or function), after Ark v6

## Packages

| Package                                   | Description                                          | Docs                                |
| ----------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| [`@calendar-tsx/react`](packages/react)   | React bindings — hooks and parts.                    | [readme](packages/react/readme.md)  |
| [`@calendar-tsx/solid`](packages/solid)   | Solid bindings — hooks and parts.                    | [readme](packages/solid/readme.md)  |
| [`@calendar-tsx/core`](packages/core)     | Framework-agnostic engine with native recurrence.    | [readme](packages/core/readme.md)   |
| [`@calendar-tsx/rrule`](packages/rrule)   | Optional recurrence powered by rrule-temporal.       | [readme](packages/rrule/readme.md)  |
| [`@calendar-tsx/themes`](packages/themes) | Stylesheets: a positioning base and a default theme. | [readme](packages/themes/readme.md) |

The design, requirements and decision log live in [docs/design.md](docs/design.md). The
[calendar assembly API](docs/calendar-assembly.md) documents feature-factory configuration and per-view
overrides. The
[core feature organization and exports](docs/core-features.md) documents feature-owned modules and the single
core entry point. The documentation site is a
[Fumadocs](https://fumadocs.dev) app on TanStack Start in [apps/docs](apps/docs), with one root per framework. Pages
in `apps/docs/content/docs` include shared text from `apps/docs/content/shared` and code from `apps/docs/examples`,
which `check:types` compiles.

Start with the interaction guides for [React](apps/docs/content/docs/react/features/interactions.mdx) or
[Solid](apps/docs/content/docs/solid/features/interactions.mdx). They cover feature registration, event proposals,
DOM bindings and draft previews, with links to scheduling policies and transfers.

## Development

See [Releases](docs/releases.md) for npm trusted publishing setup and the release PR workflow.

```bash
pnpm install
pnpm run build
pnpm run check:all
pnpm run test
pnpm --filter @calendar-tsx/docs run dev
```

The docs dev server loads core and React from their source entries, so edits hot reload without rebuilding packages. Production docs builds use the packages' generated exports.

With the docs dev server running, check that workspace rebuilds preserve the preview:

```bash
pnpm --filter @calendar-tsx/docs run test:hmr
# For a different dev-server address:
DOCS_DEV_URL=http://127.0.0.1:5173 pnpm --filter @calendar-tsx/docs run test:hmr
```
