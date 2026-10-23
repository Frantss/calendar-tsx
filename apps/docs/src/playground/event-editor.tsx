import type { PlaygroundEvent } from './config';
import { playgroundRooms } from './config';
import { buttonClass, Checkbox, Field, inputClass } from './controls';

const summaryOf = (event: PlaygroundEvent) =>
  event.allDay
    ? `${event.date}, all day${event.days > 1 ? `, ${event.days} days` : ''}`
    : `${event.date}, ${event.start} to ${event.end}`;

/** One added event, collapsed to a line until opened: its fields, and a button that removes it. */
export function EventEditor({
  event,
  open,
  onChange,
  onRemove,
}: {
  event: PlaygroundEvent;
  open?: boolean;
  onChange: (event: PlaygroundEvent) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<PlaygroundEvent>) => onChange({ ...event, ...patch });

  return (
    <details open={open} className='group rounded-md border border-fd-border'>
      <summary className='flex h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-[13px] pointer-coarse:h-11 focus-visible:outline-2 focus-visible:outline-fd-ring [&::-webkit-details-marker]:hidden'>
        <span className='min-w-0 flex-1 truncate font-medium'>{event.title || 'Untitled event'}</span>
        <span className='shrink-0 font-mono text-[11px] text-fd-muted-foreground'>{summaryOf(event)}</span>
      </summary>
      <div className='flex flex-col gap-2 border-t border-fd-border p-2'>
        <Field label='Title'>
          <input
            type='text'
            maxLength={80}
            value={event.title}
            onChange={input => update({ title: input.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label='Date'>
          <input
            type='date'
            required
            value={event.date}
            onChange={input => input.target.value && update({ date: input.target.value })}
            className={inputClass}
          />
        </Field>
        <Checkbox label='All day' checked={event.allDay} onChange={allDay => update({ allDay })} />
        {event.allDay ? (
          <Field label='Days'>
            <input
              type='number'
              min={1}
              max={14}
              value={event.days}
              onChange={input => update({ days: Math.min(Math.max(Number(input.target.value) || 1, 1), 14) })}
              className={inputClass}
            />
          </Field>
        ) : (
          <>
            <Field label='Starts'>
              <input
                type='time'
                required
                value={event.start}
                onChange={input => input.target.value && update({ start: input.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label='Ends' hint='At or before the start, it ends the next day.'>
              <input
                type='time'
                required
                value={event.end}
                onChange={input => input.target.value && update({ end: input.target.value })}
                className={inputClass}
              />
            </Field>
          </>
        )}
        <Field label='Room' hint='Shown in the Rooms view.'>
          <select
            value={event.room}
            onChange={input => update({ room: input.target.value as PlaygroundEvent['room'] })}
            className={inputClass}
          >
            <option value=''>No room</option>
            {playgroundRooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        </Field>
        <button type='button' onClick={onRemove} className={`${buttonClass} self-end`}>
          Remove {event.title || 'event'}
        </button>
      </div>
    </details>
  );
}
