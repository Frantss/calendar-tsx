/* oxlint-disable react/refs -- Interaction bindings expose callback refs, not mutable ref objects. */
import type { Calendar_EventInput, Calendar_Selection, Calendar_DragScope } from '@calendar-tsx/core';
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
} from '@calendar-tsx/solid';
import { createSignal, For } from 'solid-js';
import type { Booking, EditingState } from '../core/interactions';
import { features, views, initialDate, initialEvents, eventRelocationPolicy } from '../core/interactions';

// #region setup
export function EditableCalendar({ dragScope }: { dragScope?: Calendar_DragScope }) {
  const [date, setDate] = createSignal(initialDate);
  const [events, setEvents] = createSignal(initialEvents);
  const [selection, setSelection] = createSignal<Calendar_Selection | null>(null);
  const replaceEvent = (after: Calendar_EventInput<Booking>) =>
    setEvents(current => current.map(event => (event.id === after.id ? after : event)));

  const calendar = useCalendar(() => ({
    features,
    views,
    eventRelocationPolicy,
    view: 'day',
    date: date(),
    timeZone: 'UTC',
    events: events(),
    onNavigate: next => setDate(next.date),
    onSelectionChange: setSelection,
    onEventMove: ({ after }) => replaceEvent(after),
    onEventResize: ({ after }) => replaceEvent(after),
  }));
  const bindings = useCalendarInteractionBindings(calendar, { dragScope });

  return (
    <CalendarProvider value={calendar}>
      <div ref={bindings.root}>
        <EditableDay bindings={bindings} />
      </div>
      <p role='status'>
        {selection() ? `Selected ${selection()!.start.toString()} to ${selection()!.end.toString()}` : 'No selection'}
      </p>
    </CalendarProvider>
  );
}
// #endregion setup

type Bindings = ReturnType<typeof useCalendarInteractionBindings<Booking>>;
type Column = EditingState['layout']['columns'][number];

function EditableDay(props: { bindings: Bindings }) {
  const layout = useCalendarSelector((state: EditingState) => state.layout);
  return (
    <TimeGridView model={layout()}>
      <TimeGridViewHeader>
        <For each={layout().columns}>
          {column => <TimeGridViewColumnHeader column={column}>{column.date.toString()}</TimeGridViewColumnHeader>}
        </For>
      </TimeGridViewHeader>
      <TimeGridViewBody model={layout()}>
        <For each={layout().columns}>{column => <EditableColumn column={column} bindings={props.bindings} />}</For>
      </TimeGridViewBody>
    </TimeGridView>
  );
}

// #region bindings
function EditableColumn(props: { column: Column; bindings: Bindings }) {
  return (
    <TimeGridViewColumn column={props.column} ref={props.bindings.surface(timeGridSurface(props.column.key))}>
      <For each={props.column.segments}>
        {segment => (
          <TimeGridViewEvent
            segment={segment}
            ref={props.bindings.source(segment.key, {
              eventId: segment.event.id,
              resourceId: props.column.resource?.id,
            })}
          >
            {segment.event.data.title}
            <span
              aria-hidden
              class='resize-end'
              ref={props.bindings.source(`${segment.key}:end`, {
                eventId: segment.event.id,
                resourceId: props.column.resource?.id,
                edge: 'end',
              })}
            />
          </TimeGridViewEvent>
        )}
      </For>
      <ColumnDraft bindings={props.bindings} surface={`column:${props.column.key}`} />
    </TimeGridViewColumn>
  );
}
// #endregion bindings

// #region preview
function ColumnDraft(props: { bindings: Bindings; surface: string }) {
  const geometry = () => {
    const preview = props.bindings.preview();
    return preview?.status === 'valid' && preview.kind === 'timeGrid'
      ? preview.geometry.filter(item => item.surface === props.surface)
      : [];
  };
  return (
    <For each={geometry()}>
      {item => (
        <span
          aria-hidden
          class='editing-draft'
          style={{
            top: `${item.start * 100}%`,
            height: `${item.span * 100}%`,
            left: `${(item.inlineStart ?? 0) * 100}%`,
            width: `${(item.inlineSize ?? 1) * 100}%`,
          }}
        />
      )}
    </For>
  );
}
// #endregion preview
