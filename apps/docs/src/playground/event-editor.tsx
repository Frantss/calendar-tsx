import type { PlaygroundEvent } from './config';
import { playgroundRooms } from './config';
import { buttonClass, Checkbox, Field, inputClass } from './controls';

/** One added event: its fields, and a button that removes it. */
export function EventEditor({
  event,
  onChange,
  onRemove,
}: {
  event: PlaygroundEvent;
  onChange: (event: PlaygroundEvent) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<PlaygroundEvent>) => onChange({ ...event, ...patch });

  return (
    <fieldset className='flex flex-col gap-3 rounded-lg border border-fd-border p-3'>
      <legend className='px-1 text-sm font-medium'>{event.title || 'Untitled event'}</legend>
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
        <div className='grid grid-cols-2 gap-3'>
          <Field label='Starts'>
            <input
              type='time'
              required
              value={event.start}
              onChange={input => input.target.value && update({ start: input.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label='Ends'>
            <input
              type='time'
              required
              value={event.end}
              onChange={input => input.target.value && update({ end: input.target.value })}
              className={inputClass}
            />
          </Field>
          <p className='col-span-2 text-xs text-fd-muted-foreground'>
            An end at or before the start ends the next day.
          </p>
        </div>
      )}
      <Field label='Room' hint='Rooms show in the Rooms view; an event with no room appears in the other views only.'>
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
      <button type='button' onClick={onRemove} className={buttonClass}>
        Remove {event.title || 'event'}
      </button>
    </fieldset>
  );
}
