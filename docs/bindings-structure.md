# React and Solid package structure

React and Solid use matching folders. Each package owns its framework implementation and exposes its existing API through `export/index.ts`.

```text
packages/{react,solid}/
  export/index.ts
  src/
    calendar/
      calendar.tsx
      calendar.types.ts
      tests/calendar.spec.tsx
    interactions/
      use-calendar-interactions.ts
      tests/interactions.spec.tsx
    events/
      use-calendar-event-store.ts
    rendering/
      factory.tsx
      rendering.types.ts
      tests/factory.spec.tsx
    views/
      day-grid/
        day-grid-view.tsx
        day-grid-view.types.ts
        tests/day-grid-view.spec.tsx
      time-grid/
        time-grid-view.tsx
        time-grid-view.types.ts
        tests/time-grid-view.spec.tsx
      list/
        list-view.tsx
        list-view.types.ts
        tests/list-view.spec.tsx
      timeline/
        timeline-view.tsx
        timeline-view.types.ts
        tests/timeline-view.spec.tsx
      shared/parts.ts
    tests/
      integration/
        api-contract.spec.tsx
        backgrounds.spec.tsx
        recurrence.spec.tsx
        rrule.spec.tsx
        ssr/
          ssr.spec.tsx
          app.tsx       # Solid only
          server.tsx    # Solid only
      support/
        calendar.setup.tsx
        calendar.fixtures.ts
        iife.ts
        with-default.ts
        render.ts       # Solid only
```

`calendar/` owns calendar creation, lifecycle, context, selectors, providers and the `Calendar` wrapper. Its erased instance contract lives in `calendar.types.ts`. `events/` owns the managed event-store hook.

`interactions/` owns the framework hook for DOM host lifecycle, callback refs and transient state subscriptions. Its browser tests exercise the shared core host through each framework.

`rendering/` owns the element factory, prop merging and ref composition. Public rendering contracts live in `rendering.types.ts`. React keeps its element-cloning and forwarded-ref behavior; Solid keeps its accessor-based render function and prop merging.

Each view owns its parts, prop contracts and focused tests. `views/shared/parts.ts` holds shared geometry attributes, CSS variables, labels and navigation-trigger contracts. Parts stay together in one implementation file per view.

Tests that cross module boundaries live in `tests/integration/`. Background, recurrence and RRule tests exercise features supplied by core or the RRule package. Reusable setup and fixtures live in `tests/support/`. Solid's SSR loader targets `tests/integration/ssr/server.tsx`.

Import public bindings from `@calendar-tsx/react` or `@calendar-tsx/solid`. Internal `#calendar/…`, `#rendering/…` and `#views/…` aliases follow source ownership; they are private to each package. There are no directory barrels or public module subpaths. The React build retains its `'use client'` banner, and Solid retains its server-rendering and hydration pipeline.

See [D57](./design.md#d57--react-and-solid-mirror-module-ownership) for the decision and [the core structure](./core-features.md) for core ownership.
