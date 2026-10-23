import {
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewUnavailable,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Rooms = () => {
  const grid = useLayout('timeGrid');

  return (
    <Show when={grid()}>
      {grid => (
        <TimeGridView model={grid()}>
          <TimeGridViewHeader>
            <For each={grid().columns}>
              {column => (
                <TimeGridViewColumnHeader column={column}>
                  {column.resource?.title}
                  {column.isUnavailable && ' (closed)'}
                </TimeGridViewColumnHeader>
              )}
            </For>
          </TimeGridViewHeader>
          <TimeGridViewBody model={grid()}>
            <For each={grid().columns}>
              {column => (
                <TimeGridViewColumn column={column}>
                  <For each={column.unavailable}>{segment => <TimeGridViewUnavailable segment={segment} />}</For>
                  <For each={column.segments}>
                    {segment => <TimeGridViewEvent segment={segment}>{segment.event.data.title}</TimeGridViewEvent>}
                  </For>
                </TimeGridViewColumn>
              )}
            </For>
          </TimeGridViewBody>
        </TimeGridView>
      )}
    </Show>
  );
};
// #endregion view
