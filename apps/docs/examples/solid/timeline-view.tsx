import {
  TimelineView,
  TimelineViewBody,
  TimelineViewDayHeader,
  TimelineViewDayTrigger,
  TimelineViewEvent,
  TimelineViewHeader,
  TimelineViewLane,
  TimelineViewNowIndicator,
  TimelineViewResource,
  TimelineViewRow,
  TimelineViewSlotLabel,
  TimelineViewUnavailable,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';

// #region view
export const Timeline = () => {
  const timeline = useLayout('timeline');

  return (
    <Show when={timeline()}>
      {timeline => (
        <TimelineView model={timeline()}>
          <TimelineViewHeader>
            <For each={timeline().days}>
              {day => (
                <TimelineViewDayHeader day={day}>
                  <TimelineViewDayTrigger day={day} view='day'>
                    {day.date.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
                  </TimelineViewDayTrigger>
                </TimelineViewDayHeader>
              )}
            </For>
            <For each={timeline().slots}>
              {slot => (
                <TimelineViewSlotLabel slot={slot}>
                  {slot.time.toLocaleString('en-US', { hour: 'numeric' })}
                </TimelineViewSlotLabel>
              )}
            </For>
          </TimelineViewHeader>
          <TimelineViewBody>
            <For each={timeline().rows}>
              {row => (
                <TimelineViewRow row={row}>
                  <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
                  <TimelineViewLane row={row}>
                    <For each={row.unavailable}>{segment => <TimelineViewUnavailable segment={segment} />}</For>
                    <For each={row.segments}>
                      {segment => <TimelineViewEvent segment={segment}>{segment.event.data.title}</TimelineViewEvent>}
                    </For>
                  </TimelineViewLane>
                </TimelineViewRow>
              )}
            </For>
            <TimelineViewNowIndicator model={timeline()} />
          </TimelineViewBody>
        </TimelineView>
      )}
    </Show>
  );
};
// #endregion view
