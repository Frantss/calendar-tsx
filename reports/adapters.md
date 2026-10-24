# Adapter findings

## Merging a feature's state type breaks the provider for calendars without that feature

- **What:** the React and Solid providers type their `value` as `AnyInstance`, whose `store` is
  `Calendar_Instance<unknown, unknown, Calendar_Views>['store']`. Its features default to the wide
  `Calendar_Features`, and `Calendar_PickFeatures` with wide features picks every entry of every feature map. So once
  any module merges a slice into `Calendar_State_FeatureMap`, the provider expects that slice, and every calendar that
  does not register the feature fails to type-check as `value` (for example, "Property 'highlighted' is missing").
- **Where:** `packages/react/src/use-calendar.tsx:16-22` and `packages/solid/src/use-calendar.tsx:16-22`
  (`AnyInstance`); `Calendar_PickFeatures` in `packages/core/src/calendar.types.ts`.
- **Why it matters:** feature types are merged program-wide, so adding one third-party feature to an app breaks
  `CalendarProvider` and `Calendar` for every other calendar in it. Found while type-checking the docs examples, which
  now compile the feature example in a separate program (`apps/docs/examples/features`). The docs' feature pages carry a
  "Known issue" note. No test covers a provider with merged feature types.

## 2026-10-24 verification status

The provider incompatibility above no longer reproduces. Plain and feature-owning calendars now satisfy provider
and convenience-root types in a program that imports a state-map declaration merge. Regression coverage is in
`packages/react/src/tests/api-contract.spec.tsx:37` and `packages/solid/src/tests/api-contract.spec.tsx:37`.
Both binding type checks and browser suites pass. The documentation no longer carries the obsolete workaround.
