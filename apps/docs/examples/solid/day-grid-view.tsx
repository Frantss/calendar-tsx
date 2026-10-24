import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridViewWeek,
  DayGridViewWeekBackgroundEvent,
  DayGridViewWeekEvent,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const DayGrid = (props: { onOverflow: (date: string) => void }) => {
  const grid = useLayout('dayGrid');

  return (
    <Show when={grid()}>
      {grid => (
        <DayGridView model={grid()}>
          <DayGridViewHeader>
            <For each={grid().weekdays}>
              {weekday => (
                <DayGridViewHeaderCell weekday={weekday}>
                  {weekday.toLocaleString('en-US', { weekday: 'short' })}
                </DayGridViewHeaderCell>
              )}
            </For>
          </DayGridViewHeader>
          <For each={grid().weeks}>
            {week => (
              <DayGridViewWeek week={week}>
                <For each={week.days}>
                  {day => (
                    <DayGridViewDay day={day}>
                      <DayGridViewDayTrigger day={day} view='day'>
                        {day.date.day}
                      </DayGridViewDayTrigger>
                      <DayGridViewOverflow day={day} onClick={() => props.onOverflow(day.date.toString())}>
                        {day.hiddenCount} more
                      </DayGridViewOverflow>
                    </DayGridViewDay>
                  )}
                </For>
                <For each={week.backgroundEvents}>
                  {segment => <DayGridViewWeekBackgroundEvent segment={segment} />}
                </For>
                <For each={week.segments}>
                  {segment => <DayGridViewWeekEvent segment={segment}>{segment.event.data.title}</DayGridViewWeekEvent>}
                </For>
              </DayGridViewWeek>
            )}
          </For>
        </DayGridView>
      )}
    </Show>
  );
};
// #endregion view
