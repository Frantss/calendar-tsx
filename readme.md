# calendar-tsx

> [!WARNING]
> **Experimental.** calendar-tsx is an experiment. Its API can change or be removed in any release, without notice.

A headless, framework-agnostic calendar library. The core computes a render-ready view model — month grids with
spanning bars, time grids with overlap lanes and resource columns, lists — on [TanStack Store](https://tanstack.com/store)
and [Temporal](https://tc39.es/proposal-temporal/docs/). The React bindings render it as unstyled, composable parts.

## Key ideas

- Framework-agnostic core; React bindings on top
- Controlled view and date: navigation actions only emit `onNavigate`
- Events are input; the core never owns them
- Strict Temporal types, laid out in one `timeZone`
- Unstyled: geometry arrives as `--cal-*` custom properties and `data-*` attributes; optional themes style it
- Composable parts with a `render` prop (element or function), after Ark v6

## Packages

| Package                                   | Description                                          | Docs                                |
| ----------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| [`@calendar-tsx/react`](packages/react)   | React bindings — hooks and parts.                    | [readme](packages/react/readme.md)  |
| [`@calendar-tsx/core`](packages/core)     | Framework-agnostic calendar engine.                  | [readme](packages/core/readme.md)   |
| [`@calendar-tsx/themes`](packages/themes) | Stylesheets: a positioning base and a default theme. | [readme](packages/themes/readme.md) |

The design, requirements and decision log live in [docs/design.md](docs/design.md).

## Development

```bash
pnpm install
pnpm run build
pnpm run check:all
pnpm run test
```
