import { expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import {
  createCalendar,
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
  eventMoveFeature,
  eventTransferFeature,
} from '../../../export/index';
import type { Calendar_EventInput, Calendar_TransferProposal, Calendar_TransferSettings } from '../../../export/index';

type Booking = { title: string };
const date = Temporal.PlainDate.from('2026-10-23');
const at = date.toZonedDateTime({ timeZone: 'UTC', plainTime: '09:00' });
const event: Calendar_EventInput<Booking> = { id: 'a', kind: 'timed', start: at, end: at.add({ hours: 1 }), data: { title: 'A' } };
const features = calendarFeatures({ interactions: interactionFeature(), movement: eventMoveFeature(), transfers: eventTransferFeature() });
const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
const make = (id: string | undefined, events: Calendar_EventInput<Booking>[], transfer: Calendar_TransferSettings = {}) =>
  createCalendar({
    id,
    features,
    views,
    date,
    timeZone: 'UTC',
    view: 'day',
    events,
    transfer,
    onNavigate: () => {},
    eventRelocationPolicy: { allowConversion: true, defaultTimedMinutes: 90 },
  });

it('transfers the same event in both directions using local IDs and one shared transaction', () => {
  const left = make('left', [event], { accept: id => id === 'right' });
  const right = make('right', [], { accept: id => id === 'left', relocationPolicy: { defaultTimedMinutes: 30 } });
  const calendars = new Map([
    ['left', left],
    ['right', right],
  ]);
  const apply = (proposal: Calendar_TransferProposal<Booking>) => {
    const source = calendars.get(proposal.sourceId)!;
    const destination = calendars.get(proposal.destinationId)!;
    source['~update']({ ...source.options, events: source.options.events.filter(item => item.id !== proposal.before.id) });
    destination['~update']({ ...destination.options, events: [...destination.options.events, proposal.after] });
  };
  const onLeft = vi.fn(apply),
    onRight = vi.fn(apply);
  left['~update']({ ...left.options, onEventTransfer: onLeft });
  right['~update']({ ...right.options, onEventTransfer: onRight });

  const outbound = left.api.transfer.prepare('a')!;
  const receiveRight = right.api.transfer.begin(outbound);
  if (receiveRight.status !== 'active') throw new Error('right start');
  expect(receiveRight.session.update({ kind: 'allDay', at: date }).status).toBe('valid');
  expect(receiveRight.session.commit().status).toBe('committed');
  expect(onLeft).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ sourceId: 'left', destinationId: 'right', after: expect.objectContaining({ kind: 'allDay' }) }),
  );
  expect(onRight).not.toHaveBeenCalled();
  expect(left.options.events).toEqual([]);
  expect(right.options.events).toHaveLength(1);
  expect(outbound.read()).toBeUndefined();

  const inbound = right.api.transfer.prepare('a')!;
  const receiveLeft = left.api.transfer.begin(inbound);
  if (receiveLeft.status !== 'active') throw new Error('left start');
  expect(receiveLeft.session.update({ kind: 'timed', at }).status).toBe('valid');
  const result = receiveLeft.session.commit();
  if (result.status !== 'committed' || result.proposal.after.kind !== 'timed') throw new Error('return transfer');
  expect(result.proposal.after.end.equals(at.add({ minutes: 90 }))).toBe(true);
  expect(onRight).toHaveBeenCalledExactlyOnceWith(result.proposal);
  expect(onLeft).toHaveBeenCalledOnce();
  expect(result.proposal).toMatchObject({ sourceId: 'right', destinationId: 'left' });
  expect(right.options.events).toEqual([]);
  expect(left.options.events).toEqual([result.proposal.after]);
  expect(inbound.read()).toBeUndefined();
  for (const calendar of calendars.values()) expect(calendar.api.interactions.store.state.session).toBeNull();
});

it('requires distinct calendar IDs and invalidates prepared sources when their identity changes', () => {
  const anonymous = make(undefined, [event]);
  expect(anonymous.api.transfer.prepare('a')).toBeUndefined();
  const source = make('source', [event]);
  const prepared = source.api.transfer.prepare('a')!;
  expect(anonymous.api.transfer.begin(prepared).status).toBe('unavailable');
  expect(make('source', []).api.transfer.evaluate(prepared, { kind: 'timed', at })).toMatchObject({ reason: 'same-calendar' });
  const destination = make('destination', []);
  const started = destination.api.transfer.begin(prepared);
  if (started.status !== 'active') throw new Error('start');
  started.session.update({ kind: 'timed', at });
  source['~update']({ ...source.options, id: 'renamed' });
  expect(prepared.read()).toBeUndefined();
  expect(started.session.commit().status).toBe('stale-session');
  prepared.release();
});

it('revalidates receiver identity and transfer settings while a draft is active', () => {
  const source = make('source', [event]);
  const destination = make('destination', []);
  const prepared = source.api.transfer.prepare('a')!;
  const started = destination.api.transfer.begin(prepared);
  if (started.status !== 'active') throw new Error('start');
  started.session.update({ kind: 'timed', at });
  destination['~update']({ ...destination.options, id: 'renamed' });
  expect(destination.api.interactions.store.state.candidate).toMatchObject({ status: 'valid', proposal: { destinationId: 'renamed' } });
  destination['~update']({ ...destination.options, transfer: { accept: () => false } });
  expect(destination.api.interactions.store.state.candidate).toMatchObject({ reason: 'calendar-rejected' });
  expect(started.session.commit()).toMatchObject({ reason: 'calendar-rejected' });
  destination['~update']({ ...destination.options, transfer: { enabled: false } });
  expect(started.session.isActive()).toBe(false);
  prepared.release();
});
