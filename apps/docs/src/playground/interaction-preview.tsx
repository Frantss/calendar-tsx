import { createExternalDraggable } from '@calendar-tsx/core';
import type {
  Calendar_DateTarget,
  Calendar_EventDomCalendar,
  Calendar_EventInput,
  Calendar_InteractionStart,
  Calendar_InteractionScope,
  Calendar_LayoutProjection,
} from '@calendar-tsx/core';
import type { useCalendarInteractionBindings } from '@calendar-tsx/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Temporal } from 'temporal-polyfill';
import type { PlaygroundConfig } from './config';
import type { Booking } from './sample-data';

export type PreviewBindings = ReturnType<typeof useCalendarInteractionBindings<Booking>>;

export function DraftOverlay({
  preview,
  surface,
  vertical = false,
}: {
  preview: Calendar_LayoutProjection | null;
  surface: string;
  vertical?: boolean;
}) {
  if (preview?.status !== 'valid' || !['dayGrid', 'timeGrid', 'timeline'].includes(preview.kind)) return null;
  return preview.geometry
    .filter(item => item.surface === surface)
    .map((item, index) => (
      <span
        key={index}
        aria-hidden
        className='interaction-draft'
        style={
          vertical
            ? {
                top: `${item.start * 100}%`,
                height: `${item.span * 100}%`,
                left: `${(item.inlineStart ?? 0) * 100}%`,
                width: `${(item.inlineSize ?? 1) * 100}%`,
              }
            : { left: `${item.start * 100}%`, width: `${item.span * 100}%`, top: 0, bottom: 0 }
        }
      />
    ));
}

export function ResizeHandles({
  bindings,
  event,
  sourceKey,
  resourceId,
  vertical = false,
  enabled,
}: {
  bindings: PreviewBindings;
  event: Calendar_EventInput<Booking>;
  sourceKey: string;
  resourceId?: string;
  vertical?: boolean;
  enabled: boolean;
}) {
  if (!enabled) return null;
  return (['start', 'end'] as const).map(edge => (
    <span
      key={edge}
      aria-hidden
      data-edge={edge}
      data-axis={vertical ? 'vertical' : 'horizontal'}
      className='interaction-resize'
      ref={bindings.source(`${sourceKey}:${edge}`, { eventId: event.id, edge, resourceId })}
    />
  ));
}

const reasons: Record<string, string> = {
  overlap: 'Overlaps another event.',
  'outside-business-hours': 'Outside weekdays, 09:00–17:00.',
  'resource-unavailable': 'The room is unavailable.',
  'outside-allowed-range': 'Outside the allowed dates.',
  'conversion-unsupported': 'Enable timed / all-day conversion for this destination.',
  'invalid-range': 'The end must follow the start.',
  'operation-disabled': 'This operation is disabled.',
  'source-resource-required': 'Choose the room assignment to move.',
};
export const interactionReason = (reason: string) => reasons[reason] ?? reason.replaceAll('-', ' ');

export function InteractionTools({
  scope,
  calendar,
  config,
  selected,
  message,
  onMessage,
  onTransfer,
}: {
  scope: Calendar_InteractionScope;
  calendar: Calendar_EventDomCalendar<Booking>;
  config: PlaygroundConfig;
  selected?: Calendar_EventInput<Booking>;
  message: string;
  onMessage: (message: string) => void;
  onTransfer: (event: Calendar_EventInput<Booking>) => void;
}) {
  const draft = useSyncExternalStore(
    listener => {
      const stop = calendar.api.interactions.store.subscribe(listener);
      return () => stop.unsubscribe();
    },
    () => calendar.api.interactions.store.state,
  );
  const [from, setFrom] = useState(`${config.date}T10:00`);
  const [until, setUntil] = useState(`${config.date}T11:00`);
  const [allDay, setAllDay] = useState(false);
  const external = useRef<HTMLButtonElement>(null);
  const timeZone = calendar.options.timeZone;
  const newEvent = useCallback((): Calendar_EventInput<Booking> => {
    const start = Temporal.PlainDate.from(config.date).toZonedDateTime({ timeZone, plainTime: '10:00' });
    return {
      id: `drop-${crypto.randomUUID()}`,
      kind: 'timed',
      start,
      end: start.add({ hours: 1 }),
      resourceIds: ['room-a'],
      data: { title: 'New booking' },
    };
  }, [config.date, timeZone]);
  useEffect(() => {
    if (!external.current || !config.interactions.externalDrop) return;
    return createExternalDraggable(external.current, () => ({ event: newEvent() }), { scope, pointer: {} });
  }, [config.interactions.externalDrop, newEvent, scope]);
  const complete = (start: Calendar_InteractionStart | undefined, target: Calendar_DateTarget) => {
    if (!start || start.status !== 'active') {
      onMessage('Enable this operation before editing.');
      return;
    }
    start.session.update(target);
    const candidate = calendar.api.interactions.store.state.candidate;
    const result = start.session.commit();
    if (result.status !== 'committed') {
      onMessage(
        candidate && candidate.status !== 'valid'
          ? interactionReason(candidate.reason)
          : 'The edit could not be applied.',
      );
      start.session.cancel();
    }
  };
  const edit = (operation: 'move' | 'resize', direction: -1 | 1, edge: 'start' | 'end' = 'end') => {
    if (!selected) return;
    const target: Calendar_DateTarget =
      selected.kind === 'allDay'
        ? {
            kind: 'allDay',
            at: (operation === 'move' || edge === 'start' ? selected.start : (selected.end ?? selected.start)).add({
              days: direction,
            }),
            resourceId: selected.resourceIds?.[0],
          }
        : {
            kind: 'timed',
            at: (operation === 'move' || edge === 'start' ? selected.start : selected.end).add({
              minutes: config.slotMinutes * direction,
            }),
            resourceId: selected.resourceIds?.[0],
          };
    complete(
      operation === 'move'
        ? calendar.api.move?.begin(selected.id, selected.resourceIds?.[0])
        : calendar.api.resize?.begin(selected.id, edge),
      target,
    );
  };
  const candidate = draft.candidate;
  const status =
    candidate?.status === 'valid'
      ? 'Preview ready. Release to apply, or press Escape to cancel.'
      : candidate
        ? interactionReason(candidate.reason)
        : message;
  return (
    <div className='interaction-tools'>
      <p role='status' aria-live='polite'>
        {status || 'Select an event to see its details.'}
      </p>
      {selected && (
        <div className='interaction-actions' aria-label='Selected event actions'>
          <strong>{selected.data.title}</strong>
          {config.interactions.movement && (
            <>
              <button type='button' onClick={() => edit('move', -1)}>
                Move earlier
              </button>
              <button type='button' onClick={() => edit('move', 1)}>
                Move later
              </button>
            </>
          )}
          {config.interactions.resizing && (
            <>
              <button type='button' onClick={() => edit('resize', -1, 'start')}>
                Start earlier
              </button>
              <button type='button' onClick={() => edit('resize', 1, 'start')}>
                Start later
              </button>
              <button type='button' onClick={() => edit('resize', -1)}>
                Shorten event
              </button>
              <button type='button' onClick={() => edit('resize', 1)}>
                Extend event
              </button>
            </>
          )}
          {config.interactions.crossCalendar && config.interactions.movement && (
            <button type='button' onClick={() => onTransfer(selected)}>
              Send to other calendar
            </button>
          )}
        </div>
      )}
      {config.interactions.selection && (
        <form
          className='interaction-actions'
          onSubmit={event => {
            event.preventDefault();
            try {
              const target = (text: string): Calendar_DateTarget =>
                allDay
                  ? { kind: 'allDay', at: Temporal.PlainDate.from(text.slice(0, 10)) }
                  : { kind: 'timed', at: Temporal.PlainDateTime.from(text).toZonedDateTime(calendar.options.timeZone) };
              complete(calendar.api.selection?.begin(target(from)), target(until));
            } catch {
              onMessage('Enter valid start and end dates.');
            }
          }}
        >
          <label>
            Range start
            <input type='datetime-local' required value={from} onChange={event => setFrom(event.target.value)} />
          </label>
          <label>
            Range end
            <input type='datetime-local' required value={until} onChange={event => setUntil(event.target.value)} />
          </label>
          <label>
            <input type='checkbox' checked={allDay} onChange={event => setAllDay(event.target.checked)} /> All-day range
          </label>
          <button type='submit'>Select range</button>
        </form>
      )}
      {config.interactions.externalDrop && (
        <div className='interaction-actions'>
          <button
            type='button'
            ref={external}
            className='interaction-external'
            onClick={event => {
              if (event.detail === 0) onMessage('Drag the new booking onto a calendar, or use Add at 10:00.');
            }}
          >
            Drag new 1-hour booking
          </button>
          <button
            type='button'
            onClick={() => {
              const event = newEvent();
              if (event.kind === 'timed')
                complete(calendar.api.externalDrop?.begin(event), {
                  kind: 'timed',
                  at: event.start,
                  resourceId: 'room-a',
                });
            }}
          >
            Add at 10:00
          </button>
        </div>
      )}
    </div>
  );
}
