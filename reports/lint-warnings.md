# Lint warnings

## Existing diagnostics observed during the day-grid consolidation

`pnpm run check:all` reports these warnings in existing code. They are diagnostics, not confirmed runtime failures.

- React ref and callback analysis: `packages/react/src/calendar-factory.tsx:68`, `:72`, `:77`, and `:121` report a nonliteral dependency list, unbound methods, and ref access during render. These affect callback and ref correctness if the diagnostics are valid.
- React test mutation analysis: `packages/react/src/tests/use-calendar.spec.tsx:36` and `:43` report mutation outside a component or hook. This affects how accurately the fixtures model React updates.
- React effect analysis: `apps/docs/src/routes/_site/docs/playground.tsx:131`, `apps/docs/src/components/calendar-preview.tsx:56`, and `apps/docs/src/routes/playground/preview.tsx:76` report synchronous state updates in effects. These can cause additional render cycles.
- Await analysis: `packages/solid/src/tests/day-grid-view.spec.tsx:176` and `packages/solid/src/tests/time-grid-view.spec.tsx:160` report awaiting non-Promise values. This matters when determining whether the tests wait for the intended work.
- Template interpolation analysis: `packages/core/src/layout/layout-time-grid.ts:63`, `packages/core/src/tests/calendar-navigation.spec.ts:17` (two interpolations), and `packages/core/src/tests/calendar.spec.ts:71` report restricted template expressions. This affects the assumptions behind implicit string conversion of Temporal values.
