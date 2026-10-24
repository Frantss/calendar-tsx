import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { createCalendar } from '#calendar/calendar';
import { calendarFeatures } from '#features/calendar-features';
import { calendarViews, timeGridView, timelineView } from '#views/views';
import { interactionFeature } from '#features/interaction/interaction-feature';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import { constraintsFeature } from '#features/constraints/constraints-feature';
import { eventMoveFeature } from '#features/event-move/event-move-feature';
import { eventTransferFeature } from '#features/event-transfer/event-transfer-feature';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_Selection } from '#features/date-selection/date-selection.types';
import type { Calendar_InteractionStart } from '#features/interaction/interaction.types';

type Reservation = { kind: 'reserve'; range: Calendar_Selection };
declare module '#features/interaction/interaction.types' {
  interface Calendar_OperationMap<TData> {
    reserve: { intent: { kind: 'reserve' }; target: boolean; proposal: Reservation };
  }
}
declare module '#features/feature-maps.types' {
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    reservationFeature: { reserve: () => Calendar_InteractionStart<'reserve'> };
  }
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    reservationFeature: { onReserve?: (proposal: Reservation) => void };
  }
}
const date = Temporal.PlainDate.from('2026-10-23');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${hour}:00` });
const range: Calendar_Selection = { kind: 'timed', start: at(10), end: at(11) };
const reservationFeature = {
  '~id': 'reservationFeature',
  '~config': {},
  requires: ['interactionFeature'],
  interaction: {
    operation: createInteractionOperation({
      kind: 'reserve',
      acceptsTarget: (target): target is boolean => typeof target === 'boolean',
      create: (_intent, target) =>
        target ? { status: 'valid', proposal: { kind: 'reserve', range } } : { status: 'rejected', reason: 'reservation-declined' },
      scheduling: proposal => ({ kind: 'range', range: proposal.range }),
      api: commands => ({ reserve: () => commands.begin({ kind: 'reserve' }) }),
      emit: (proposal, context) => context.options.onReserve?.(proposal),
    }),
  },
} as const satisfies Calendar_ConfiguredFeature;

for (const layout of ['timeGrid', 'timeline'] as const) {
  it(`projects and constrains a third-party boolean operation in ${layout}`, () => {
    const features = calendarFeatures({ interactions: interactionFeature(), reserve: reservationFeature, constraints: constraintsFeature() });
    const onReserve = vi.fn();
    const calendar = createCalendar({
      features,
      views: calendarViews({ features, views: { day: layout === 'timeGrid' ? timeGridView({ days: 1 }) : timelineView({ days: 1 }) } }),
      date,
      timeZone: 'UTC',
      view: 'day',
      events: [] as { id: string; kind: 'timed'; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime; data: null }[],
      onNavigate: () => {},
      onReserve,
    });
    for (const key of ['selection', 'move', 'resize', 'pointer']) expect(key in calendar.api).toBe(false);
    const started = calendar.api.reserve();
    if (started.status !== 'active') throw new Error(started.status);
    expect(started.session.update(true).status).toBe('valid');
    expect(calendar.api.interactions.store.state.preview).toMatchObject({ status: 'valid', kind: layout, geometry: [expect.any(Object)] });
    calendar['~update']({ ...calendar.options, events: [{ id: 'busy', kind: 'timed', start: at(10), end: at(11), data: null }] });
    expect(started.session.commit()).toEqual({ status: 'rejected', reason: 'overlap' });
    expect(calendar.api.interactions.store.state.preview).toBeNull();
    expect(onReserve).not.toHaveBeenCalled();
    calendar['~update']({ ...calendar.options, events: [] });
    expect(started.session.commit()).toEqual({ status: 'committed', proposal: { kind: 'reserve', range } });
    expect(onReserve).toHaveBeenCalledOnce();
    expect(started.session.commit()).toEqual({ status: 'stale-session' });
  });
}

it('transfers without pointer and uses receiver placement independently of movement', () => {
  const sourceFeatures = calendarFeatures({
    interactions: interactionFeature(),
    move: eventMoveFeature(),
    transfer: eventTransferFeature(),
  });
  const destinationFeatures = calendarFeatures({
    interactions: interactionFeature(),
    transfer: eventTransferFeature({ relocationPolicy: { allowConversion: true } }),
  });
  const event = { id: 'a', kind: 'timed' as const, start: at(10), end: at(11), data: { bookingId: 42 } };
  const onEventTransfer = vi.fn();
  const source = createCalendar({
    id: 'source',
    features: sourceFeatures,
    views: calendarViews({ features: sourceFeatures, views: { day: timeGridView({ days: 1 }) } }),
    date,
    timeZone: 'UTC',
    view: 'day',
    events: [event],
    onNavigate: () => {},
    onEventTransfer,
  });
  const destination = createCalendar({
    id: 'destination',
    features: destinationFeatures,
    views: calendarViews({ features: destinationFeatures, views: { day: timeGridView({ days: 1 }) } }),
    date,
    timeZone: 'UTC',
    view: 'day',
    events: [] as typeof source.options.events,
    onNavigate: () => {},
  });
  expect('pointer' in source.api).toBe(false);
  for (const key of ['pointer', 'move', 'resize', 'selection']) expect(key in destination.api).toBe(false);
  const prepared = source.api.transfer.prepare('a');
  if (!prepared) throw new Error('source reservation');
  const started = destination.api.transfer.begin(prepared);
  if (started.status !== 'active') throw new Error(started.status);
  expect(started.session.update({ kind: 'allDay', at: date }).status).toBe('valid');
  const result = started.session.commit();
  if (result.status !== 'committed') throw new Error(result.status);
  expect(result.proposal.after).toMatchObject({ kind: 'allDay', data: { bookingId: 42 } });
  expect(onEventTransfer).toHaveBeenCalledExactlyOnceWith(result.proposal);
  expect(prepared.read()).toBeUndefined();
  expect(source.options.events).toEqual([event]);
  expect(destination.options.events).toEqual([]);
});
