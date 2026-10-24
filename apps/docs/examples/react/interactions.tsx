/* oxlint-disable react/refs -- Interaction bindings expose callback refs, not mutable ref objects. */
import type { Calendar_EventInput, Calendar_Selection } from '@calendar-tsx/core';
import { timeGridSurface } from '@calendar-tsx/core';
import {
  CalendarProvider,
  TimeGridView,
  TimeGridViewHeader,
  TimeGridViewColumnHeader,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewEvent,
  useCalendar,
  useCalendarInteractionBindings,
  useCalendarSelector,
} from '@calendar-tsx/react';
import { useState } from 'react';
import type { Booking, EditingState } from '../core/interactions';
import { features, views, initialDate, initialEvents } from '../core/interactions';

// #region setup
export function EditableCalendar() {
  const [date, setDate] = useState(initialDate);
  const [events, setEvents] = useState(initialEvents);
  const [selection, setSelection] = useState<Calendar_Selection | null>(null);
  const replaceEvent = (after: Calendar_EventInput<Booking>) =>
    setEvents(current => current.map(event => (event.id === after.id ? after : event)));

  const calendar = useCalendar({
    features,
    views,
    view: 'day',
    date,
    timeZone: 'UTC',
    events,
    onNavigate: next => setDate(next.date),
    onSelectionChange: setSelection,
    onEventMove: ({ after }) => replaceEvent(after),
    onEventResize: ({ after }) => replaceEvent(after),
  });
  const bindings = useCalendarInteractionBindings(calendar);

  return (
    <CalendarProvider value={calendar}>
      <div ref={bindings.root}>
        <EditableDay bindings={bindings} />
      </div>
      <p role='status'>
        {selection ? `Selected ${selection.start.toString()} to ${selection.end.toString()}` : 'No selection'}
      </p>
    </CalendarProvider>
  );
}
// #endregion setup

type Bindings = ReturnType<typeof useCalendarInteractionBindings<Booking>>;
type Column = EditingState['layout']['columns'][number];

function EditableDay({ bindings }: { bindings: Bindings }) {
  const layout = useCalendarSelector((state: EditingState) => state.layout);
  return (
    <TimeGridView model={layout}>
      <TimeGridViewHeader>
        {layout.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            {column.date.toString()}
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      <TimeGridViewBody model={layout}>
        {layout.columns.map(column => (
          <EditableColumn key={column.key} column={column} bindings={bindings} />
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
}

// #region bindings
function EditableColumn({ column, bindings }: { column: Column; bindings: Bindings }) {
  return (
    <TimeGridViewColumn column={column} ref={bindings.surface(timeGridSurface(column.key))}>
      {column.segments.map(segment => (
        <TimeGridViewEvent
          key={segment.key}
          segment={segment}
          ref={bindings.source(segment.key, {
            eventId: segment.event.id,
            resourceId: column.resource?.id,
          })}
        >
          {segment.event.data.title}
          <span
            aria-hidden
            className='resize-end'
            ref={bindings.source(`${segment.key}:end`, {
              eventId: segment.event.id,
              resourceId: column.resource?.id,
              edge: 'end',
            })}
          />
        </TimeGridViewEvent>
      ))}
      <ColumnDraft bindings={bindings} surface={`column:${column.key}`} />
    </TimeGridViewColumn>
  );
}
// #endregion bindings

// #region preview
function ColumnDraft({ bindings, surface }: { bindings: Bindings; surface: string }) {
  const preview = bindings.preview;
  if (preview?.status !== 'valid' || preview.kind !== 'timeGrid') return null;
  return preview.geometry
    .filter(item => item.surface === surface)
    .map((item, index) => (
      <span
        key={index}
        aria-hidden
        className='editing-draft'
        style={{
          top: `${item.start * 100}%`,
          height: `${item.span * 100}%`,
          left: `${(item.inlineStart ?? 0) * 100}%`,
          width: `${(item.inlineSize ?? 1) * 100}%`,
        }}
      />
    ));
}
// #endregion preview
