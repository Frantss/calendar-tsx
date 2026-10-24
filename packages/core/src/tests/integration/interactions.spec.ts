import { interactionTestViews } from '#tests/support/interaction.setup';
import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it, vi } from 'vitest';
import { createCalendar } from '#calendar/calendar';
import { recurrenceFeature } from '#features/recurrence/recurrence-feature';
import { createRecurringEvent } from '#features/recurrence/recurrence-events';
import { calendarFeatures } from '#features/calendar-features';
import { timeGridView, listView, calendarViews } from '#views/views';
import { timeGridLayout } from '#layouts/layout-features';
import { dateSelectionFeature } from '#features/date-selection/date-selection-feature';
import { eventMoveFeature } from '#features/event-move/event-move-feature';
import { eventResizeFeature } from '#features/event-resize/event-resize-feature';
import { constraintsFeature } from '#features/constraints/constraints-feature';
import { interactionFeature } from '#features/interaction/interaction-feature';
import { interactionIdle } from '#features/interaction/interaction-runtime';
import type { Calendar_InteractionSnapshot, Calendar_InteractionStart, Calendar_OperationKind } from '#features/interaction/interaction.types';
import { eventPriorityFeature } from '#tests/support/priority';

const date = Temporal.PlainDate.from('2026-10-23');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${String(hour).padStart(2, '0')}:00` });
const target = (hour: number) => ({ kind: 'timed' as const, at: at(hour), resourceId: 'room' });
const event = { id: 'a', kind: 'timed' as const, start: at(9), end: at(10), resourceIds: ['room'], data: { title: 'Appointment', bookingId: 42 } };
const base = { date, timeZone: 'UTC', view: 'day' as const, events: [event], onNavigate: () => {} };
const operations = {
  eventResizeFeature: eventResizeFeature(),
  eventMoveFeature: eventMoveFeature(),
  dateSelectionFeature: dateSelectionFeature(),
  constraintsFeature: constraintsFeature(),
  interactionFeature: interactionFeature(),
};
const views = interactionTestViews({ day: timeGridView({ days: 1, features: operations }), list: listView({ days: 1 }) });
const setup = () => createCalendar({ ...base, ...views });
const start = <K extends Calendar_OperationKind, D>(value: Calendar_InteractionStart<K, D>) => {
  if (value.status !== 'active') throw new Error(`expected active; got ${value.status}`);
  return value.session;
};

it('installs APIs from resolved descriptors independently of feature order', () => {
  const calendar = setup();
  expect(calendar.api.selection.evaluate(target(10), target(11)).status).toBe('valid');
  expect(calendar.api.move.evaluate('a', target(11)).status).toBe('valid');
  const resized = calendar.api.resize.evaluate('a', 'end', target(11));
  expect(resized.status).toBe('valid');
  if (resized.status === 'valid') {
    expectTypeOf(resized.proposal.after.data).toEqualTypeOf<typeof event.data>();
    expect(resized.proposal.after.data).toBe(event.data);
  }
  const plain = interactionTestViews({ day: timeGridView({ days: 1 }) });
  const display = createCalendar({ ...base, ...plain });
  expect(Object.keys(display.api).toSorted()).toEqual(['goTo', 'navigate', 'next', 'prev', 'setView', 'today']);
  expect('selectedRange' in display.store.state).toBe(false);
});

it('installs only the registered operation APIs and persistent state', () => {
  for (const [key, feature, action] of [
    ['dateSelectionFeature', dateSelectionFeature(), 'selection'],
    ['eventMoveFeature', eventMoveFeature(), 'move'],
    ['eventResizeFeature', eventResizeFeature(), 'resize'],
  ] as const) {
    const selected = interactionTestViews({ day: timeGridView({ days: 1, features: { [key]: feature, interactionFeature: interactionFeature() } }) });
    const calendar = createCalendar({ ...base, ...selected });
    for (const name of ['selection', 'move', 'resize']) expect(name in calendar.api).toBe(name === action);
    expect('selectedRange' in calendar.store.state).toBe(action === 'selection');
    expect('begin' in calendar.api.interactions).toBe(false);
  }
});

it('resolves replacements before installation and rejects duplicate operation kinds', () => {
  const calendar = createCalendar({
    ...base,
    ...views,
    features: {
      ...views.features,
      eventMoveFeature: {
        ...eventMoveFeature(),
        interaction: { ...eventMoveFeature().interaction, operation: { ...eventMoveFeature().interaction.operation, enabled: () => false } },
      },
    },
  });
  expect(calendar.api.move.begin('a')).toEqual({ status: 'unavailable' });
  expect(() =>
    createCalendar({ ...base, ...views, features: { ...views.features, duplicate: { ...eventMoveFeature(), '~id': 'duplicate', requires: [] } } }),
  ).toThrow('duplicate operation: move');
});

it('emits the latest callback once and leaves events as consumer input', () => {
  const before = vi.fn();
  const after = vi.fn();
  const calendar = createCalendar({ ...base, ...views, onEventMove: before });
  const token = start(calendar.api.move.begin('a'));
  token.update(target(11));
  calendar['~update']({ ...calendar.options, onEventMove: after });
  expect(token.commit().status).toBe('committed');
  expect(token.commit().status).toBe('stale-session');
  expect(before).not.toHaveBeenCalled();
  expect(after).toHaveBeenCalledOnce();
  expect(after.mock.calls[0][0].after.start.equals(at(11))).toBe(true);
  expect(calendar.options.events[0]).toBe(event);
  expect(event.start.equals(at(9))).toBe(true);
});

it('publishes drafts without deriving or notifying the base layout', () => {
  const build = vi.fn(timeGridLayout.build);
  const calendar = createCalendar({
    ...base,
    ...views,
    views: {
      ...views.views,
      day: { ...views.views.day, '~features': { ...views.views.day['~features'], timeGridLayout: { ...timeGridLayout, build } } },
    },
  });
  const layout = calendar.store.state.layout;
  const notify = vi.fn();
  const subscription = calendar.store.subscribe(notify);
  const draft = vi.fn();
  const unsubscribe = calendar.api.interactions.store.subscribe(draft);
  const count = build.mock.calls.length;
  const token = start(calendar.api.resize.begin('a', 'end'));
  token.update(target(11));
  const publications = draft.mock.calls.length;
  expect(token.update(target(11)).status).toBe('unchanged');
  expect(draft).toHaveBeenCalledTimes(publications);
  expect(calendar.store.state.layout).toBe(layout);
  expect(build).toHaveBeenCalledTimes(count);
  expect(notify).not.toHaveBeenCalled();
  unsubscribe.unsubscribe();
  subscription.unsubscribe();
});

it('persists selection through uncontrolled, controlled and external D29 slices', () => {
  const uncontrolled = setup();
  let token = start(uncontrolled.api.selection.begin(target(10)));
  token.update(target(11));
  token.commit();
  expect(uncontrolled.store.state.selectedRange?.start.equals(at(10))).toBe(true);
  const callback = vi.fn();
  const controlled = createCalendar({ ...base, ...views, state: { selectedRange: null }, onSelectionChange: callback });
  token = start(controlled.api.selection.begin(target(10)));
  token.update(target(11));
  token.commit();
  expect(controlled.store.state.selectedRange).toBeNull();
  controlled['~update']({ ...controlled.options, state: { selectedRange: callback.mock.calls[0][0] } });
  expect(controlled.store.state.selectedRange?.start.equals(at(10))).toBe(true);
  const atom = createStore<ReturnType<typeof setup>['store']['state']['selectedRange']>(null);
  const external = createCalendar({ ...base, ...views, atoms: { selectedRange: atom } });
  token = start(external.api.selection.begin(target(10)));
  token.update(target(11));
  token.commit();
  expect(atom.state?.start.equals(at(10))).toBe(true);
});

it('refreshes validation on options sync, rechecks commit, and cancels replaced sources', () => {
  const calendar = setup();
  let token = start(calendar.api.move.begin('a'));
  token.update(target(11));
  calendar['~update']({ ...calendar.options, events: [event, { ...event, id: 'blocking', start: at(11), end: at(12) }] });
  expect(calendar.api.interactions.store.state.candidate).toEqual({ status: 'rejected', reason: 'overlap' });
  expect(token.commit().status).toBe('rejected');
  token.cancel();
  const resizing = start(calendar.api.resize.begin('a', 'start'));
  calendar['~update']({ ...calendar.options, events: [{ ...event }] });
  expect(calendar.api.interactions.store.state.outcome).toBe('source-changed');
  expect(resizing.commit().status).toBe('stale-session');
});

it('applies per-view activation/settings and cancels navigation or disabling', () => {
  const calendar = setup();
  const token = start(calendar.api.resize.begin('a', 'end'));
  calendar['~update']({ ...calendar.options, resizing: { enabled: false } });
  expect(calendar.api.interactions.store.state.outcome).toBe('operation-disabled');
  expect(token.commit().status).toBe('stale-session');
  calendar['~update']({ ...calendar.options, view: 'list' });
  expect(calendar.api.selection.begin(target(10)).status).toBe('unavailable');
  calendar['~update']({
    ...calendar.options,
    view: 'day',
    resizing: undefined,
    views: { ...views.views, day: { ...views.views.day, features: { ...views.views.day.features, eventResizeFeature: { enabled: true } } } },
  });
  expect(calendar.api.resize.begin('a', 'end').status).toBe('active');
  calendar['~update']({ ...calendar.options, date: date.add({ days: 1 }) });
  expect(calendar.api.interactions.store.state.outcome).toBe('context-changed');
});

it('retains inclusive all-day bounds, fixed resize edges and independent payloads', () => {
  const fair = { id: 'fair', kind: 'allDay' as const, start: date, data: { title: 'Fair' } };
  const calendar = createCalendar({ ...base, ...views, events: [fair] });
  const resized = calendar.api.resize.evaluate('fair', 'start', { kind: 'allDay', at: date.subtract({ days: 1 }) });
  expect(resized.status).toBe('valid');
  if (resized.status === 'valid') {
    expect(resized.proposal.after.kind).toBe('allDay');
    if (resized.proposal.after.kind === 'allDay') expect(resized.proposal.after.end?.equals(date)).toBe(true);
    expect(resized.proposal.after.data).toBe(fair.data);
  }
  expect(calendar.api.resize.evaluate('fair', 'start', { kind: 'allDay', at: date.add({ days: 1 }) }).status).toBe('rejected');
  expect(calendar.api.resize.evaluate('fair', 'end', target(11)).status).toBe('unavailable');
});

it('cancels even an unacknowledged lease on the last unmount and supports remount', () => {
  let state = interactionIdle();
  let pending = state;
  const onChange = vi.fn((next: Calendar_InteractionSnapshot) => {
    pending = next;
  });
  const calendar = createCalendar({ ...base, ...views, interactionOwnership: { mode: 'controlled', read: () => state, onChange } });
  const releaseFirst = calendar['~mount']();
  const releaseSecond = calendar['~mount']();
  const token = start(calendar.api.move.begin('a'));
  releaseFirst();
  releaseFirst();
  expect(calendar.api.move.begin('a').status).toBe('busy');
  releaseSecond();
  expect(pending.outcome).toBe('unmounted');
  expect(token.commit().status).toBe('stale-session');
  state = pending;
  const releaseThird = calendar['~mount']();
  expect(calendar.api.move.begin('a').status).toBe('active');
  releaseThird();
});

it('observes external drafts only while mounted and preserves store subscribers across remount', () => {
  const atom = createStore(interactionIdle());
  const subscribe = vi.spyOn(atom, 'subscribe');
  const calendar = createCalendar({ ...base, ...views, interactionOwnership: { mode: 'external', atom } });
  const notified = vi.fn();
  const stop = calendar.api.interactions.store.subscribe(notified);
  const release = calendar['~mount']();
  expect(subscribe).toHaveBeenCalledOnce();
  atom.setState(() => ({ ...interactionIdle(), outcome: 'external' }));
  expect(notified).toHaveBeenCalledOnce();
  const token = start(calendar.api.move.begin('a'));
  release();
  expect(token.commit().status).toBe('stale-session');
  const count = notified.mock.calls.length;
  atom.setState(() => interactionIdle());
  expect(notified).toHaveBeenCalledTimes(count);
  const releaseAgain = calendar['~mount']();
  expect(notified.mock.calls.length).toBeGreaterThan(count);
  releaseAgain();
  stop.unsubscribe();
});

it('rejects missing prerequisites and cycles, and inherits registrations across views', () => {
  const invalid = interactionTestViews({ day: timeGridView({ days: 1, features: { eventMoveFeature: eventMoveFeature() } }) });
  // @ts-expect-error JavaScript consumers also receive a runtime prerequisite error
  expect(() => createCalendar({ ...base, ...invalid })).toThrow('requires interactionFeature');
  const inactive = interactionTestViews({
    day: timeGridView({ days: 1, features: { eventMoveFeature: eventMoveFeature() } }),
    other: listView({ days: 1, features: { interactionFeature: interactionFeature() } }),
  });
  expect(createCalendar({ ...base, ...inactive }).api.move.begin('a').status).toBe('active');
  const cycle = { a: { '~id': 'a', '~config': {}, requires: ['b'] }, b: { '~id': 'b', '~config': {}, requires: ['a'] } } as const;
  expect(() => createCalendar({ ...base, ...views, features: { ...views.features, ...cycle } })).toThrow('cycle: a -> b -> a');
});

it('installs a third-party non-date API through the same feature lifecycle', () => {
  const externalViews = interactionTestViews({
    day: timeGridView({ days: 1, features: { eventPriorityFeature: eventPriorityFeature(), interactionFeature: interactionFeature() } }),
  });
  const onPriorityChange = vi.fn();
  const calendar = createCalendar({ ...base, ...externalViews, onPriorityChange });
  const result = calendar.api.priority.evaluate('a', 'Customer request', { kind: 'priority', value: 'high' });
  if (result.status === 'valid') {
    expectTypeOf(result.proposal.event.data).toEqualTypeOf<typeof event.data>();
    expect(result.proposal.event).toBe(event);
  }
  expect('move' in calendar.api).toBe(false);
  expect('selectedRange' in calendar.store.state).toBe(false);
  const token = start(calendar.api.priority.begin('a', 'Customer request'));
  token.update({ kind: 'priority', value: 'high' });
  calendar['~update']({ ...calendar.options, priority: { allowHigh: false } });
  expect(calendar.api.interactions.store.state.candidate?.status).toBe('rejected');
  expect(token.commit().status).toBe('rejected');
  token.update({ kind: 'priority', value: 'low' });
  expect(token.commit().status).toBe('committed');
  expect(onPriorityChange).toHaveBeenCalledOnce();
  expect(onPriorityChange.mock.calls[0][0].value).toBe('low');
});

it('does not republish a draft when inline settings retain the same values', () => {
  const calendar = createCalendar({ ...base, ...views, resizing: { enabled: true }, constraints: { preventOverlap: false } });
  const token = start(calendar.api.resize.begin('a', 'end'));
  token.update(target(11));
  const draft = calendar.api.interactions.store.state;
  const changed = vi.fn();
  const subscription = calendar.api.interactions.store.subscribe(changed);
  calendar['~update']({ ...calendar.options, resizing: { enabled: true }, constraints: { preventOverlap: false } });
  expect(calendar.api.interactions.store.state).toBe(draft);
  expect(changed).not.toHaveBeenCalled();
  subscription.unsubscribe();
});

it('keeps concrete editing usable beside recurring definitions without editing a series', () => {
  const configured = interactionTestViews({ day: timeGridView({ days: 1, features: { ...operations, recurrenceFeature: recurrenceFeature() } }) });
  const series = createRecurringEvent({
    id: 'series',
    kind: 'timed',
    start: at(14),
    duration: Temporal.Duration.from({ hours: 1 }),
    rrule: { freq: 'DAILY', count: 2 },
    data: event.data,
  });
  const calendar = createCalendar({ ...base, ...configured, events: [event, series] });
  expect(calendar.api.move.evaluate('a', target(11)).status).toBe('valid');
  expect(calendar.api.resize.evaluate('a', 'end', target(11)).status).toBe('valid');
  expect(calendar.api.move.evaluate('series', target(11))).toEqual({ status: 'unavailable', reason: 'source-unsupported' });
  expect(calendar.api.resize.evaluate('series', 'end', target(16))).toEqual({ status: 'unavailable', reason: 'source-unsupported' });
  expect(
    calendar.store.state.layout.columns.flatMap(column => column.segments).some(segment => segment.event.occurrence?.seriesId === 'series'),
  ).toBe(true);
});

it('resolves operation settings and prerequisites by identity with consumer aliases', () => {
  const features = calendarFeatures({
    edit: eventMoveFeature({ enabled: false, allowConversion: true }),
    runtime: interactionFeature(),
    rules: constraintsFeature({ preventOverlap: false }),
  });
  const configured = calendarViews({
    features,
    views: {
      day: timeGridView({ days: 1, features: { edit: { enabled: true } } }),
      list: listView({ days: 1 }),
    },
  });
  const calendar = createCalendar({ ...base, features, views: configured, movement: { enabled: false } });
  const result = calendar.api.move.evaluate('a', { kind: 'allDay', at: date });
  expect(result.status).toBe('valid');
  if (result.status === 'valid') expectTypeOf(result.proposal.after.data).toEqualTypeOf<typeof event.data>();
  const token = start(calendar.api.move.begin('a'));
  calendar['~update']({ ...calendar.options, view: 'list' });
  expect(token.commit().status).toBe('stale-session');
  expect(calendar.api.move.begin('a').status).toBe('unavailable');
  expect('selection' in calendar.api).toBe(false);
});
