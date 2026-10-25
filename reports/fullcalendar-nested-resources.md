# Nested resources: FullCalendar reference

## Snapshot: 2026-10-24

Research only; no library changes. Compared the official v7 docs with the public
`fullcalendar-workspace` source at tag `v7.1.3` (`9e1813a`). The
[documentation](https://fullcalendar.io/docs) identifies v7.1.3 as the latest
release, dated October 15, 2026; the
[workspace release](https://github.com/fullcalendar/fullcalendar-workspace/releases/tag/v7.1.3)
confirms the tag. Resource views are Premium. Source inspection used the existing
local archive at `/private/tmp/fullcalendar-workspace-7.1.3`; the tagged resource
parser was fetched separately and matched byte-for-byte. Upstream tests were read,
not executed. No browser behavior was verified.

## Findings

### 1. Two input syntaxes normalize to one parent relationship

- **What:** A resource can contain recursive `children`, or a flat resource can
  reference its parent using `parentId`. Parsing stores every resource in a flat
  ID-keyed hash with `parentId`; the nested input is not retained as the internal
  representation. An explicit nonempty `parentId` wins over the containing
  `children` relationship. Parsing and tree traversal recurse without a fixed
  depth limit. This establishes arbitrary structural depth, not an unlimited
  practical stack depth.
- **Where:** [Resource parsing](https://fullcalendar.io/docs/resource-parsing);
  [parser, lines 54–93](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/structs/resource.ts#L54-L93).
- **Why it matters:** Input convenience, resource identity and presentation
  hierarchy are separate concerns. Both input formats have the same event IDs and
  hierarchy behavior.

### 2. Timeline presents the tree; vertical views flatten it

- **What:** Resource Timeline has one real row for each visible parent and child,
  with indentation and expanders. Resource TimeGrid and DayGrid instead flatten
  the tree in parent-before-descendant order into resource columns. They include
  parent resources as columns; they do not build multilevel parent headers or use
  Timeline's expansion state. `datesAboveResources` controls date/resource header
  order, not resource ancestry.
- **Where:** [Expansion option's Timeline-only contract](https://fullcalendar.io/docs/resourcesInitiallyExpanded);
  [vertical-resource view](https://fullcalendar.io/docs/vertical-resource-view);
  [tree flattening, lines 212–230](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-hierarchy.ts#L212-L230);
  [TimeGrid, lines 80–106](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timegrid/components/ResourceTimeGridView.tsx#L80-L106);
  [vertical header construction](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-daygrid/resource-header-tier.ts#L37-L163).
- **Why it matters:** Supporting hierarchical resource data does not establish the
  same presentation in every resource view.

### 3. Expansion is internal visibility state, separate from resource data

- **What:** `resourcesInitiallyExpanded` defaults to `true`. The reducer stores
  per-entity Boolean overrides keyed by resource ID; layout falls back to the
  option for IDs without an override. Collapsing a parent removes descendants
  from visible row projections without removing them from the resource store.
  Clicks dispatch `SET_RESOURCE_ENTITY_EXPANDED`. The inspected public APIs and
  listeners expose no per-resource expansion setter, controlled expansion input,
  or dedicated expansion-change callback. Resource CRUD callbacks describe data
  changes, not expansion. Expander render hooks receive `isExpanded`, but not a
  resource or toggle function.
- **Where:** [Initial expansion](https://fullcalendar.io/docs/resourcesInitiallyExpanded);
  [expander hooks](https://fullcalendar.io/docs/resource-expander-render-hooks);
  [expansion reducer](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/reducers/resourceEntityExpansions.ts);
  [layout, lines 98–135](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timeline/resource-layout.ts#L98-L135);
  [click dispatch](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timeline/components/spreadsheet/ResourceCell.tsx#L138-L148);
  [public calendar methods](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/api/CalendarApi.ts#L6-L14),
  [option/listener definitions](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/common/options.ts).
- **Why it matters:** FullCalendar's built-in toggle state does not provide a
  complete controlled-state contract for an application-owned tree.

### 4. Ordering applies within siblings; grouping wraps resource roots

- **What:** The default resource order is `id,title`, not input order or title
  alone. Custom ordering supports ascending/descending compound fields. Child
  resources are sorted within their parent's child list. `resourceGroupField`
  creates synthetic groups around top-level resource trees; descendants remain
  under their parents even if their own grouping field differs. Synthetic group
  rows and parent resources are distinct entity types. Both can collapse, but a
  synthetic group has no resource identity for event assignment.
- **Where:** [Resource ordering](https://fullcalendar.io/docs/resourceOrder);
  [field grouping](https://fullcalendar.io/docs/resourceGroupField);
  [root grouping and child wiring, lines 46–120](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-hierarchy.ts#L46-L120);
  [sibling sorting, lines 178–198](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-hierarchy.ts#L178-L198).
- **Why it matters:** A grouping label does not imply a schedulable parent, and
  global sorting does not interleave children across unrelated parents.

### 5. Event filtering preserves ancestors

- **What:** `filterResourcesWithEvents` is off by default. When enabled, the
  implementation keeps resources whose event instances intersect the active
  range, then walks their parent chains to keep ancestors. Keeping an ancestor
  does not keep its other empty descendants. Filtering and expansion are
  independent: a retained descendant can still be collapsed. Current vertical
  multi-date views also filter per date. The source explicitly treats active-range
  intersection as coarser than actual visible slots, and documents limitations
  involving inverse-background and hidden events.
- **Where:** [Filtering option](https://fullcalendar.io/docs/filterResourcesWithEvents);
  [filtering and ancestor walk, lines 8–95](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-filtering.ts#L8-L95);
  [per-date filtering, lines 117–151](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-filtering.ts#L117-L151).
- **Why it matters:** Showing a descendant requires retaining its path to the
  root; event presence and whether a row is rendered are different predicates.

### 6. Parents are schedulable resources; descendant events do not roll up

- **What:** `resourceId`/`resourceIds` assigns events directly to resource IDs.
  Rendering splits on exactly those IDs. Parent rows can have their own events,
  but do not automatically display their children's events. `Resource.getEvents()`
  likewise checks direct assignment. Collapsing hides descendant events rather
  than summarizing them on the parent; upstream tests assert they appear after
  expansion. A multi-resource event renders once per assigned resource.
- **Where:** [Event assignment](https://fullcalendar.io/docs/resources-and-events);
  [resource splitter](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/ResourceSplitter.ts#L20-L32);
  [getEvents, lines 117–132](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/api/ResourceApi.ts#L117-L132);
  [collapsed-event tests, lines 42–87](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/vanilla-scheduler-tests/src/misc/resourcesInitiallyExpanded.ts#L42-L87).
- **Why it matters:** Hierarchy supplies structure and visibility, not summary
  bars, inherited event assignments or a capacity model.

### 7. Dragging changes direct assignment, without hierarchy propagation

- **What:** Moving an event between resource hits replaces the origin resource ID
  with the destination ID if resource editing is allowed. For a multi-resource
  event, other assignments remain; an already-assigned destination is deduplicated.
  The mutation does not traverse parents or descendants. Parent resource lanes
  follow the same mechanism as other real resource lanes. `eventDrop` exposes
  `oldResource` and `newResource` when assignment changes. This source inspection
  does not establish drag-to-expand or resource-row reparenting support.
- **Where:** [Drop callback](https://fullcalendar.io/docs/eventDrop);
  [resource drag mutation, lines 4–39](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/EventDragging.ts#L4-L39).
- **Why it matters:** A tree change and an event's scheduling change are different
  operations; hierarchy does not implicitly move an entire subtree's events.

### 8. Invalid trees receive little normalization

- **What:** The parser keeps the first occurrence of an ID during one parse and
  only recurses through that accepted occurrence's children. Tree construction
  renders only nodes without a `parentId` as roots. A resource referencing a
  missing parent is not promoted automatically and is absent from that hierarchy.
  No cycle guard was found in the parser, hierarchy builder or ancestor-filter
  walk. Consequently a parent cycle has no root, and an event-bearing cycle can
  make the ancestor walk nonterminating. These are source-derived edge cases,
  not executed reproduction tests. Removing an existing parent through the API
  explicitly promotes its immediate children to roots instead of cascading removal.
- **Where:** [Parser, lines 83–90](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/structs/resource.ts#L83-L90);
  [hierarchy, lines 55–95](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-hierarchy.ts#L55-L95);
  [ancestor walk, lines 78–95](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/common/resource-filtering.ts#L78-L95);
  [removal, lines 63–78](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/reducers/resourceStore.ts#L63-L78).
- **Why it matters:** FullCalendar is a behavioral reference, but its treatment of
  malformed trees is not a documented validation contract.

### 9. Scale and accessibility have separate limits

- **What:** Timeline resource virtualization is opt-in and defaults to `false`;
  it renders nearby rows and time columns. It does not extend to vertical resource
  views. Printing uses no virtualization and defaults to a 1,000-row cap when the
  adaptive plugin is loaded. Hierarchical Timeline declares `treegrid`, row
  `aria-level` and `aria-expanded`; source comments state roving tabindex is not
  implemented, and the visual expander is an `aria-hidden` span with a click handler.
  These source observations are not an accessibility-conformance test.
- **Where:** [Virtualization](https://fullcalendar.io/docs/virtualization);
  [print cap](https://fullcalendar.io/docs/printMaxRows);
  [ARIA role and rows](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timeline/aria.tsx#L30-L106);
  [expander element](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource-timeline/components/spreadsheet/ResourceExpander.tsx#L25-L49).
- **Why it matters:** Tree depth, rendered row count and keyboard interaction are
  separate support claims.

## calendar-tsx integration findings

These findings describe the existing implementation at `c6de41e`. They are not
accepted changes to D34 or a proposed API contract.

### 10. Resource inputs and layout models have no hierarchy

- **What:** `Calendar_Resource` has `id`, `title`, required `availability` and
  generic `data`. Calendar derivation passes the resource array directly into
  layout input. Timeline rows have an optional resource and event geometry, but
  no parent, depth, child or expansion fields. D34 explicitly excludes nested
  resources. Empty resource availability means unavailable, including on a
  prospective parent resource.
- **Where:** `packages/core/src/calendar/calendar.types.ts:20`;
  `packages/core/src/calendar/calendar.ts:168`;
  `packages/core/src/layouts/timeline/timeline.types.ts:67`;
  `packages/core/src/layouts/timeline/timeline.ts:119`; `docs/design.md:991`.
- **Why it matters:** Indenting resource labels alone would not establish a tree
  contract, descendant visibility or parent scheduling semantics.

### 11. Every resource layout currently follows the supplied array

- **What:** Timeline maps resource inputs to rows. TimeGrid and DayGrid combine
  resources with dates in the configured grouping order. Resource agendas map
  resources to sections or grouped days, then omit every empty event group.
  D44 and D47 preserve consumer resource order; there is no resource comparator.
- **Where:** `packages/core/src/layouts/timeline/timeline.ts:191`;
  `packages/core/src/layouts/time-grid/time-grid.ts:225`;
  `packages/core/src/layouts/day-grid/day-grid.ts:75`;
  `packages/core/src/layouts/list/list.ts:48`; `docs/design.md:1226`;
  `docs/design.md:1258`.
- **Why it matters:** Hierarchical ordering affects all four layouts. In agendas,
  a parent with no directly assigned events currently disappears even when a
  child has events. FullCalendar's ancestor-preserving filter is different.

### 12. Assignment and scheduling use direct resource IDs

- **What:** Foreground events match exact `resourceIds`; unscoped background
  events match every resource. Availability constraints find resources directly
  in interaction input. Overlap validation compares assigned IDs, without
  ancestry. Interaction input comes from calendar options, independently of
  layout decoration.
- **Where:** `packages/core/src/layouts/shared/columns.ts:7`;
  `packages/core/src/layouts/timeline/timeline.ts:30`;
  `packages/core/src/features/constraints/validation.ts:59`;
  `packages/core/src/features/constraints/validation.ts:67`;
  `packages/core/src/features/interaction/interaction-feature.ts:24`.
- **Why it matters:** A layout-only nested-input parser would leave descendants
  absent from scheduling lookups. Resource visibility and resource existence are
  distinct concerns. Parent capacity, inherited availability and descendant
  conflicts have no existing contract.

### 13. Feature decoration does not cover all geometry derivation

- **What:** Features can transform events and decorate a completed layout; no
  resource preparation stage exists. Timeline movement previews call the timeline
  builder directly with `input.resources`, bypassing model decorators. Selection
  previews instead use the existing model's rows. Hit location also resolves
  against that model.
- **Where:** `packages/core/src/features/feature.types.ts:42`;
  `packages/core/src/calendar/calendar.ts:157`;
  `packages/core/src/layouts/timeline/timeline-interactions.ts:32`;
  `packages/core/src/layouts/timeline/timeline-interactions.ts:75`.
- **Why it matters:** Removing collapsed rows in a decorator would not by itself
  keep event previews consistent with visible rows. Normal layout, hit location
  and projection have separate call paths today.

### 14. Feature state supports expansion ownership, but sessions have distinct dependencies

- **What:** Feature slices support internal state, controlled state and external
  atoms. Controlled writes wait for the consumer's next state input, and the
  selection feature explicitly emits its change callback. Interaction refresh
  checks view, date, zone, event/resource/view references and declared interaction
  dependencies. It does not compare arbitrary feature state. Options changes
  trigger refresh; a standalone internal feature-state write has no equivalent
  universal session-refresh hook.
- **Where:** `packages/core/src/features/feature-runtime.ts:34`;
  `packages/core/src/features/date-selection/date-selection-feature.ts:52`;
  `packages/core/src/features/interaction/interaction-runtime.ts:163`;
  `packages/core/src/features/interaction/interaction-feature.ts:41`.
- **Why it matters:** Expansion state ownership has an existing precedent, while
  collapsing a source or target during an active gesture has no defined policy
  or automatic dependency tracking.

### 15. Bindings expose flat rows and consumer-owned resource content

- **What:** React and Solid render Timeline as a labelled region with separate
  row, resource-cell and lane parts. Existing rows expose resource IDs and
  unavailable state. They provide no expansion control, depth geometry or tree
  semantics. The base theme uses flat sibling rows sharing a two-column subgrid.
- **Where:** `packages/react/src/views/timeline/timeline-view.tsx:30`;
  `packages/react/src/views/timeline/timeline-view.tsx:124`;
  `packages/solid/src/views/timeline/timeline-view.tsx:28`;
  `packages/themes/base.css:265`; `docs/design.md:401`.
- **Why it matters:** Both adapters and the theme participate in visible nesting.
  FullCalendar's treegrid roles do not establish an appropriate keyboard contract
  for this library's D15 native-button interaction model.

## Verification

- All 30 unique external page URLs returned HTTP 200. Source line anchors were
  checked against the local tagged source; upstream tests were not executed.
- Local source references were checked for existing paths and line bounds.
- The report was formatted and checked with the installed Oxfmt 0.70.0 binary
  from the main checkout, using a temporary JSON copy of this worktree's
  `vite.config.ts` formatting configuration.
- The standard formatting script did not complete. `pnpm run fix:format
reports/fullcalendar-nested-resources.md` attempted automatic dependency
  restoration and failed fetching packages: `dns error: failed to lookup address
information: nodename nor servname provided, or not known`. It was interrupted
  with exit 130. Direct Vite+ formatting from this worktree then failed with
  `Cannot find package 'vite-plus'`; running from the main checkout failed writing
  its config cache with `EPERM: operation not permitted`. Direct Oxfmt completed
  without either dependency restoration or a Vite config cache write.
- Build, workspace checks, runtime tests and browser verification were not run
  because this change contains research documentation only.
