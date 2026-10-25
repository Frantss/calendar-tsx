import {
  TimelineView,
  TimelineViewBackground,
  TimelineViewBackgroundEvent,
  TimelineViewBody,
  TimelineViewDayHeader,
  TimelineViewDayTrigger,
  TimelineViewEvent,
  TimelineViewHeader,
  TimelineViewLane,
  TimelineViewNowIndicator,
  TimelineViewResource,
  TimelineViewResourceToggle,
  TimelineViewRow,
  TimelineViewSlotLabel,
  TimelineViewUnavailable,
} from '@calendar-tsx/solid';
import { For, Show } from 'solid-js';

import { useLayout } from './layouts';
import { formatEvent } from '../core/format-event';
import type { DayCalendar } from '../core/setup';

// #region view
export const Timeline = (props: { calendar: DayCalendar }) => {
  const timeline = useLayout('timeline');

  return (
    <Show when={timeline()}>
      {timeline => (
        <TimelineView model={timeline()}>
          <TimelineViewHeader>
            <For each={timeline().days}>
              {day => (
                <TimelineViewDayHeader day={day}>
                  <TimelineViewDayTrigger calendar={props.calendar} day={day} view='day'>
                    {day.date.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
                  </TimelineViewDayTrigger>
                </TimelineViewDayHeader>
              )}
            </For>
            <Show when={timeline().days.some(day => day.colSpan > 1)}>
              <For each={timeline().slots}>
                {slot => (
                  <TimelineViewSlotLabel slot={slot}>
                    {slot.time.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </TimelineViewSlotLabel>
                )}
              </For>
            </Show>
          </TimelineViewHeader>
          <TimelineViewBody>
            <For each={timeline().rows}>
              {row => (
                <TimelineViewRow row={row}>
                  <TimelineViewResource row={row}>
                    <Show when={props.calendar.api.resourceExpansion}>
                      {expansion => (
                        <TimelineViewResourceToggle row={row} calendar={{ api: { resourceExpansion: expansion() } }}>
                          <span aria-hidden='true'>{row.isExpanded ? '−' : '+'}</span>
                        </TimelineViewResourceToggle>
                      )}
                    </Show>
                    {row.resource?.title}
                  </TimelineViewResource>
                  <TimelineViewLane row={row}>
                    <For each={row.backgrounds}>{background => <TimelineViewBackground background={background} />}</For>
                    <For each={row.backgroundEvents}>
                      {segment => <TimelineViewBackgroundEvent segment={segment} />}
                    </For>
                    <For each={row.unavailable}>{segment => <TimelineViewUnavailable segment={segment} />}</For>
                    <For each={row.segments}>
                      {segment => (
                        <TimelineViewEvent
                          segment={segment}
                          title={formatEvent(segment.event)}
                          aria-label={formatEvent(segment.event)}
                        >
                          {segment.event.data.title}
                        </TimelineViewEvent>
                      )}
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
