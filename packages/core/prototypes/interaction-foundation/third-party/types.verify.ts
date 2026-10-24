import { Temporal } from 'temporal-polyfill';
import { createCalendarViews, timeGridView } from '../../../src/calendar-views.ts';
import { createTypedRuntime } from '../feature-types';
import { interactionFeature } from '../interaction-feature';
import { defineOperation, type OperationKind, type Proposal, type Runtime } from '../runtime';
import { eventPriorityFeature, type PriorityProposal, type PriorityTarget } from './priority';

const date = Temporal.PlainDate.from('2026-10-23');
const views = createCalendarViews({
  day: timeGridView({ days: 1, features: { interactionFeature, eventPriorityFeature }, priority: { enabled: true } }),
});
const options = {
  ...views,
  date,
  timeZone: 'UTC',
  view: 'day' as const,
  onNavigate: () => {},
  events: [{ id: 'a', kind: 'allDay' as const, start: date, data: { title: 'Appointment', bookingId: 42 } }],
};
const api = createTypedRuntime({
  ...options,
  onPriorityChange: proposal => {
    const id: number = proposal.event.data.bookingId;
    void id;
    // @ts-expect-error callback retains the event data type
    void proposal.event.data.missing;
  },
});
api.priority.begin('a', 'Customer request');
const result = api.priority.evaluate('a', 'Customer request', { kind: 'priority', value: 'high' });
if (result.status === 'valid') {
  const title: string = result.proposal.event.data.title;
  const mapped: Proposal<{ title: string; bookingId: number }, 'priority'> = result.proposal;
  const external: PriorityProposal<{ title: string; bookingId: number }> = mapped;
  void title;
  void external;
  // @ts-expect-error result must not widen to any
  const wrong: number = result.proposal.event.data.title;
  void wrong;
}
// @ts-expect-error registration does not add selection
void api.selection;
// @ts-expect-error registration does not add movement
void api.move;
// @ts-expect-error registration does not add resizing
void api.resize;
// @ts-expect-error independent operation requires its custom target
api.priority.evaluate('a', 'Customer request', { kind: 'allDay', at: date });
// @ts-expect-error custom intent requires a reason
api.priority.begin('a');
// @ts-expect-error common controls cannot start unregistered operations
api.interactions.begin({ kind: 'move', eventId: 'a' });
// @ts-expect-error absent feature contributes no per-view settings
timeGridView({ days: 1, priority: { enabled: true } });
const missing = createCalendarViews({ day: timeGridView({ days: 1, features: { eventPriorityFeature } }) });
// @ts-expect-error extension declares its shared-runtime prerequisite
createTypedRuntime({ ...options, ...missing });
const display = createCalendarViews({ day: timeGridView({ days: 1 }) });
// @ts-expect-error absent feature contributes no callback
createTypedRuntime({ ...options, ...display, onPriorityChange: () => {} });
const checkRuntime = (runtime: Runtime) => {
  const value = runtime.evaluate(
    { kind: 'priority', eventId: 'a', reason: 'Customer request' },
    { kind: 'priority', value: 'low' },
  );
  if (value.status === 'valid') {
    const proposal: PriorityProposal = value.proposal;
    void proposal;
  }
  // @ts-expect-error target is correlated with the intent kind
  runtime.evaluate({ kind: 'priority', eventId: 'a', reason: 'Customer request' }, { kind: 'allDay', at: date });
};
void checkRuntime;
defineOperation({
  kind: 'priority',
  acceptsTarget: (_target: unknown): _target is PriorityTarget => true,
  // @ts-expect-error a descriptor cannot return a different operation's result
  create: () => ({ status: 'valid', proposal: { kind: 'foreign' } }),
});

// This config must compile without loading the built-in operation declarations.
const externalKind: OperationKind = 'priority';
void externalKind;
// @ts-expect-error no built-in operation is in the isolated import graph
const builtinKind: OperationKind = 'move';
void builtinKind;
