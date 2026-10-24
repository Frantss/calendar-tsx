import type {} from './third-party/priority';
import { Temporal } from 'temporal-polyfill';
import { createCalendar } from '../../src/calendar.ts';
import { createCalendarViews, listView, timeGridView } from '../../src/calendar-views.ts';
import type { Calendar_Api, Calendar_Options, Calendar_State } from '../../src/calendar.types.ts';
import { createTypedRuntime, type PrototypeOptions, type ValidateDependencies } from './feature-types.ts';
import {
  constraintsFeature,
  dateSelectionFeature,
  eventMoveFeature,
  eventResizeFeature,
  interactionFeature,
  type Snapshot,
} from './operations.ts';

const date = Temporal.PlainDate.from('2026-10-23');
const target = { kind: 'timed', at: date.toZonedDateTime('UTC') } as const;
const both = createCalendarViews({
  week: timeGridView({
    days: 7,
    features: { eventMoveFeature, constraintsFeature, dateSelectionFeature, interactionFeature },
    selection: { enabled: true },
    movement: { enabled: true },
  }),
  list: listView({ days: 7 }),
});
const base = {
  timeZone: 'UTC',
  date,
  onNavigate: () => {},
  events: [],
  view: 'week' as const,
  views: both.views,
  features: both.features,
};
const api = createTypedRuntime(base);
api.selection.begin(target);
api.move.begin('appointment');
api.interactions.cancel(1);
const checkD29Api = (value: Calendar_Api<typeof both.views, typeof both.features>) => {
  value.selection.evaluate(target, target);
  value.move.evaluate('appointment', target);
};
void checkD29Api;

const selectionOnly = createCalendarViews({
  day: timeGridView({ days: 1, features: { dateSelectionFeature, interactionFeature } }),
});
const selectApi = createTypedRuntime({
  ...base,
  views: selectionOnly.views,
  features: selectionOnly.features,
  view: 'day',
});
selectApi.selection.begin(target);
// @ts-expect-error movement must remain absent in a selection-only calendar
selectApi.move.begin('appointment');
// @ts-expect-error runtime controls must not expose a back door to disabled operations
selectApi.interactions.begin({ kind: 'move', eventId: 'appointment' });

const movementOnly = createCalendarViews({
  day: timeGridView({ days: 1, features: { eventMoveFeature, interactionFeature } }),
});
const moveApi = createTypedRuntime({
  ...base,
  views: movementOnly.views,
  features: movementOnly.features,
  view: 'day',
});
moveApi.move.begin('appointment');
// @ts-expect-error selection must remain absent in a movement-only calendar
moveApi.selection.begin(target);

const display = createCalendarViews({ day: timeGridView({ days: 1 }) });
type DisplayOptions = Calendar_Options<unknown, unknown, typeof display.views, typeof display.features>;
const displayOptions: DisplayOptions = { ...base, ...display, view: 'day' };
// @ts-expect-error unregistered selection contributes no calendar option
displayOptions.selection = { enabled: true };
// @ts-expect-error unregistered movement contributes no callback
displayOptions.onEventMove = () => {};
// @ts-expect-error unregistered runtime contributes no ownership setting
displayOptions.interactionOwnership = { mode: 'internal' };
// @ts-expect-error unregistered constraints contribute no settings
displayOptions.constraints = { preventOverlap: true };
type DisplayState = Calendar_State<unknown, unknown, typeof display.views, typeof display.features>;
const checkState = (state: DisplayState) => {
  // @ts-expect-error selection state must remain absent without its feature
  void state.selectedRange;
};
void checkState;
// @ts-expect-error per-view settings must remain gated
timeGridView({ days: 1, selection: { enabled: true } });
// @ts-expect-error per-view movement settings must remain gated
timeGridView({ days: 1, movement: { enabled: true } });

const missing = createCalendarViews({ day: timeGridView({ days: 1, features: { dateSelectionFeature } }) });
// @ts-expect-error selection requires the runtime explicitly
createTypedRuntime({ ...base, ...missing, view: 'day' });
// @ts-expect-error view features cannot disappear from the calendar map
createTypedRuntime({ ...base, ...both, features: { interactionFeature } });
const wrongScope = createCalendarViews({
  day: timeGridView({ days: 1, features: { dateSelectionFeature } }),
  other: timeGridView({ days: 1, features: { interactionFeature } }),
});
// @ts-expect-error prerequisite registered in another view is inactive here
createTypedRuntime({ ...base, ...wrongScope, view: 'day' });
const globalRuntime = { ...missing.features, interactionFeature };
const globalCheck: ValidateDependencies<typeof missing.views, typeof globalRuntime> = {};
void globalCheck;
createTypedRuntime({ ...base, ...missing, features: globalRuntime, view: 'day' });

type Data = { title: string };
type BothOptions = PrototypeOptions<Data, unknown, typeof both.views, typeof both.features>;
const options: BothOptions = {
  ...base,
  onEventMove: proposal => {
    const title: string = proposal.after.data.title;
    void title;
    // @ts-expect-error callback preserves the consumer's event data shape
    void proposal.after.data.missing;
  },
  onSelectionChange: range => {
    if (range.kind === 'allDay') {
      const day: Temporal.PlainDate = range.start;
      void day;
    } else {
      const instant: Temporal.ZonedDateTime = range.start;
      void instant;
    }
    // @ts-expect-error a range does not fabricate consumer event data
    void range.data;
  },
  interactionOwnership: {
    mode: 'controlled',
    read: () => ({ session: null, candidate: null, outcome: null }),
    onChange: next => {
      const snapshot: Snapshot = next;
      void snapshot;
    },
  },
};
options.interactionOwnership = {
  mode: 'external',
  atom: { state: { session: null, candidate: null, outcome: null }, setState: () => {} },
};
options.interactionOwnership = {
  mode: 'controlled',
  read: () => ({ session: null, candidate: null, outcome: null }),
  onChange: () => {},
  // @ts-expect-error exactly one transient state owner
  atom: { state: null, setState: () => {} },
};
// @ts-expect-error controlled ownership must provide the write notification
options.interactionOwnership = { mode: 'controlled', read: () => ({ session: null, candidate: null, outcome: null }) };
options.state = { selectedRange: null };
// @ts-expect-error persistent state still uses the range discriminant
options.state = { selectedRange: { kind: 'timed', start: date, end: date } };
// @ts-expect-error external persistent slices still preserve their type
options.atoms = { selectedRange: { state: 'bad', setState: () => {} } };

const inferred = createTypedRuntime({
  ...base,
  events: [{ id: 'a', kind: 'allDay', start: date, data: { title: 'Appointment' } }],
  onEventMove: proposal => {
    const title: string = proposal.after.data.title;
    void title;
    // @ts-expect-error callback inference must not become any
    const bad: number = proposal.after.data.title;
    void bad;
  },
});
void inferred;
const inferredResult = inferred.move.evaluate('a', target);
if (inferredResult.status === 'valid') {
  const title: string = inferredResult.proposal.after.data.title;
  void title;
  // @ts-expect-error the feature API preserves the inferred data type
  const wrong: number = inferredResult.proposal.after.data.title;
  void wrong;
}

const checkErasedApi = (existing: Calendar_Api<typeof both.views, typeof both.features>) => {
  const result = existing.move.evaluate('appointment', target);
  if (result.status === 'valid') {
    // @ts-expect-error omitting payload type arguments keeps unknown data
    void result.proposal.after.data.title;
  }
};
void checkErasedApi;

const calendar = createCalendar({
  ...base,
  events: [{ id: 'appointment', kind: 'allDay', start: date, data: { title: 'Appointment', bookingId: 42 } }],
  onEventMove: proposal => {
    const title: string = proposal.after.data.title;
    void title;
    // @ts-expect-error callback payloads stay precise alongside API results
    const wrong: number = proposal.before.data.title;
    void wrong;
  },
});
const productionResult = calendar.api.move.evaluate('appointment', target);
if (productionResult.status === 'valid') {
  const before: string = productionResult.proposal.before.data.title;
  const after: number = productionResult.proposal.after.data.bookingId;
  void before;
  void after;
  // @ts-expect-error movement results must not widen event payloads to any
  const wrong: number = productionResult.proposal.after.data.title;
  void wrong;
  // @ts-expect-error movement results expose only the consumer's payload fields
  void productionResult.proposal.before.data.missing;
}
const typedApi: Calendar_Api<typeof both.views, typeof both.features, { title: string; bookingId: number }> =
  calendar.api;
void typedApi;

const resizeOnly = createCalendarViews({
  day: timeGridView({ days: 1, features: { eventResizeFeature, interactionFeature }, resizing: { enabled: true } }),
});
const resizeApi = createTypedRuntime({
  ...base,
  ...resizeOnly,
  view: 'day',
  events: [{ id: 'appointment', kind: 'allDay', start: date, data: { title: 'Appointment' } }],
  onEventResize: proposal => {
    const title: string = proposal.after.data.title;
    const edge: 'start' | 'end' = proposal.edge;
    void title;
    void edge;
    // @ts-expect-error resize callbacks retain the consumer payload
    void proposal.before.data.missing;
  },
});
resizeApi.resize.begin('appointment', 'end');
const resized = resizeApi.resize.evaluate('appointment', 'start', target);
if (resized.status === 'valid') {
  const title: string = resized.proposal.after.data.title;
  void title;
  // @ts-expect-error resize results must not become any
  const wrong: number = resized.proposal.before.data.title;
  void wrong;
}
// @ts-expect-error resizing is independently registered
void resizeApi.move;
// @ts-expect-error resizing does not expose selection
void resizeApi.selection;
// @ts-expect-error shared controls cannot start another operation
resizeApi.interactions.begin({ kind: 'move', eventId: 'appointment' });
// @ts-expect-error only event edges can be resized
resizeApi.resize.begin('appointment', 'middle');
// @ts-expect-error movement does not imply resize
void moveApi.resize;
// @ts-expect-error selection does not imply resize
void selectApi.resize;
// @ts-expect-error absent resize feature contributes no view setting
timeGridView({ days: 1, resizing: { enabled: true } });
// @ts-expect-error absent resize feature contributes no callback
displayOptions.onEventResize = () => {};
const missingResizeRuntime = createCalendarViews({ day: timeGridView({ days: 1, features: { eventResizeFeature } }) });
// @ts-expect-error resize requires the shared runtime, independently of movement and selection
createTypedRuntime({ ...base, ...missingResizeRuntime, view: 'day' });

const checkMixedOperationMap = (runtime: import('./runtime').Runtime) => {
  runtime.evaluate({ kind: 'priority', eventId: 'a', reason: 'Customer request' }, { kind: 'priority', value: 'high' });
  // @ts-expect-error custom operation cannot use a built-in target
  runtime.evaluate({ kind: 'priority', eventId: 'a', reason: 'Customer request' }, target);
  // @ts-expect-error built-in operation cannot use a custom target
  runtime.evaluate({ kind: 'move', eventId: 'a' }, { kind: 'priority', value: 'high' });
};
void checkMixedOperationMap;
