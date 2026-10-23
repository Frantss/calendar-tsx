import {
  TimeGridView,
  TimeGridViewAllDay,
  TimeGridViewAllDayEvent,
  TimeGridViewAxis,
  TimeGridViewAxisLabel,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Week = () => {
  const grid = useLayout('timeGrid');

  return (
    <Show when={grid()}>
      {grid => (
        <TimeGridView model={grid()}>
          <TimeGridViewHeader>
            <For each={grid().columns}>
              {column => (
                <TimeGridViewColumnHeader column={column}>
                  <TimeGridViewColumnTrigger column={column} view='day'>
                    {column.date.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
                  </TimeGridViewColumnTrigger>
                </TimeGridViewColumnHeader>
              )}
            </For>
          </TimeGridViewHeader>
          <Show when={grid().allDay}>
            {allDay => (
              <TimeGridViewAllDay>
                <For each={allDay().segments}>
                  {segment => (
                    <TimeGridViewAllDayEvent segment={segment}>{segment.event.data.title}</TimeGridViewAllDayEvent>
                  )}
                </For>
              </TimeGridViewAllDay>
            )}
          </Show>
          <TimeGridViewBody model={grid()}>
            <TimeGridViewAxis>
              <For each={grid().slots}>
                {slot => (
                  <TimeGridViewAxisLabel slot={slot}>
                    {slot.time.minute === 0 ? slot.time.toLocaleString('en-US', { hour: 'numeric' }) : null}
                  </TimeGridViewAxisLabel>
                )}
              </For>
            </TimeGridViewAxis>
            <For each={grid().columns}>
              {column => (
                <TimeGridViewColumn column={column}>
                  <For each={column.segments}>
                    {segment => <TimeGridViewEvent segment={segment}>{segment.event.data.title}</TimeGridViewEvent>}
                  </For>
                  <TimeGridViewNowIndicator column={column} />
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
