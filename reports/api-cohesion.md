# Public API cohesion

## 2026-10-24 audit

Reviewed commit `20fd12d`: package entries, public types, core orchestration, React/Solid bindings, recurrence,
theme contracts, examples and design decisions. This is an interface audit, including configuration ownership,
update rules and type guarantees. No implementation changes are included.

The core is cohesive. Most friction sits where feature registration and typed instances cross into framework
bindings. Four contract gaps stand out, including one previously recorded provider issue. The remaining costs
below are documented design choices, distinguished from contract gaps.

### What holds together

- **Package responsibilities:** core derives navigation and render models; React/Solid adapt lifecycle and render
  parts; themes position and style those parts. The seams keep date arithmetic out of the bindings and styling out
  of core. See `packages/core/src/calendar.ts:183`, `packages/react/src/use-calendar.tsx:32`,
  `packages/solid/src/use-calendar.tsx:31` and `packages/themes/readme.md:1`.
- **Four layout families:** duration, visibility and resource grouping configure existing layouts. Distinct models
  reflect distinct geometry. D34, D43, D44 and D47 explain why a generic renderer or more factories would increase
  what callers must learn. See `packages/core/src/calendar.types.ts:179` and
  `packages/core/src/calendar-views.ts:54`.
- **Event ownership:** concrete events and feature-owned definitions share one input and store. Resolution precedes
  normalization, background splitting and layout. Native and RRule recurrence reuse existing bindings and preserve
  matching occurrence identities. See `packages/core/src/calendar.types.ts:46`,
  `packages/core/src/calendar.ts:192`, `packages/core/src/calendar-event-store.ts:30` and
  `packages/core/recurrence.md:125`.
- **Naming and shading:** function/constant/part names generally follow D30. Availability, background layers and
  background events have distinct ownership and payload needs, documented in D33/D37. Their coexistence alone is
  not evidence of weak cohesion. See `packages/core/export/index.ts:1` and `docs/design.md:1008`.

### 1. High: optional feature state leaks into unrelated providers, previously recorded

- **What:** `AnyInstance.store` uses the default wide feature type. `Calendar_PickFeatures` therefore requires every
  merged state contribution. Importing a stateful feature can make a calendar without that feature incompatible
  with `CalendarProvider`.
- **Where:** `packages/react/src/use-calendar.tsx:16`, `packages/solid/src/use-calendar.tsx:16` and
  `packages/core/src/calendar.types.ts:130`. The existing finding is in [adapters.md](adapters.md).
- **Why it matters:** an optional module changes the interface required by unrelated calendar instances in the same
  TypeScript program. Feature registration ceases to contain its own type effects.
- **Evidence:** current source retains the reported types. The shared feature documentation still identifies this
  as a known issue at `apps/docs/content/shared/extending/features.mdx:93`. This audit did not rerun its original
  declaration-merging reproduction.

### 2. Medium: feature activation and model typing use different scopes

- **What:** a feature registered only on the calendar runs in every view, but layout types select fields solely
  from each view's `~features`. Registering `backgroundFeature` calendar-wide produces `column.backgrounds` at
  runtime while its inferred column type has no such property.
- **Where:** `packages/core/src/calendar.ts:81`, `packages/core/src/calendar.types.ts:649` and
  `packages/core/src/calendar-backgrounds.ts:216`.
- **Why it matters:** registration enables behavior without exposing its output through the typed interface.
  Activation also depends on other views: adding a second view that declares `backgroundFeature` stops that feature
  running in the original, unchanged view. A caller must inspect the whole view registry to determine local behavior.
- **Evidence:** a source runtime probe produced a full-column inverse background with calendar-only registration.
  Adding a second view declaring the feature removed `backgrounds` from the original view. A TypeScript 7.0.2
  assertion confirmed that the first calendar's inferred column type excludes `backgrounds`. D29 documents the
  activation rule and view-only model typing separately; their mismatch remains observable.

### 3. Medium: registered view keys lose their guarantee in navigation parts

- **What:** core navigation restricts targets to registered view keys. All three trigger families in both bindings
  accept `view: string`, and context navigation is widened to `Calendar_Views`.
- **Where:** `packages/core/src/calendar.types.ts:665`, `packages/react/src/day-grid-view.tsx:179`,
  `packages/react/src/time-grid-view.tsx:89`, `packages/react/src/timeline-view.tsx:82`,
  `packages/solid/src/day-grid-view.tsx:179`, `packages/solid/src/time-grid-view.tsx:86` and
  `packages/solid/src/timeline-view.tsx:83`.
- **Why it matters:** a view rename is checked for `calendar.api.setView(...)` but can leave a trigger that throws
  only when clicked. D22 explicitly promises typed trigger targets and compile-time failures for renamed views.
- **Evidence:** TypeScript assertions confirmed a one-view instance accepts only `'day'` in `api.setView`, while
  `TimelineViewDayTrigger` accepts any string. Source inspection confirms the same prop shape in both bindings.
  Invoking the shared navigation path with an unknown target threw `[calendar] unknown view "missing"`.

### 4. Medium: locale has two configuration owners with different composition behavior

- **What:** `Calendar_Options` accepts `locale`, but the core does not use it. `Calendar` forwards that option into
  its provider. `useCalendar(options)` followed by `<CalendarProvider value={calendar}>` instead uses the provider's
  independent `'en-US'` default, even when `options.locale` is set.
- **Where:** `packages/core/src/calendar.types.ts:619`, `packages/react/src/use-calendar.tsx:70`,
  `packages/react/src/use-calendar.tsx:101`, `packages/solid/src/use-calendar.tsx:69` and
  `packages/solid/src/use-calendar.tsx:105`.
- **Why it matters:** equivalent root compositions require different knowledge about where to configure accessible
  date labels. The option is accepted at a location that has no effect for the hook/provider composition.
- **Evidence:** source inspection. Both providers derive locale solely from their own prop; neither consults the
  instance's options. The accessibility docs describe the provider prop, but the shared options type still accepts
  the ineffective hook option. Browser rendering was not exercised.

### Documented design costs

These are interface costs to weigh, rather than newly discovered violations of the recorded design.

- **Context exposes less than an instance.** At `packages/react/src/use-calendar.tsx:16` and
  `packages/solid/src/use-calendar.tsx:16`, the public context types expose only `api.navigate`, erase options and
  forbid updates through `never`. Ordinary `next`, `prev`, `today` and feature actions remain on the actual instance
  but cannot be called through the public context type. Callers must retain a separate typed instance reference.
  A TypeScript assertion confirmed `next` is absent. D29/D31 record context erasure.
- **One options object has several lifetimes.** `features` and `atoms` are captured at creation; tracked inputs
  trigger derivation; `eventOrder` is read on a later derivation; the clock subscription is established on mount.
  See `packages/core/src/calendar.ts:99`, `packages/core/src/calendar.ts:190`,
  `packages/core/src/calendar.ts:270` and `packages/core/src/calendar.types.ts:634`. Callers must learn these rules
  beyond the option types. A runtime probe kept order `a,b` after a comparator-only update and changed to `b,a`
  after replacing the events array. This is documented by D24, rather than an undocumented reactivity defect.
- **Instance-free navigation resolves a different implementation.** At
  `packages/core/src/calendar-navigation.ts:30`, the helper uses the layout attached to the view. Instance
  navigation resolves calendar-level replacements at `packages/core/src/calendar.ts:135`. Fetch-range calculations
  can therefore disagree with rendering when a replacement changes navigation. A runtime probe returned March 12
  as the instance's range end and March 11 from `getCalendarNavigation` for the same view/date. D29 explicitly
  records this limitation.
- **Feature fields stop at part render callbacks.** Parts accept extended models structurally but declare their
  render state using base models with the default empty feature set. See
  `packages/react/src/time-grid-view.tsx:26`, `packages/react/src/day-grid-view.tsx:132` and
  `packages/solid/src/day-grid-view.tsx:131`. Consumers can read feature fields from a typed model before passing it
  to a part, but those fields are absent from the callback's declared state. D29 records structural acceptance;
  it does not preserve the full model type through this seam.

### Verification and limits

- Runtime probes used this worktree's core sources with installed `@tanstack/store@0.11.2` and
  `temporal-polyfill@1.0.6` from the main checkout. They checked global feature activation, cross-view scope,
  comparator updates, layout replacement navigation and unknown targets.
- Five compile-time assertions passed with installed TypeScript 7.0.2 against this worktree's core and React
  sources. Dependencies were resolved from the main checkout; assertions covered global model fields, core view
  keys, trigger view keys, context actions and context view keys.
- The initial `pnpm exec tsc` attempt triggered dependency synchronization and was interrupted after registry DNS
  failure: `Failed to fetch https://registry.npmjs.org/rrule-temporal/-/rrule-temporal-2.2.8.tgz` and
  `failed to lookup address information: nodename nor servname provided, or not known`. The installed compiler was
  then invoked directly and passed. Neither checkout has implementation or lockfile changes from the attempt.
- Formatting through the worktree config failed with `Cannot find package 'vite-plus'`. Loading the main checkout's config failed with `EPERM` writing its `node_modules/.vite-temp` file. Formatting used an isolated temporary
  config with the repository's formatting settings and the installed Vite+ formatter.
- This report is the only repository change. Full build, package validation, test suites and browser checks were
  skipped because no code or configuration changed. Formatting and local Markdown link checks apply to the report.

## 2026-10-24 follow-up verification

The four contract gaps above no longer reproduce. The user chose explicit calendar props on triggers and retained
D29's feature activation rule. [D53](../docs/design.md#d53--feature-models-and-bindings-keep-their-registration-contracts)
records the resulting contracts and migration.

- **Provider isolation:** plain and feature-owning instances satisfy both providers and convenience roots after a
  state-map declaration merge. Regression coverage: `packages/react/src/tests/api-contract.spec.tsx:37` and
  `packages/solid/src/tests/api-contract.spec.tsx:37`.
- **Feature model scope:** calendar-only contributions are present in inferred models; view-declared contributions
  remain absent from other views. Paired runtime/type assertions: `packages/core/src/tests/calendar-features.spec.ts:167`
  and `packages/core/src/tests/calendar-features.spec.ts:194`.
- **Trigger targets:** all six trigger interfaces require a calendar and reject unknown view keys. Browser tests
  confirm navigation reaches the supplied calendar. Coverage is in both bindings' `api-contract.spec.tsx` files.
- **Locale ownership:** hook options reject locale, including Solid accessor returns. Both root compositions update
  accessible date labels through the provider, and locale is absent from their core options. Coverage is in both
  bindings' `api-contract.spec.tsx` files.

Verification completed:

- `pnpm run build`: passed, including docs prerendering.
- `npm_config_cache=/private/tmp/calendar-api-npm-cache pnpm run check:all`: passed lint, formatting, every workspace
  and example type check, publint and package export/type validation. Existing lint warnings remain.
- `pnpm run test`: 501 tests passed across 53 files: core 261, React 58, Solid 60, themes 82, RRule 35 and docs 5.
- Local documentation checks resolved 12 Markdown file links and 11 included code references before this status
  section was appended. Formatting and diff whitespace checks were also run.

Environment failures encountered before successful retries:

- Offline dependency installation reported `ERR_PNPM_NO_OFFLINE_TARBALL` for `@types/babel__traverse@7.28.0`.
  Frozen-lockfile installation completed with scripts disabled; package manifests and the lockfile are unchanged.
- The initial browser test run reported `listen EPERM: operation not permitted ::1:63315`. The initial docs build
  reported `Failed to start the Vite preview server for prerendering`, caused by `listen EPERM` on `::1:3000`.
  Both passed with local server access.
- Initial package validation reported `error while checking file: Command failed: npm pack`. The complete check
  passed with a writable temporary npm cache.

Applicable antislop checks:

- R-26 PASS: existing day/column/timeline navigation tests and explicit-instance regressions passed in both bindings.
- R-32 PASS: trigger implementations retain native buttons and existing event/default-prevention behavior; no focus
  styling or keyboard behavior changed.
- R-35 PASS: the full build, all browser suites and locale-switch click tests passed.
