# Core implementation simplification

Status: first replacement implemented, 2026-10-24. Baseline: `c6de41e`. The half-size target remains unachieved.

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
