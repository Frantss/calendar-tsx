# Core implementation simplification

Status: replacement candidate implemented, 2026-10-24. The half-size target is missed. The original baseline is
`c6de41e`; the replacement below is measured against `21c6931`.

## Replacement implementation result

The working tree now contains compiled timed surfaces shared by time-grid/timeline models and event previews,
date-bar partitions shared by day grids and all-day tracks, and coverage queries shared by availability and
background layers. The old `bars.ts` and `columns.ts` implementations are removed. A shared evaluator handles
built-in date edits. One guarded dispatcher handles session commands; the DOM gesture uses activation/release
phases and one completion path. Feature contexts and settings-key lookup compile from registration metadata.

The resulting implementation is only slightly smaller. The proposed architecture did not deliver its size budget.

| Measure                                                           | `21c6931` | Replacement | Reduction |
| ----------------------------------------------------------------- | --------: | ----------: | --------: |
| Physical source lines, including types                            |     7,139 |       6,963 |     2.47% |
| Lines in implementation files, including imports and inline types |     5,320 |       5,144 |     3.31% |
| Source lines containing runtime tokens, excluding imports         |     4,107 |       3,970 |     3.34% |
| Runtime tokens, excluding imports                                 |    34,135 |      33,333 |     2.35% |
| Built JavaScript bytes, including source-map reference            |   143,801 |     138,436 |     3.73% |
| Gzipped built JavaScript bytes                                    |    32,813 |      32,428 |     1.17% |

New helpers and compatibility adapters count in full. No implementation moved to another package or dependency.
The new measurement utility is tooling, outside the core-source denominator; it contains no calendar behavior.
Tests, comments, type syntax and imports do not earn runtime-token savings. Most deleted builder/evaluator code
reappears in the shared implementation, so the source changes do not establish that most of core was unnecessary.

Run the same source measurement from the repository root after installing the frozen lockfile:

```bash
NODE_NO_WARNINGS=1 node scripts/measure-core.mjs 21c6931
NODE_NO_WARNINGS=1 node scripts/measure-core.mjs
```

The utility uses Node's TypeScript stripping and the installed Acorn 8.19.0 parser. It can read the reference's
source directly from Git, without changing the checkout. Its baseline totals match the earlier measurement.

The exact coordinate foundation, native recurrence, public extension protocols and declared public types remain.
Hit location still reads the current decorated model. Day-grid event previews retain day-grid assembly, including
its overflow callbacks; timed event previews query compiled surfaces without constructing slots or a public
layout root. These choices preserve existing behavior but also limit the reduction.

This candidate does not meet the proposal's feasibility gate. The half-size objective remains unfulfilled.
It is left uncommitted for review; this result is not a claim that a half-size replacement is ready.

### Replacement verification

- Root declarations are byte-for-byte identical to the saved `21c6931` build.
- The full workspace build, package/type checks and test suite pass. The suite now contains 671 tests in 68 files.
- Storybook passes all 146 browser/screenshot cases in 17 files, without baseline changes.
- The differential probe matches 720 complete calendar models and move/preview/commit cases across eight
  zone/transition cases, plus 54 direct public descriptor comparisons with raw option/view input.
- Two added public regressions cover synchronous controlled-owner cancellation during publication and the
  difference between unavailable and commit refresh ordering. Both also pass against the control implementation.
- An isolated smoke comparison with 1,200 events, 12 resources and seven dates used 12 measured samples after
  warmup, alternating implementation order. Median grid derivation was 337.35 ms for the control and 337.59 ms
  for the replacement; timeline derivation was 332.13 ms and 330.31 ms. Complete models matched. An earlier run
  concurrent with other checks was slower and noisier. These samples do not establish general performance
  equivalence or reference-graph/callback-order equivalence beyond the covered assertions.

The final `pnpm run build`, `pnpm run check:all` and `pnpm run test` sequence passed against the final runtime
source. Temporary artifacts and complete logs are under `/tmp/calendar-core-implementation/`. Gzip uses Python
`gzip.compress` with `mtime=0` for both saved bundles. The initial sandboxed browser command failed with
`Error: listen EPERM: operation not permitted ::1:63315`; the successful runs used an allowed local listener.
The initial lint pass flagged four unbound internal surface-method references. Explicit `this: void` annotations
resolve those references; existing unrelated warnings remain documented in `reports/lint-warnings.md`.

## Implementation result

Time grids and timelines now share event projection records, numeric bounds, enclosure and exact coverage.
Date bars and timeline stacks share first-fit row allocation. Timed background layers share coverage preparation
and model construction, with per-build coverage reuse across resource rows or columns. Relocation policy resolves
operation-specific layers in one function; feature contexts reuse registration metadata.

The reduction is small:

| Measure                                                           | Baseline |  Result |    Reduction |
| ----------------------------------------------------------------- | -------: | ------: | -----------: |
| Lines in implementation files, including imports and inline types |    5,365 |   5,320 |    45 (0.8%) |
| Source lines containing runtime tokens, excluding imports         |    4,150 |   4,107 |    43 (1.0%) |
| Runtime tokens, excluding imports                                 |   34,671 |  34,135 |   536 (1.5%) |
| Built JavaScript bytes, including source-map reference            |  145,355 | 143,801 | 1,554 (1.1%) |

New helpers count toward these totals. Public declarations are byte-for-byte identical to a fresh baseline build.
This replacement consolidates geometry decisions but does not validate the proposed 50% saving. Most removed
layout code reappears in the shared implementation.

Built-in operation descriptors retain their direct-view overlays. Those descriptors accept the public
`Calendar_InteractionInput` shape; removing the overlays would change direct invocation with unmerged input.
Relocation resolution is consolidated without changing that behavior or third-party inputs. Generic factory
configuration and live interaction settings retain their distinct contracts.

The ownership runtime and DOM driver remain intact. Their existing shared implementation has little duplicated
logic, and this result does not justify a speculative lifecycle rewrite to meet the size target. A further 50%
reduction needs a different design with a measured replacement, beyond the consolidation demonstrated here.

### Verification

- Full workspace build passed, including Storybook and documentation prerendering.
- `pnpm run check:all` passed: lint, formatting, workspace/compiler fixtures, publint and package type validation.
  Existing lint warnings remain in unchanged files; see [lint findings](../reports/lint-warnings.md).
- `pnpm run test` passed: 669 tests in 68 files across core, bindings, themes, recurrence and documentation.
- `pnpm run test:storybook` passed: 146 stories in 17 files, including screenshot comparisons. No baselines changed.
- A temporary differential runner matched 720 complete calendar models and move/preview/commit results against
  the saved original implementation across eight zone/transition cases. It includes hidden/overnight/partial
  windows, resource scopes, foreground/background events and submillisecond timestamps.
- A separate baseline build produced exactly the same root `index.d.ts` as the changed implementation.
- Another 54 differential comparisons matched direct descriptor calls with unmerged option/view input, including
  enabled/disabled overrides and timed/all-day relocation targets.
- Comment check PASS: the shared allocator comment records input order and half-open overlap behavior.

The sandbox initially blocked browser listeners and documentation prerendering with `listen EPERM`. Package
validation initially reported `Command failed: npm pack`. The final build, tests and package validation passed
outside the sandbox. An initial browser run reported `Vitest failed to find the current suite` after Vite
optimized dependencies and reloaded tests; the rerun passed. Missing Storybook dependencies were installed from
the frozen lockfile in this worktree. Package manifests and the lockfile did not change.

## Original recommendation

Replace repeated event-to-layout preparation with shared projection records, then make each built-in layout a
small adapter from those records to its existing public model. Consolidate settings resolution separately. Keep
the public feature contracts and the existing coordinate, ownership and browser semantics.

The investigation identified this direction for reducing implementation without establishing a half-size
replacement. The implementation result above measures its first replacement, including helpers and adapters.

The evidence is in [the findings](../reports/core-simplification.md). The relevant requirements are
[D24, D38–D44, D49, D54 and D58–D61](design.md),
[coordinates](design.md#d41--built-in-views-share-visible-date-and-clock-window-coordinates), [assembly](design.md#d54--feature-factories-configure-calendar-assembly) and [module ownership](design.md#d56--core-modules-own-implementations-types-and-tests).

## Baseline and target

Count only `packages/core/src/**/*.ts`, excluding every `tests` directory. Public exports, test fixtures, build
output, React, Solid and RRule code are outside this denominator. Any implementation moved there must still count
against the replacement; moving code cannot earn a reduction.

| Measure                                                           | Baseline |         Half |
| ----------------------------------------------------------------- | -------: | -----------: |
| Physical source lines, including types                            |    7,184 |        3,592 |
| Lines in implementation files, including imports and inline types |    5,365 |  about 2,683 |
| Source lines containing runtime tokens, excluding imports         |    4,150 |        2,075 |
| Runtime tokens, excluding imports                                 |   34,671 | about 17,336 |

The second measure excludes filenames ending in `.types.ts` or `.feature-maps.ts`; it still includes internal
type declarations. The third and fourth measures use Node 24.13.0 `stripTypeScriptTypes` and Acorn 8.19.0.
Comments, type syntax and import declarations contribute no runtime tokens. A runtime line is an original source
line touched by a remaining token. This is a size measure, not a measure of complexity or necessity.

Track both runtime lines and runtime tokens, using the existing formatter. Preserve public declarations and
meaningful tests. Deleting comments, weakening types, increasing line length, introducing generated code or moving
implementation into dependencies does not satisfy the target.

| Area                                                  | Runtime lines | Runtime tokens |
| ----------------------------------------------------- | ------------: | -------------: |
| Calendar, views, events and dates                     |           519 |          4,327 |
| Feature assembly and runtime                          |           186 |          1,714 |
| Built-in layout builders and interaction capabilities |           844 |          6,855 |
| Shared geometry                                       |           578 |          5,072 |
| Background feature                                    |           196 |          1,574 |
| Interaction runtime and placement                     |           429 |          3,634 |
| Operation and input features                          |           484 |          4,154 |
| DOM transport and bindings                            |           684 |          4,941 |
| Native recurrence                                     |           230 |          2,400 |
| **Total**                                             |     **4,150** |     **34,671** |

Layouts, shared geometry and backgrounds together contain 1,618 runtime lines, 39% of the total. Even removing
all of them would leave 2,532 lines. A half-size implementation therefore requires substantial reductions in
interaction, DOM and orchestration code as well. Layout deduplication alone cannot meet the target.

## Alternatives

| Approach                                                                | Benefit                                                                                                                              | Cost and limitation                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Extract individual duplicated helpers                                   | Small, reversible replacements; simple differential checks                                                                           | Leaves the separate preparation paths and most model construction intact. No evidence of a whole-core 50% saving.              |
| Replace preparation with projection records and explicit model adapters | Removes repeated decisions and intermediate conversions; gives layout, shading and preview one implementation of each geometric rule | Larger change across built-in layouts. Adapter boilerplate remains because public models stay fixed. Savings must be measured. |

Recommend the second approach, delivered through independently verified replacements. Use local extractions
only where they support that replacement. Do not add a second engine beside the existing one in production.

Rejected: a generic calendar DSL or new plugin framework. The existing public hooks already provide extension
seams; another configuration language would need its own interpretation and types. Removing the feature runtime
or hardcoding operation/layout kinds would lose the public third-party contracts. Replacing Temporal clock math
with elapsed-day fractions would violate D40/D41. Moving DOM code to the adapters would duplicate or relocate it.

## Proposed internal design

### 1. Resolve registration and settings in one place

The feature runtime owns canonical identities, registry aliases, layout lookup, settings-layer assembly and stage
contexts. Index fixed registration metadata once per instance. Resolve live setting values when commands or
updates need them. Built-in operations consume the effective settings instead of merging the active view again.

Retain both public `context.config` and `context.settings(key, defaults)`. They have different contracts: generic
factory configuration is shallow-merged, while interaction settings include live options, direct view settings
and a feature-owned `mergeSettings` hook. Share their lookup machinery without treating their outputs as equal.
Preserve the existing input shape passed to third-party operations and dependency callbacks.

Relocation remains one feature-owned merge: library defaults, calendar policy, factory configuration, live
settings, view alias overrides, direct view settings. `undefined` inherits; `false` overrides. Resolve dependency
values from the effective policy so equal recreated objects do not invalidate drafts. Preserve validation errors,
registration order and hook invocation behavior; indexing is not permission to remove observable validations.

### 2. Project an event once, derive its uses from that record

Keep the existing coordinate plan and its public model fields. A private projection record contains the event,
its exact timed fragments or inclusive date span, and access to derived bounds and exact coverage. Compute these
within the built-in layout invocation, after event stages have run. Avoid adding a second persistent cache.

Expose two internal geometric operations over that record:

- **Enclose:** derive the foreground display interval, apply minimum paint duration, and clip to the surface.
- **Cover:** derive exact occupied intervals, merge them, and optionally complement them for shading.

Time-grid columns use a date-local surface; timeline rows use the concatenated visible track. The same projected
fragments feed both transformations. Their adapters retain their own keys, continuation fields and model shapes.
Date bars retain a separate date-cell projection because all-day membership is not an instant interval.

This replaces duplicated bounds/continuation/coverage preparation in layout builders and background decoration.
It does not replace the coordinate plan with endpoint subtraction. DST fragments, offsets, occurrences, cut
reasons, skipped dates, overnight anchors and nanoseconds remain intact.

Resource placement uses explicit policies. An unassigned foreground event appears in no resource column; an
unassigned background event shades all resource columns; a resource-scoped layer requires a matching resource.
Do not merge those predicates into one default rule.

### 3. Allocate rows once; retain time-grid lane policy

Use one first-fit row allocator over half-open numeric display intervals for timeline stacks and date bars.
Convert an inclusive date-column span `[first, last]` to `[first, last + 1)` at the adapter. Preserve event input
order in these two layouts.

Keep the time-grid lane policy separate: sort by start and descending end, find transitive overlap clusters,
assign lanes, expand into free lanes, then apply cascade width. Reusing row allocation must preserve that order,
cluster lane counts and paint order. A universal sort would change behavior.

A temporary allocator prototype matched the existing date-bar and timeline allocators on 20,000 comparisons.
This establishes one small shared mechanism. It does not prove full layout equivalence, performance parity or a
50% reduction. Date-bar boolean occupancy and interval scanning have different costs on long spans.

### 4. Let layout adapters assemble public output

Retain four layout kinds, their factories, generic inference, model fields, keys, array order and object-sharing
contracts. Each adapter selects surfaces, requests enclosure or coverage, applies its packing policy and emits
its current model. Keep compact list/day-grid logic when the shared path would make it larger.

Preview projection uses the same preparation and geometry as event layout, with isolated preview allocation.
Selection projects a semantic range directly. Previews must not repack neighbors, notify the base store, fabricate
an event payload or move derived geometry into ownership snapshots. Continue dispatching custom layouts through
their own `locate/project` methods, including boolean targets and custom preview shapes.

### 5. Simplify interaction plumbing without changing ownership

Keep one lease runtime and its separate semantic and derived-preview stores. Centralize repeated command checks
only when their ordering remains identical. Read, publish and acknowledge through one internal ownership adapter
for internal, controlled and external modes. Public ownership snapshots and typed session handles stay unchanged.

The lease cannot be derived solely from the acknowledged snapshot: a controlled owner can still be holding an
older snapshot. Preserve identity acknowledgment, pending writes, stale handles, synchronous callback reentrancy,
source-identity cancellation, current-option revalidation and commit-time validation.

The DOM driver already serves every operation. Retain that shared driver. A smaller implementation may combine
lifetime cleanup and descriptor access, but must preserve stable refs, live descriptors, scoped hosts, delayed
commit after pointer release, transfer reservations, pointer capture, touch tolerance and nested scrolling.
A lifecycle refactor earns a place only if the complete replacement is smaller and passes browser coverage.

## Replacement and acceptance sequence

1. Freeze the baseline exports and declarations. Keep third-party fixtures unchanged. Capture runtime size and
   observable callback/store traces before replacing implementation.
2. Replace shared row allocation and one timed-layout preparation path. Compare complete models against the old
   implementation, then add the second timed layout, shading and preview consumers. Count new helpers and adapters.
3. Consolidate settings lookup and built-in consumers. Exercise every settings layer, aliases, explicit
   `undefined`, `false`, custom merge hooks and equal-policy revalidation.
4. Attempt interaction/DOM reductions only after the geometry replacement demonstrates a net saving. Measure each
   subsystem against the whole-core target. If the required saving is unsupported, report the shortfall rather
   than hiding implementation elsewhere or relaxing behavior.
5. Remove replaced implementations. Run formatting only on changed files, then `pnpm run build`,
   `pnpm run check:all` and `pnpm run test`. Build must precede built-entry/package validation. Run affected
   Storybook/browser scenarios when public geometry or gesture transport changes.

Differential model checks must cover all durations and grouping orders, resource assignment, overflow, hidden
weekdays and the all-hidden fallback, partial/overnight windows, minimum sizes, DST gaps/folds, midnight
transitions and skipped dates. Compare exact keys, array order, event payloads, Temporal values, fragments and
important reference identities. Do not serialize away `undefined`, bigints, maps or shared references.

Behavioral traces must cover mount reference counting and reverse cleanup, remount, tracked/untracked options,
source and stage caches, callbacks, controlled/external state, stale sessions, delayed acknowledgment, source
replacement, transfers, external drops and third-party operations/layouts. Use injected clocks and deterministic
inputs. Model equality alone cannot establish lifecycle equivalence.

## Initial investigation verification

- Inspected source, public declarations/extension fixtures, relevant test cases, design decisions, package
  configuration and installed dependency versions.
- Counted all non-test core source with the metrics above.
- Ran 20,000 differential allocator comparisons with a deterministic seed, using functions extracted from this
  checkout and a temporary shared interval allocator. All passed.
- No complete replacement was implemented or type-checked. No core, adapter or browser suite was run for this
  proposal. Build/type/package checks are unnecessary for these documentation-only repository changes.

Temporary measurement and probe files are under `/tmp/calendar-core-simplification/`. They use the installed
Acorn package from the primary checkout. During the initial investigation, no package manifests, lockfiles or production source changed. The probe exercises only row
numbers for empty, single-column, unsorted, overlapping, touching and fractional-coordinate intervals.

Formatting initially failed through the workspace wrappers. `pnpm exec vp fmt` attempted dependency synchronization
and reported `dns error: failed to lookup address information`; I interrupted it. Direct `vp fmt` could not resolve
`vite-plus` in this dependency-free worktree. Running it in the primary checkout reported
`EPERM: operation not permitted` for its generated `node_modules/.vite-temp` configuration. The fallback uses the
installed Oxfmt binary with a temporary JSON copy of the repository's formatting options.

## Replacement design after the first result

The next candidate replaces the layout assembly and interaction control flow. Extracting more helpers from the
current implementations is insufficient. Keep the public descriptors and types as compatibility adapters; build
the internals around compiled surfaces and a transaction dispatcher. This is a proposed architecture, not a
verified half-size implementation.

### Experiment that changed the recommendation

I replaced the entire time-grid and timeline builders in an isolated copy of `21c6931`. A single `buildTimed`
function handles surface enumeration, projection, placement, availability, background events, slots and model
construction. The existing exported builder signatures become adapters. The new implementation counts in full.

| Measure                                | Two original builders | Kernel and both adapters | Reduction |
| -------------------------------------- | --------------------: | -----------------------: | --------: |
| Formatted source lines                 |                   394 |                      278 |     29.4% |
| Source lines containing runtime tokens |                   293 |                      217 |     25.9% |
| Runtime tokens, excluding imports      |                 2,148 |                    1,655 |     23.0% |

Across core, that is 4,107 to 4,031 runtime lines and 34,135 to 33,642 runtime tokens. A second builder-sharing
pass therefore saves only 1.4% of runtime tokens. I rejected it as the main solution and did not apply it to
production. This experiment also exposes a design problem: one function with repeated `grid ? ... : ...`
branches retains two implementations inside the shared function.

The isolated prototype passed all 366 core tests in 26 files, source and public compiler fixtures, and 720
differential complete-model/move/preview/commit cases across eight time-zone/transition cases. Another 54 direct
operation-descriptor comparisons passed. Its core build passed and produced root declarations identical to the
current build. The differential comparisons preserve property presence, Temporal types/values, maps, keys and
array order. They do not establish all reference identities, callback ordering or performance equivalence.

The temporary experiment is under `/tmp/calendar-core-replacement/`: `control/`, `candidate/`, `prototype.patch`,
`differential.mjs`, `measurements.json` and `build.log`. These are local experiment artifacts, not repository
dependencies or an implementation being proposed for merge.

### The replacement: compile a view, query surfaces, materialize the public model

Today, layout builders assemble render models, background decorators traverse those models, and interaction
projectors build another layout and extract its geometry. Replace these separate assembly paths with one private
surface representation. Keep the existing coordinate plan, including exact source fragments, as its foundation.

The private interface has three operations:

```text
compileView(definition, period, range, resources, coordinatePlan) -> surfaces
querySurface(surface, sources, projectionPolicy, placementPolicy) -> placements
materialize(layoutKind, surfaces, placements) -> existing public layout
```

A surface contains a stable identity, its position in the output hierarchy, visible date ordinals, optional
resource assignment and a coordinate domain. Date surfaces and clock surfaces remain distinct. Time-grid columns
and timeline rows differ in which date ordinals they contain. Day-grid rows contain date cells. List sections
group date cells without packing them. Grouping constructs the surface hierarchy before event placement.

Use explicit policies, rather than a layout-kind switch throughout the query:

| Decision     | Policies required by current behavior                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Membership   | Foreground resource assignment, unassigned background events, scoped background layers |
| Projection   | Inclusive date membership, exact clock coverage, enclosing clock rectangle             |
| Placement    | Preserve ordered first-fit rows, sort and pack overlap clusters, no packing            |
| Paint sizing | No minimum, local-window minimum, full-timeline minimum                                |
| Shading      | Union coverage, complement coverage, day-cell membership                               |

These policies encode existing differences. For example, foreground events without assignments do not appear
under resources; unassigned background events do. Day-grid timed background events do not become ordinary cell
shading. An inverse day-grid layer tests whether a timed range touches the day. A timeline foreground rectangle
may enclose several dates; its timed background events still produce separate per-date pieces.

The four materializers own public nesting, key formats and field names. They perform no time arithmetic or
packing. Their code counts toward the replacement. Public `coordinates`, `fragments`, continuation flags,
`undefined` properties, ordering and shared event/resource references remain part of their output contract.

For event previews, query the same surfaces with the proposed event as the only foreground input. Preserve the
current isolated preview packing; existing events must not acquire influence over preview lanes. For selections,
query date membership or clock enclosure without packing. Convert placements directly into public preview
geometry. This removes the preview-only construction and traversal of a complete public layout.

Backgrounds use the same coverage query. Preserve their position in the public feature decoration sequence.
Third-party decorators can change a model before the background stage, so the background adapter must derive its
surface inputs from the model it receives. It cannot silently reuse an earlier, stale scene. This adapter is a
material feasibility risk: if reconstructing compatible surfaces costs as much as the existing decorator, the
proposed saving does not exist.

Custom layouts continue through their existing `build`, `locate` and `project` descriptors. Their arbitrary
targets and geometry do not enter the built-in date/clock representation. There is no new consumer interface.

### Replace interaction control flow with one guarded dispatcher

The current runtime already shares operation dispatch and ownership. Another generic operation wrapper alone
will not remove much code. The proposed change is to consolidate session command transitions and move built-in
date-edit differences into ordered operation definitions.

One synchronous dispatcher handles `begin`, `update`, `commit`, `unavailable`, `cancel` and `refresh`. Session
handles only capture their token and submit commands. The dispatcher owns lease validity, source/context
invalidation and revalidation. An ownership channel owns `read`, `publish` and identity acknowledgment. The
preview store derives from the acknowledged semantic snapshot and current layout.

Keep the lease, pending publication and owner snapshot as separate facts. A controlled owner can delay, replace,
or synchronously acknowledge a publication. Collapsing them into one draft object would change behavior.
Likewise, command results must retain the current distinctions between `busy`, `awaiting-owner`, `unchanged`,
`stale-session` and invalid candidates.

Use a central command preflight with the existing per-command ordering. `update` and `commit` refresh before
checking acknowledgment; `unavailable` currently does not refresh. Recheck the lease after callbacks that can
reenter the runtime. Apply observable effects synchronously in the current order; a deferred command queue would
change callback behavior. Clear the lease before publishing completion and emitting a proposal.

Movement, resize, creation and transfer become definitions with ordered guards, a transformation, a scheduling
effect and an output adapter. Share source lookup, range checks and date transformations where their semantics
match. Preserve per-operation error status and precedence. Keep transfer preparation/release as a source lease,
with one source completion callback. Selection and third-party operations use the same dispatcher without being
forced into an event-edit shape.

Public descriptor callbacks remain independently callable with raw interaction input. Their adapters invoke the
same evaluators after applying the current raw root/view rules. They must not assume access to a compiled calendar
or change how explicit `undefined` overrides work. Factory exports, literal inference and extension maps remain.

### Compile registration metadata; keep live input reads

Compile feature aliases, prerequisite validation, operation registration, settings-key lookup and ordered stage
lists when their definitions change. Keep the public factory objects and context contracts. Use that compiled
metadata in both the calendar derivation and the interaction dispatcher instead of reconstructing registration
information at each read.

Live options remain live. Preserve D24's tracked fields, comparator behavior, injected clock and controlled
navigation. Keep stage caches keyed by input identity and the declared dependencies; retain config identity per
view/alias. Do not replace these with one global revision counter or cache public settings results under a new
identity policy. External atoms, controlled feature state, lifecycle callback order and remount behavior still
flow through the existing public context interface.

This module also owns source resolution, normalization, foreground/background partitioning and derivation. Native
recurrence can retain its current implementation and resolver seam. Rewriting recurrence does not remove the
layout or interaction representations responsible for this proposal.

### Replace the gesture flags with a gesture lifetime

Keep the semantic dispatcher independent from DOM input. Give each gesture one lifetime with states `waiting`,
`active`, `awaiting-owner` and `ended`, plus the temporary callback suppression needed during finalization. One
event adapter routes pointer/touch/cancel/scroll events to that lifetime. One cleanup scope owns listeners,
capture, timers, the animation frame, subscriptions and the prepared transfer source.

Normalize hits to `{ host, surface, location }`; use the surface program for built-in hit interpretation and
existing descriptor capabilities for extensions. Keep touch activation, captured activation settings versus live
settings, destination switching and delayed post-release completion explicit. Share the horizontal/vertical
scroll calculation while retaining nested scrolling fallback and window scrolling.

The existing DOM host already uses `AbortController` and shared transport. This proposal earns savings only by
removing repeated state-transition and cleanup paths. Merely introducing a reducer and an effect executor beside
the current driver would add code. Source/event bindings and stable framework binding refs remain adapters, and
their code is included in the DOM budget.

### Size limits and feasibility gates

Use `21c6931` as the new control. Target at most 2,050 runtime-bearing lines and 17,000 runtime tokens, including
compatibility adapters, policies, tables and new helpers. These limits halve the current core. They are design
budgets, not measured estimates or evidence that this architecture will fit.

| Responsibility                                     | Current lines | Line budget | Current tokens | Token budget |
| -------------------------------------------------- | ------------: | ----------: | -------------: | -----------: |
| Calendar, assembly, views, dates and event sources |           704 |         310 |          6,048 |        2,450 |
| Surfaces, coordinates, all layouts and backgrounds |         1,580 |         720 |         13,021 |        6,000 |
| Interaction dispatcher, ownership and placement    |           433 |         220 |          3,653 |        1,800 |
| Operation and input feature adapters               |           476 |         210 |          4,072 |        1,600 |
| DOM driver and bindings                            |           684 |         360 |          4,941 |        2,750 |
| Native recurrence, retained                        |           230 |         230 |          2,400 |        2,400 |
| **Total**                                          |     **4,107** |   **2,050** |     **34,135** |   **17,000** |

The geometry budget includes the existing exact coordinate foundation. The remaining surface compiler,
materializers, shading and preview adapters must fit around it. This is the highest-risk budget. The other main
risk is preserving synchronous owner/callback traces in a smaller dispatcher. Neither has a complete replacement
or a passing equivalence result yet. There is no substantiated 50% saving to report from this investigation.

The next useful experiment is a complete surface path covering time grid, timeline, day grid, list, background
decoration, hit location and preview output. Measure it with the coordinate code and adapters included. Reject it
if it cannot approach its budget. Independently validate the dispatcher with controlled-owner/reentrancy traces
before combining it with the gesture lifetime. Avoid another production change that saves a small percentage
while leaving these questions open.

Before replacing production, require the existing workspace build/check/test commands, public declaration and
extension fixtures, Storybook/browser cases and differential models. Extend the trace checks to compare callback
order, reference identities, delayed acknowledgment, source replacement, equal-settings invalidation, transfers
and cleanup. Measure representative large event/resource cases to catch an asymptotic regression from repeated
surface scans. The isolated prototype's passing checks do not establish these guarantees for the new design.

### Alternatives considered

| Alternative                                                                 | Decision                                                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continue helper extraction or merge only timed builders                     | Reject as the main approach. The measured net savings remain about 1.5% per pass.                                                                         |
| Rewrite each module independently with its current internal representations | Lower migration risk, but retains model reconstruction and duplicate command preflights. No evidence supports a half-size outcome.                        |
| Compile surfaces and consolidate transaction/gesture lifetimes              | Preferred next experiment. It removes whole assembly paths, but compatibility adapters and state transitions could consume the saving.                    |
| Generate builders or encode arbitrary control flow in a generic interpreter | Reject. Count generated/runtime descriptions in full; reduced handwriting does not establish less implementation.                                         |
| Replace scheduling and gesture behavior with an external engine             | No equivalent engine has been established. Wrapping different DST, ownership or extension semantics would require a separate compatibility investigation. |

Repository changes for this investigation are documentation only. Full workspace builds, package checks and
adapter/Storybook suites were not rerun for these documents. The isolated prototype checks above have a narrower
scope. Production core remains at `21c6931`.
