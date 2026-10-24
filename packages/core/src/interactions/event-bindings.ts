import { Temporal } from 'temporal-polyfill';
import { calendarClock_candidates } from '#features/interaction/clock';
import type { Calendar_EventInput } from '#events/event.types';
import { isDateTarget as isDate } from '#features/interaction/date-target';
import type {
  Calendar_EventDomCalendar,
  Calendar_DomSource,
  Calendar_DomOperation,
  Calendar_DomGesture,
} from '#interactions/dom.types';
import type { Calendar_TransferSource } from '#features/event-transfer/event-transfer.types';
import type { DomBinding, DomStart } from '#interactions/dom.internal';
import { domStart, resolveDomOperation } from '#interactions/dom-operation';

const eventOf = <D>(calendar: Calendar_EventDomCalendar<D>, id: string): Calendar_EventInput<D> | undefined => {
  const event = calendar.options.events.find(event => event.id === id);
  return event && !event['~source'] && 'kind' in event ? (event as Calendar_EventInput<D>) : undefined;
};

const adjusted = (target: unknown, anchor: unknown, source: Calendar_EventInput<unknown> | undefined, zone: string) => {
  if (!source || !isDate(anchor) || !isDate(target) || anchor.kind !== source.kind || target.kind !== source.kind)
    return target;
  if (source.kind === 'allDay' && anchor.kind === 'allDay' && target.kind === 'allDay')
    return { ...target, at: target.at.subtract({ days: source.start.until(anchor.at).days }) };
  if (source.kind === 'timed' && anchor.kind === 'timed' && target.kind === 'timed') {
    const offset = source.start.withTimeZone(zone).offset;
    const anchorClock =
      'clock' in anchor && anchor.clock instanceof Temporal.PlainDateTime
        ? anchor.clock
        : anchor.at.withTimeZone(zone).toPlainDateTime();
    const grab = source.start.withTimeZone(zone).toPlainDateTime().until(anchorClock);
    const clock = target.at.withTimeZone(zone).toPlainDateTime().subtract(grab);
    const candidates = calendarClock_candidates(clock, zone);
    const at = candidates.find(at => at.offset === offset) ?? candidates[0];
    return at ? { ...target, at } : undefined;
  }
  return target;
};

export const eventBinding = <D>(
  calendar: Calendar_EventDomCalendar<D>,
  descriptor?: Calendar_DomSource | Calendar_DomOperation,
): DomBinding | undefined => {
  if (descriptor && 'begin' in descriptor) return resolveDomOperation(descriptor);
  const source = descriptor ? eventOf(calendar, descriptor.eventId) : undefined;
  if (descriptor && !source) return;
  if (descriptor ? !(descriptor.edge ? calendar.api.resize : calendar.api.move) : !calendar.api.selection) return;
  const reference = source?.kind === 'timed' ? (descriptor?.edge === 'end' ? source.end : source.start) : undefined;
  const gesture: Calendar_DomGesture = {
    kind: source?.kind,
    edge: descriptor?.edge,
    offset: reference?.withTimeZone(calendar.options.timeZone).offset,
    time: reference?.withTimeZone(calendar.options.timeZone).toPlainTime().toString(),
  };
  let transfer: Calendar_TransferSource<D> | undefined;
  return {
    gesture,
    anchor: location =>
      location.status === 'valid'
        ? location.target
        : source?.kind === 'timed' && location.clock
          ? { kind: 'timed', at: source.start, clock: location.clock }
          : undefined,
    begin: anchor => {
      if (descriptor && !descriptor.edge && !transfer)
        transfer = calendar.api.transfer?.prepare(descriptor.eventId, descriptor.resourceId);
      if (transfer) return domStart({ status: 'active', session: transfer.session }, isDate);
      if (descriptor) {
        const start = descriptor.edge
          ? calendar.api.resize?.begin(descriptor.eventId, descriptor.edge)
          : calendar.api.move?.begin(descriptor.eventId, descriptor.resourceId);
        return start ? domStart(start, isDate) : undefined;
      }
      const start = isDate(anchor) ? calendar.api.selection?.begin(anchor) : undefined;
      return start ? domStart(start, isDate) : undefined;
    },
    target: (target, anchor) =>
      descriptor?.edge ? target : adjusted(target, anchor, source, calendar.options.timeZone),
    transfer: () =>
      transfer
        ? {
            data: { kind: 'transfer', source: transfer },
            valid: () => !!transfer?.read(),
            release: () => transfer?.release(),
          }
        : undefined,
  };
};

type EventDragData =
  | { kind: 'transfer'; source: Calendar_TransferSource }
  | { kind: 'create'; event: Calendar_EventInput<unknown>; metadata?: unknown };
export const receiveEvent = <D>(calendar: Calendar_EventDomCalendar<D>, data: unknown): DomStart | undefined => {
  const value = data as EventDragData;
  const start =
    value.kind === 'transfer'
      ? calendar.api.transfer?.begin(value.source as Calendar_TransferSource<D>)
      : value.kind === 'create'
        ? calendar.api.externalDrop?.begin(value.event as Calendar_EventInput<D>, value.metadata)
        : undefined;
  return start ? domStart(start, isDate) : undefined;
};
