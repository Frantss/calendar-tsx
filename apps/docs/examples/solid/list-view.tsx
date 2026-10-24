import { ListView, ListViewDay, ListViewDayHeader, ListViewEmpty, ListViewEvent } from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Agenda = () => {
  const list = useLayout('list');

  return (
    <Show when={list()}>
      {list => (
        <ListView model={list()}>
          <For each={list().days}>
            {day => (
              <ListViewDay day={day}>
                <ListViewDayHeader day={day} aria-label={day.date.toLocaleString('en-US', { dateStyle: 'full' })}>
                  <time dateTime={day.date.toString()}>
                    <strong>{day.date.toLocaleString('en-US', { day: 'numeric' })}</strong>{' '}
                    <span>
                      <span>{day.date.toLocaleString('en-US', { weekday: 'short' })}</span>{' '}
                      <span>{day.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </span>
                  </time>
                </ListViewDayHeader>
                <For each={day.events}>{event => <ListViewEvent event={event}>{event.data.title}</ListViewEvent>}</For>
              </ListViewDay>
            )}
          </For>
          <ListViewEmpty>No events this week</ListViewEmpty>
        </ListView>
      )}
    </Show>
  );
};
// #endregion view
