# Lint warnings

## Existing diagnostics observed during the day-grid consolidation

`pnpm run check:all` reports these warnings in existing code. They are diagnostics, not confirmed runtime failures.

- React ref and callback analysis: `packages/react/src/calendar-factory.tsx:68`, `:72`, `:77`, and `:121` report a nonliteral dependency list, unbound methods, and ref access during render. These affect callback and ref correctness if the diagnostics are valid.
- React test mutation analysis: `packages/react/src/tests/use-calendar.spec.tsx:36` and `:43` report mutation outside a component or hook. This affects how accurately the fixtures model React updates.
- React effect analysis: `apps/docs/src/routes/_site/docs/playground.tsx:131`, `apps/docs/src/components/calendar-preview.tsx:56`, and `apps/docs/src/routes/playground/preview.tsx:76` report synchronous state updates in effects. These can cause additional render cycles.
- Await analysis: `packages/solid/src/tests/day-grid-view.spec.tsx:176` and `packages/solid/src/tests/time-grid-view.spec.tsx:160` report awaiting non-Promise values. This matters when determining whether the tests wait for the intended work.
- Template interpolation analysis: `packages/core/src/layout/layout-time-grid.ts:63`, `packages/core/src/tests/calendar-navigation.spec.ts:17` (two interpolations), and `packages/core/src/tests/calendar.spec.ts:71` report restricted template expressions. This affects the assumptions behind implicit string conversion of Temporal values.

## Interaction rebase verification — 2026-10-24

- Template interpolation analysis also reports `packages/core/src/tests/calendar-layout-interactions.spec.ts:425`
  and `:430`. The surface-key fixtures interpolate Temporal dates implicitly. This is a lint diagnostic about string
  conversion, not a failing geometry assertion; both layouts pass their browser tests.

## Core simplification verification, 2026-10-24

The full check still reports diagnostics in unchanged code. Current module locations include
`packages/react/src/rendering/factory.tsx:68` (callback dependencies), `:72` and `:77` (unbound methods), and `:106`
(render-time refs); `packages/react/src/calendar/tests/calendar.spec.tsx:39` and `:46` (fixture mutation);
`apps/docs/src/components/calendar-preview.tsx:67`, `apps/docs/src/routes/_site/docs/playground.tsx:151` and
`apps/docs/src/routes/playground/preview.tsx:92` (effect state updates). Solid await diagnostics occur at
`packages/solid/src/views/day-grid/tests/day-grid-view.spec.tsx:225` and
`packages/solid/src/views/time-grid/tests/time-grid-view.spec.tsx:180`, `:201` and `:216`.
Core template-interpolation diagnostics occur at `packages/core/src/calendar/tests/calendar.spec.ts:71`,
`packages/core/src/calendar/tests/navigation.spec.ts:18` and
`packages/core/src/tests/integration/layout-interactions.spec.ts:432` and `:437`.
These diagnostics concern callback/ref lifetimes, state update timing and fixture assumptions. They do not fail
the current lint command; all 669 package tests and 146 Storybook cases pass.
