# API shape vs. TanStack Table: incremental functionality

TanStack Table sources: tag `v8.21.3` (f4dc742b) and `main` @ c14e0221 (table-core `9.3.1`, now `latest` on npm; v9 is
out of alpha). Paths under `packages/table-core/src`. calendar-tsx at 723a6ec.

## How TanStack Table adds functionality

- **Unit of extension is a feature object** (`types/TableFeatures.ts`): optional hooks for initial state, default
  options, default column def, table APIs, shared row/column/cell prototypes, and per-instance data.
- **v8:** 15 built-ins always bundled, in a fixed array whose order encodes dependencies; custom features append via
  `_features: [...]`; types extended by global declaration merging, so every API is visible on every table.
- **v9:** consumer passes `features: tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(),
sortFns: {...} })`. Only the six core features are implicit. Object-key order is registration order. Types come from
  feature maps (`Table_FeatureMap` etc.) filtered by `keyof TFeatures`, so an API exists in the type only when its
  feature is registered. Missing prerequisites are template-literal type errors. Features talk through optional stubs
  (`table.autoResetPageIndex?.()`) rather than imports, which preserves tree-shaking.
- **Processing pipeline:** row models are a fixed chain (core → filtered → grouped → sorted → expanded → paginated). A
  stage is opted into by supplying its factory; an absent stage or `manualX` passes the previous one through. Each stage
  is memoised on its state slice plus the previous stage.
- **State:** each feature contributes a slice; per slice it is uncontrolled (`initialState`), controlled
  (`state.x` + `onXChange`), or, in v9, an external atom (`options.atoms.x`). v9 keeps one atom per slice and a derived
  `table.store`.
- **Adapter (v9):** reactivity is injected as a feature slot; `useTable(options, selector)` syncs options during
  render, exposes `table.state` via `useSelector`, plus `table.Subscribe` for scoped subscriptions.
- **Stated rationale for v9:** bundle size ("all features were bundled" in v8) and feature-gated types.

## How calendar-tsx compares

### Finding 1 — Our closest analogue to `features` is the `views` record, and it already types like v9

`views: { week: calendarView_timeGrid({ days: 7 }), … }` (`packages/core/src/calendar.types.ts:85`) is a
consumer-declared object whose keys become typed literals (`view: keyof TViews & string`, typed triggers per D22) —
the same mechanism v9 uses for `sortFns`/`filterFns` keys. Matters because it shows the generic plumbing for a
feature map already exists in one place.

### Finding 2 — View kinds are a closed set dispatched inside the core

`calendar_create` statically imports all three builders (`packages/core/src/calendar.ts:17-19`) and picks one with a
ternary on `definition.kind` (`packages/core/src/calendar.ts:79-96`). `Calendar_ViewDefinition` and `Calendar_Layout`
are closed unions (`packages/core/src/calendar.types.ts:59`, `:173`). This is v8's shape: every layout is bundled even
when a consumer registers only `list`, and a new kind (the timeline D4 names as its revisit trigger) means editing the
core. D1 calls `layout` an open union for consumers, but there is no way for anyone other than the core to add a
member. Also `layout` is not narrowed by `TViews`: a calendar with only list views still types `layout` as all three.

### Finding 3 — The processing pipeline is fixed with one hook; TanStack's is fixed with opt-in stages

Derivation is normalise → clip to range → sort (`eventOrder`) → layout (`packages/core/src/calendar.ts:73-77`). Filtering
is pushed to the consumer (D16) where TanStack offers a filtered stage. This is deliberate and consistent with D2
(events are input). There is no per-stage memoisation: any tracked input change re-runs the whole chain, whereas
TanStack memoises each stage on its own deps. Matters only at scale (large `events` with frequent `now` ticks
re-normalise and re-sort everything every minute; `now` is in `persisted`, `calendar.ts:124-129`).

### Finding 4 — State ownership is the opposite end of TanStack's spectrum, by design

TanStack features own internal state that may be controlled. Our core owns no state: `view`/`date` are controlled only
(D5) and events are input (D2). TanStack's three ownership modes collapse to one here. The opt-in event store
(`packages/core/src/calendar-event-store.ts`) is the analogue of v9's external atom (`options.atoms.x`): an external
store whose value feeds an input. Any future stateful feature (D15's `focusedDate`, selection, drag) would need the
uncontrolled/controlled choice TanStack has, and D5's reasoning would have to be revisited per slice.

### Finding 5 — The adapter boundary already matches v9 closely

Create once in `useState`, push options every render, read through `useSelector` (`packages/react/src/use-calendar.tsx:18-28`;
D24, after oxform). Differences: we sync options in a layout effect, v9 during render; v9 injects reactivity into the
core, we hand the adapter a `ReadonlyStore`; v9 offers a `Subscribe` component, we only have `useCalendarSelector`.
None blocks extension.

### Finding 6 — The view model is plain data; TanStack's rows/cells carry methods

TanStack features attach APIs to row/cell prototypes (`row.getIsSelected()`). Our models (`Calendar_MonthDay`,
`Calendar_TimeGridSegment`, …) are plain objects and actions live on `calendar.api` and the parts (D22). A feature
adding per-day or per-event behaviour here would add fields to model types and new parts, not methods. Plain data is
simpler and serialisable; the cost is that a feature cannot add to a model type without editing it.

## Options for incremental functionality

1. **Status quo.** Three kinds, no stateful features in scope (`docs/design.md`: drag, selection, recurrence,
   timeline are out). Zero cost; Findings 2 and 4 stay latent until scope grows.
2. **View kinds carry their own builder (v9-lite, scoped to layouts).** `calendarView_month(...)` returns
   `{ kind, build }`; `calendar_create` calls `definition.build(input)`; `layout` becomes the union of the registered
   views' outputs inferred from `TViews`. Gains tree-shaking, third-party kinds (timeline) and layout narrowing, without
   a feature registry. Touches D1, D4, D10 and the React view roots' types. Recommended if any of those gains is wanted.
3. **Full feature map.** `features: { navigation, focus, selection, … }` each contributing state slices, options, API
   and model fields, typed through feature maps as in v9. Only justified once a stateful feature enters scope; it
   reopens D5 and is the largest change. Rejected for now.

Considered and rejected: a configurable stage pipeline (user-inserted stages between normalise and layout) — D16
already routes filtering to the input, and `eventOrder` covers the one in-core hook the app needs.
