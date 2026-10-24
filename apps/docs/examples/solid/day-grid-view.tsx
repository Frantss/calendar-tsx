import {
  DayGridViewSectionHeader,
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridViewRow,
  DayGridViewRowBackgroundEvent,
  DayGridViewRowEvent,
  DayGridViewSection,
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
          <For each={grid().sections}>
            {section => (
              <DayGridViewSection section={section}>
                {section.month || section.resource ? (
                  <DayGridViewSectionHeader>
                    {section.resource?.title}{' '}
                    {section.month?.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </DayGridViewSectionHeader>
                ) : null}

                <DayGridViewHeader>
                  <For each={section.columns}>
                    {column => (
                      <DayGridViewHeaderCell column={column}>
                        {column.resource?.title} {column.date.toLocaleString('en-US', { weekday: 'short' })}
                      </DayGridViewHeaderCell>
                    )}
                  </For>
                </DayGridViewHeader>
                <For each={section.rows}>
                  {week => (
                    <DayGridViewRow row={week}>
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
                        {segment => <DayGridViewRowBackgroundEvent segment={segment} />}
                      </For>
                      <For each={week.segments}>
                        {segment => (
                          <DayGridViewRowEvent segment={segment}>{segment.event.data.title}</DayGridViewRowEvent>
                        )}
                      </For>
                    </DayGridViewRow>
                  )}
                </For>
              </DayGridViewSection>
            )}
          </For>
        </DayGridView>
      )}
    </Show>
  );
};
// #endregion view
