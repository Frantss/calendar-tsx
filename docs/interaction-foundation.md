# Interaction foundation

Status: **proposal for discussion**, based on `fd13cd8`. Production interaction runtime and interfaces are unchanged.
A [selection/movement/resizing prototype](../packages/core/prototypes/interaction-foundation/readme.md) exercises the shared
lifecycle and compiles its feature-type sketch. Examples below remain conceptual unless linked to that sketch.
The extension uses real time-grid/timeline geometry and both adapters' public hooks and parts. The
[adapter context typing gap](../reports/interaction-foundation.md#6-adapter-context-erasure-retains-required-feature-state)
is resolved: providers accept calendars without selection while instance types retain feature gating.

Related decisions: [D2](design.md#d2--events-are-input-with-unique-ids-managed-event-state-is-an-opt-in-helper),
[D29](design.md#d29--functionality-is-added-through-a-feature-map-views-declare-the-features-they-use),
[D40](design.md#d40--time-grids-and-timelines-use-a-fixed-24-hour-clock-axis-across-dst).
Evidence: [FullCalendar interactions](../reports/fullcalendar-event-interactions.md) and
[current implementation limits](../reports/interaction-foundation.md).

## Intent and fixed choices

Extend D29 so selection, constraints, movement, resizing and input drivers can be registered independently.
Retain feature constants, explicit registration, per-view activation and feature-gated types. Rendering-only
calendars must not install interaction listeners. Programmatic operations must work without a browser.

- Events remain consumer input. Interaction completion emits a proposal; it never writes the event array.
- Selection chooses a range; it does not create an event or depend on movement/resizing.
- Geometry remains in core. DOM measurement and gesture recognition stay outside core.
- Existing event kinds, inclusive all-day ends, time-zone handling and D40 clock coordinates remain authoritative.
- This proposal does not add recurrence, fetching, popovers or an application transaction manager.

## Modules and seams

| Module                    | Responsibility                                                                                | Interface consumed by other modules                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Interaction runtime       | Session ownership, candidate evaluation, preview derivation and completion/cancellation       | Begin, update, commit, cancel and evaluate; readonly interaction store |
| Layout interaction module | Convert layout-local positions into semantic targets; project proposals into preview geometry | Optional `locate` and `project` layout capabilities                    |
| Operation features        | Define what selection, move, resize, creation or transfer means                               | Pure proposal construction plus operation-specific completion behavior |
| Constraint feature        | Evaluate configured scheduling rules against a proposal and current inputs                    | Synchronous acceptance/rejection with reason codes                     |
| DOM input module          | Surface measurement, pointer/touch activation, capture, scrolling and drag coordination       | Mounted driver contributions and cleanup                               |
| React/Solid adapters      | Connect the DOM input module to existing refs/render props and framework lifecycles           | Opt-in interaction hooks/parts                                         |

The runtime hides session bookkeeping behind a small interface. Operation features do not coordinate through DOM
events or directly mutate another feature's state. The DOM input module is shared by React and Solid; framework
hooks manage its lifetime. Whether that shared module needs its own published package is a packaging decision,
not a prerequisite for the behavioral design.

## Opt-in features

| Proposed feature       | Contribution                                                          | Required features                               |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `interactionFeature`   | Shared runtime and transient store                                    | None                                            |
| `constraintsFeature`   | Scheduling-policy checks                                              | Interaction                                     |
| `dateSelectionFeature` | Range proposal, selected-range state and selection notifications      | Interaction                                     |
| `eventMoveFeature`     | Event movement proposals and move notifications                       | Interaction                                     |
| `eventResizeFeature`   | Start/end resize proposals and resize notifications                   | Interaction                                     |
| `pointerFeature`       | Pointer gesture transport and activation                              | Interaction                                     |
| `touchFeature`         | Touch activation/scroll arbitration for pointer transport             | Pointer                                         |
| `autoScrollFeature`    | Edge scrolling during an active pointer session                       | Pointer                                         |
| `externalDropFeature`  | External source metadata, creation proposals and receiving behavior   | Interaction and pointer                         |
| `crossCalendarFeature` | Coordination between registered calendar hosts and transfer proposals | Interaction and pointer; movement on the source |

The foundation always enforces structural validity: valid dates, positive ranges, an existing source event and an
enabled operation. Scheduling restrictions are contributed by `constraintsFeature`. Resource reassignment and
timed/all-day conversion can initially be settings of the move operation; they do not require a feature per flag.

All features remain in the explicit feature map. DOM contributions are interpreted only by a mounted DOM host;
core does not import or invoke them. A typed feature-extension interface lets the DOM module own those contribution
types without placing `HTMLElement` or browser events in core's interfaces.

Registering an operation provides its programmatic interface. Mounting its bindings with a registered input driver
enables gestures. Thus a calendar can have selection without movement, resizing without movement, or programmatic
movement without any pointer listeners.

## Registration and activation

D29 already resolves feature implementations and activates them per view. Extend that mechanism with explicit
prerequisite metadata and a typed interaction contribution slot; do not add another general plugin registry.

- Validate prerequisites in types and at creation for JavaScript consumers. Reject cycles or missing prerequisites.
- Require prerequisites to be active in the participating view, or calendar-wide under D29's existing rules.
- Read all descriptors before constructing the interaction runtime. Construction order must not depend on spread order.
- Keep existing ordering semantics for existing event/decorate stages. Interaction validators form a conjunction;
  they do not transform proposals or depend on registration order for acceptance.
- A feature absent from the map contributes no actions, settings, listeners or state. No transitive imports silently
  register behavior. Replacements resolve through the same keys as existing layout-feature replacements.
- Third-party views can provide the layout capabilities. Unsupported capabilities produce an unavailable result,
  rather than guessed coordinates or a fallback to another view's geometry.

The feature context needs readonly access to the resolved feature descriptors and a current calendar snapshot.
Those are command-time reads. A derived interaction preview must not write calendar options or feature state while
the base calendar model is deriving.

## Shared runtime interface

Conceptual internal interface, with intent/proposal types supplied through feature maps:

```ts
interactions.begin(intent); // returns a session token
interactions.update(token, target); // updates the candidate
interactions.commit(token); // revalidates and emits the feature's result
interactions.cancel(token, reason);
interactions.evaluate(intent, target); // same proposal/validation path, without starting a gesture
interactions.store; // readonly session, candidate, validity and preview
```

The prototype exposes operation entry points through their owning features (`selection.begin/evaluate` and
`move.begin/evaluate`). Shared public controls expose update, commit, cancel and observation. An unrestricted public
`begin(intent)` would otherwise admit movement through a selection-only calendar's interaction API. Production
`Calendar_Api_FeatureMap<TData, TResourceData>` now carries consumer payload types into feature APIs. The prototype
uses that map directly; movement results retain event data through core, React and Solid instances.

One calendar has at most one active draft session. A second begin returns a busy result instead of replacing the
first session implicitly. Tokens make late pointer-up events, expired timers and callbacks from an older session
harmless. Persistent selected-range state can coexist with an active event-edit session; it is not the session lock.

The lifecycle is idle → active → completed/cancelled → idle. While active, the candidate may be valid, rejected or
unavailable. Invalid candidates never emit an edit proposal. Programmatic feature methods use the same evaluator;
there is no accidental constraint bypass for programmatic selection.

Completion rechecks the latest inputs. An unrelated event arriving can change validation. A changed/removed source
event cancels instead of overwriting it with a stale snapshot. View/date/time-zone changes, host unmount and loss of
a required surface cancel the session. Cancellation publishes a reason and releases input-driver resources.

## State and performance

Use a dedicated transient store owned by `interactionFeature`. Raw pointer coordinates, timers and measured DOM
rectangles belong to the DOM input module. Only a changed semantic target reaches the core runtime; repeated moves
inside the same snapped position do not publish another candidate.

The interaction snapshot derives from the base calendar snapshot, draft intent and target. Preview subscribers
observe that store. Ordinary event normalization, ordering and base layout must not rerun just because a pointer
moved. This avoids routing draft updates through today's `Calendar_FeatureContext.setState`, whose state slices
participate in the base calendar derivation.

This is a proposed amendment to D29 for transient interaction state. Preserve internal, controlled and external-atom
ownership choices at the interaction-store seam. The prototype compiles a discriminated ownership option and requires
controlled hosts to echo requested snapshot objects. Token leases stay runtime-owned so delayed writes cannot permit
competing sessions or duplicate completion; adapter subscription behavior remains unproved. Persistent
feature state, such as the accepted selection, can continue to use D29's existing state mechanism. There must be one
authoritative owner for each slice rather than mirroring it between the two stores.

## Layout targets and previews

DOM measurement identifies a surface and an offset within it. Core interprets that position using the layout's
model and settings. A month day, a time-grid column/all-day row and a timeline resource lane have different surface
descriptions, while drivers use the same target interface.

- `locate` returns a semantic date/time target and optional resource, with no DOM references.
- `project` returns the layout's preview geometry for a semantic proposal, using the same D40 axis as events,
  backgrounds and the now indicator.
- Logical intervals and event identity remain distinct from displayed geometry. Minimum event sizes, lane expansion
  and repeated-hour visual collisions do not redefine booking-conflict intervals.
- Previews are separate geometry with an optional reference to an event. Selection previews do not fabricate an
  event id or a `TData` payload. The original event can be marked as the source without replacing consumer data.

Initial preview policy: draw separate overlay geometry and retain the base layout. Repacking neighboring events
during a drag is a possible later preview policy, not a reason to change event input or couple selection to events.

D40's mapping is not invertible at DST transitions. `locate` must retain the local clock target and any ambiguous
instant choices. Proposed policy: reject nonexistent local times; for movement preserve the source offset when it
matches a repeated-time candidate, otherwise choose the earlier occurrence. Explicit programmatic instants remain
unambiguous. This policy needs agreement before implementing target resolution; it is not already settled by D40.

## Proposals, validation and ownership

Each operation constructs a typed proposal from the original input and target. A move proposes replacement event
bounds/resources; a resize proposes a changed edge; selection proposes a range. External creation and transfers have
their own proposal kinds. An open operation map allows additional kinds without central `switch` edits.

Constraints receive semantic proposals, relevant resource data and current supplied events, including relevant
background entries if the policy uses them. They do not inspect only rendered/filtered foreground segments. Interval
helpers may use exclusive internal ends while preserving the existing inclusive public all-day contract.

Rules are synchronous and side-effect free. Rejection contains stable reason codes suitable for rendering by the
consumer. Positive range/date validity is mandatory; overlap, allowed-window and resource restrictions are optional
scheduling policies. Missing/truncated application data cannot establish availability beyond the supplied inputs.

Commit emits the operation's callback and clears the draft. The consumer applies accepted event changes to its own
cache/store and passes updated input. The initial policy retains no pending optimistic event after emission.
Async saving, retries and rejection UI remain consumer-owned; no FullCalendar-style mutation/revert of input exists.

A cross-calendar operation produces one transfer proposal containing both source removal and destination addition.
The application owns applying both sides. The coordinator does not emit independent mutation commands that can each
be applied twice by separate hosts. Cancellation, source identity and destination validation remain explicit.

## Composition example

Proposed names; configuration and imports will be finalized by the type sketch:

```ts
const views = createCalendarViews({
  week: timeGridView({
    days: 7,
    features: {
      interactionFeature,
      dateSelectionFeature,
      eventMoveFeature,
      constraintsFeature,
      pointerFeature,
      touchFeature,
      autoScrollFeature,
    },
  }),
  list: listView({ days: 7 }),
});
```

The list remains inactive for these interactions. Adding `eventResizeFeature` enables resizing independently.
React/Solid interaction bindings attach surfaces and operation sources through refs/render props. Existing display
parts do not automatically mount drivers. The feature map alone is sufficient for programmatic use; gesture use
also mounts the optional adapter bindings.

## Alternatives considered

| Approach                                                          | Benefit                                                 | Cost / conclusion                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| One feature containing every interaction                          | Short initial integration                               | Couples selection, resizing, drivers and constraints; reject for the requested independent opt-in behavior                                         |
| Independent features with duplicated gesture/session code         | Minimal shared interface                                | Repeats hit-testing, cancellation and validation; reject because fixes would spread across features and adapters                                   |
| Reuse only current D29 state/events/decorate hooks                | Smallest initial core change                            | Draft updates invalidate base layout, selection has no event payload, and there is no input lifetime or shared target contract; insufficient alone |
| Dedicated runtime plus typed contributions and layout/input seams | Shared lifecycle with independently registered behavior | Requires a small D29 extension and transient-store/adapter integration; recommended                                                                |

## Next proof and unresolved decisions

First prove two independent operations against the same runtime: programmatic/pointer range selection and event
movement in a time grid. Exercise timeline geometry as the second layout and Solid as the second adapter before
calling the seams general. The resize extension now exercises edge semantics without a separate lifecycle.

The proof should cover feature-gated types and prerequisites, inactive views, no mounted listeners without drivers,
programmatic/gesture validation equivalence, stale tokens, source changes, controlled/external state ownership,
preview isolation from base layout derivation, cleanup and DST gap/fold targets. Verify unrelated input references
and actual event timestamps remain unchanged by a draft.

Before implementation, agree the proposed DST target policy, overlay-only preview policy, clear-on-emission commit
policy and transient-store ownership amendment. The prototype verifies the selection/movement feature types and
shared lifecycle against TypeScript 7.0.2 and browser walkthroughs. The extension exercises real projection, DOM
measurement, framework subscriptions/lifetimes and controlled selection wiring. Source and built-declaration checks
verify display-only, movement-only and selection-enabled calendars in both adapters. Production
construction/capability registration, third-party operation extensibility and bundle
guarantees remain unproved. No production interaction feature is marked implemented.

The independent resize proof registers only `interactionFeature` and `eventResizeFeature`, with optional constraints.
It reuses session ownership, source-change cancellation, validation and event projection. Both edges retain payloads,
resources and the fixed bound. Timed crossing is rejected; all-day ends remain inclusive, with an omitted end fixed
at the original start. These are prototype choices, pending production agreement. Resize-only type checks and real
pointer runs cover core, time-grid/timeline geometry, React/Solid providers and all three ownership modes. Movement
and selection remain unavailable, with no registered selection state. See the prototype's resize verification for
scope and evidence. No production resizing feature is marked implemented.
