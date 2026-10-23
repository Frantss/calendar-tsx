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
                <ListViewDayHeader day={day}>
                  {day.date.toLocaleString('en-US', { dateStyle: 'full' })}
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
