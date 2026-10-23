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
          <ListViewDayHeader day={day}>{day.date.toLocaleString('en-US', { dateStyle: 'full' })}</ListViewDayHeader>
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
