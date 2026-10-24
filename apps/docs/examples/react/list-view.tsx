import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEmpty,
  ListViewEvent,
  useCalendarSelector,
} from '@calendar-tsx/react';

import type { State } from '../core/setup';

// #region view
export const Agenda = () => {
  const list = useCalendarSelector((state: State) => state.layout);

  if (list.kind !== 'list') return null;

  return (
    <ListView model={list}>
      {list.days.map(day => (
        <ListViewDay key={day.key} day={day}>
          <ListViewDayHeader day={day} aria-label={day.date.toLocaleString('en-US', { dateStyle: 'full' })}>
            <time dateTime={day.date.toString()}>
              <strong>{day.date.toLocaleString('en-US', { day: 'numeric' })}</strong>{' '}
              <span>
                <span>{day.date.toLocaleString('en-US', { weekday: 'short' })}</span>{' '}
                <span>{day.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
              </span>
            </time>
          </ListViewDayHeader>
          {day.events.map(event => (
            <ListViewEvent key={event.id} event={event}>
              {event.data.title}
            </ListViewEvent>
          ))}
        </ListViewDay>
      ))}
      <ListViewEmpty>No events this week</ListViewEmpty>
    </ListView>
  );
};
// #endregion view
