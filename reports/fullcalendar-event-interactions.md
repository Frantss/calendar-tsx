# FullCalendar event interactions

## Source check: 2026-10-23, FullCalendar v7.1.3

Scope: the shared interaction foundation, validation, date selection, event manipulation, and extended input.
Implementation references use the exact `v7.1.3` tags in
[FullCalendar](https://github.com/fullcalendar/fullcalendar/tree/v7.1.3) and its
[Premium workspace](https://github.com/fullcalendar/fullcalendar-workspace/tree/v7.1.3).
The tagged source archives were inspected locally; critical validation and callback-order snippets were also fetched
independently through GitHub. These are source-derived findings, not an executed upstream browser test run.

### 1. Shared foundation converts pointer coordinates into semantic hits

- **What:** `HitDragging` queries registered calendar components for a hit containing a date span, all-day status,
  rectangle, layer and context. It accounts for clipping, scrolling, RTL and obscuring elements. The component
  supplies the view-specific conversion from pixels to date/resource positions. TimeGrid divides slots into
  `snapDuration` steps; the default is `slotDuration`, and a non-dividing override falls back to that duration.
- **Where:** [`HitDragging.ts:25`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/HitDragging.ts#L25),
  [`hit.ts:9`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interactions/hit.ts#L9),
  [`TimeGridCols.tsx:110`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/timegrid/components/TimeGridCols.tsx#L110);
  [snapDuration documentation](https://fullcalendar.io/docs/snapDuration).
- **Why it matters:** moving, resizing and selecting share hit-testing, but their meanings differ. A visual slot
  height alone does not define the interaction precision.

### 2. Preview state is separate from the committed event store

- **What:** dragging builds an `EventInteractionState` containing affected original events and proposed mutated
  events. Each hit produces and validates a candidate mutation. Rendering uses transient drag/resize state;
  invalid destinations remove the valid candidate. A low-level pointer-following mirror supplements the
  view-rendered preview and can animate back. Mouse distance and touch delay gate intentional dragging.
- **Where:** [`EventDragging.ts:148`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventDragging.ts#L148),
  [`FeaturefulElementDragging.ts:14`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/dnd/FeaturefulElementDragging.ts#L14),
  [`event-interaction-state.ts`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interactions/event-interaction-state.ts).
- **Why it matters:** an event preview is not an edit already saved to application storage. An invalid drop and a
  later server failure happen at different stages.

### 3. Permission to edit and permission to occupy a destination are separate checks

- **What:** editability controls whether movement, duration changes or resource reassignment can happen.
  Destination validation first checks `validRange`, then constraint containment, overlap rules and finally allow
  callbacks. Constraints can name `businessHours`, an event `groupId`, or explicit/recurring allowed ranges.
  Every applicable constraint must pass. Business-hour shading alone does not enable enforcement.
- **Where:** [`validation.ts:23`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/validation.ts#L23),
  [`validation.ts:112`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/validation.ts#L112),
  [`validation.ts:246`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/validation.ts#L246);
  [eventConstraint](https://fullcalendar.io/docs/eventConstraint), [eventAllow](https://fullcalendar.io/docs/eventAllow).
- **Why it matters:** “editable” is an operation permission, not a scheduling policy. `eventAllow` and `selectAllow`
  are synchronous candidate checks; they do not await a server decision.

### 4. Logical overlap validation is distinct from visual overlap layout

- **What:** validation removes affected original instances before checking proposed instances against other events.
  Both the moving event's and stationary event's overlap settings can prohibit an intersection; a callback can
  also reject it. Event and selection policies are separate. FullCalendar counts same-date timed/all-day
  intersections and background events for these rules, even when their rendered regions look separate.
- **Where:** [`validation.ts:97`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/validation.ts#L97),
  [`validation.ts:181`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/validation.ts#L181);
  [eventOverlap](https://fullcalendar.io/docs/eventOverlap), [selectOverlap](https://fullcalendar.io/docs/selectOverlap).
- **Why it matters:** side-by-side placement and `slotEventOverlap` do not enforce booking conflicts.

### 5. Range selection chooses dates; it does not create an event

- **What:** pointer selection joins the initial and current hit into a range, validates it, stores selection state,
  and emits `select` on release. Ends are exclusive. `selectMirror` is a TimeGrid-only optional preview; ordinary
  selection highlighting remains separate. `unselect` clears the chosen range. Programmatic `select()` parses and
  dispatches the range directly and does not call the pointer-selection validator. Resource metadata identifies
  a selected resource, not a batch of newly created events.
- **Where:** [`DateSelecting.ts:67`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/DateSelecting.ts#L67),
  [`CalendarApiImpl.ts:297`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/api/CalendarApiImpl.ts#L297),
  [Premium `DateSelecting.ts:3`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/DateSelecting.ts#L3);
  [select](https://fullcalendar.io/docs/select-callback), [selectMirror](https://fullcalendar.io/docs/selectMirror).
- **Why it matters:** application code decides what a selected range does, including whether to open a form or add
  an event. Programmatic selection has a different validation path from pointer selection.

### 6. Move and resize are mutations with different edge semantics

- **What:** movement shifts start and end together; resizing changes one edge and prevents a nonpositive range.
  Start-edge resizing requires `eventResizableFromStart`. Timed/all-day movement changes the event's all-day
  status; `allDayMaintainDuration` controls duration handling and defaults to false. Related events with a
  nonempty shared `groupId` are included in the affected set. Premium resource movement changes the source
  resource assignment to the destination while retaining other assignments, subject to resource editability.
- **Where:** [`EventDragging.ts:444`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventDragging.ts#L444),
  [`EventResizing.ts:250`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventResizing.ts#L250),
  [`event-store.ts:55`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/structs/event-store.ts#L55),
  [Premium `EventDragging.ts:22`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/EventDragging.ts#L22);
  [allDayMaintainDuration](https://fullcalendar.io/docs/allDayMaintainDuration).
- **Why it matters:** a gesture can change several events or both time and resource; it is not always a single
  timestamp replacement.

### 7. Drop/resize notifications follow an optimistic local commit

- **What:** a valid same-calendar gesture merges candidate events into the internal store, emits `eventDrop` or
  `eventResize`, then emits `eventChange`. Callback data includes old/new events, related events, deltas and a
  `revert()` closure that restores the original event snapshot. Returning false from the notification is not the
  validation mechanism. The application may save asynchronously and invoke `revert()` on failure.
- **Where:** [`EventDragging.ts:265`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventDragging.ts#L265),
  [`EventResizing.ts:205`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventResizing.ts#L205);
  [eventDrop](https://fullcalendar.io/docs/eventDrop), [eventResize](https://fullcalendar.io/docs/eventResize),
  [eventChange](https://fullcalendar.io/docs/eventChange).
- **Why it matters:** candidate rejection happens before commit; persistence rollback happens after it. FullCalendar
  supplies local interaction state and callbacks, while the application owns its database transaction.

### 8. External drops and cross-calendar moves have distinct event lifecycles

- **What:** external `Draggable` or `ThirdPartyDraggable` feeds the same hit/validation pipeline. `dropAccept`
  filters source elements. `drop` reports a landing even with `create: false`; event data with creation enabled
  inserts an event and emits `eventReceive`. Cross-calendar event movement checks the receiving calendar's
  `editable` and `droppable`, removes from the source and adds to the receiver, with leave/remove and
  add/drop/receive notifications and separate revert closures.
- **Where:** [`ExternalElementDragging.ts:129`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions-external/ExternalElementDragging.ts#L129),
  [`EventDragging.ts:304`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventDragging.ts#L304);
  [external dragging](https://fullcalendar.io/docs/external-dragging),
  [dragging between calendars](https://fullcalendar.io/docs/other-calendar-dragging).
- **Why it matters:** external creation and moving an existing calendar event are different operations; moving
  between calendars is not an automatic transaction across two application backends.

### 9. Touch and scrolling are shared gesture infrastructure

- **What:** touch uses a long press, defaulting to 1000 ms, with separate event/selection overrides. Once an event
  is selected by touch, subsequent dragging need not wait again; touch resizing requires event selection.
  The shared drag implementation arbitrates scrolling versus dragging. `dragScroll` enables edge autoscrolling
  for dragging, resizing and selecting, and pointer/hit coordinates continue updating during scroll.
- **Where:** [`EventDragging.ts:96`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventDragging.ts#L96),
  [`EventResizing.ts:87`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/interactions/EventResizing.ts#L87),
  [`AutoScroller.ts:24`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/dnd/AutoScroller.ts#L24);
  [longPressDelay](https://fullcalendar.io/docs/longPressDelay), [dragScroll](https://fullcalendar.io/docs/dragScroll).
- **Why it matters:** touch editing and autoscroll extend every interaction rather than defining new event mutations.

### 10. Interaction support and resource support are separate modules

- **What:** v7's interaction module registers date clicking/selecting, event dragging/resizing and automatic
  unselection. Vanilla imports it from `fullcalendar/interaction`. Resource views and resource-specific validation
  come from Premium; Premium splits validation per resource and passes resource context to allow callbacks.
- **Where:** [`interaction-plugin/index.ts:9`](https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/preact/src/interaction-plugin/index.ts#L9),
  [Premium `validation.ts:4`](https://github.com/fullcalendar/fullcalendar-workspace/blob/v7.1.3/premium/packages/preact-scheduler/src/resource/validation.ts#L4);
  [editable](https://fullcalendar.io/docs/editable), [eventResourceEditable](https://fullcalendar.io/docs/eventResourceEditable).
- **Why it matters:** ordinary date/event interactions do not require Premium; resource-specific interactions rely
  on resource support in addition to the shared interaction machinery.
