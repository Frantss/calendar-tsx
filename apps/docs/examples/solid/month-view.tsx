import {
  MonthView,
  MonthViewDay,
  MonthViewDayTrigger,
  MonthViewHeader,
  MonthViewHeaderCell,
  MonthViewOverflow,
  MonthViewWeek,
  MonthViewWeekBackgroundEvent,
  MonthViewWeekEvent,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Month = (props: { onOverflow: (date: string) => void }) => {
  const month = useLayout('month');

  return (
    <Show when={month()}>
      {month => (
        <MonthView model={month()}>
          <MonthViewHeader>
            <For each={month().weekdays}>
              {weekday => (
                <MonthViewHeaderCell weekday={weekday}>
                  {weekday.toLocaleString('en-US', { weekday: 'short' })}
                </MonthViewHeaderCell>
              )}
            </For>
          </MonthViewHeader>
          <For each={month().weeks}>
            {week => (
              <MonthViewWeek week={week}>
                <For each={week.days}>
                  {day => (
                    <MonthViewDay day={day}>
                      <MonthViewDayTrigger day={day} view='day'>
                        {day.date.day}
                      </MonthViewDayTrigger>
                      <MonthViewOverflow day={day} onClick={() => props.onOverflow(day.date.toString())}>
                        {day.hiddenCount} more
                      </MonthViewOverflow>
                    </MonthViewDay>
                  )}
                </For>
                <For each={week.backgroundEvents}>{segment => <MonthViewWeekBackgroundEvent segment={segment} />}</For>
                <For each={week.segments}>
                  {segment => <MonthViewWeekEvent segment={segment}>{segment.event.data.title}</MonthViewWeekEvent>}
                </For>
              </MonthViewWeek>
            )}
          </For>
        </MonthView>
      )}
    </Show>
  );
};
// #endregion view
