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
  TimelineViewRow,
  TimelineViewSlotLabel,
  TimelineViewUnavailable,
  useCalendarSelector,
} from '@calendar-tsx/react';

import type { Calendar_Event } from '@calendar-tsx/core';
import type { Booking, State } from '../core/setup';
import { formatEvent } from '../core/format-event';

// #region view
export const Timeline = ({
  locale = 'en-US',
  onSelect,
}: { locale?: string; onSelect?: (event: Calendar_Event<Booking>) => void } = {}) => {
  const timeline = useCalendarSelector((state: State) => state.layout);

  if (timeline.kind !== 'timeline') return null;

  return (
    <TimelineView model={timeline}>
      <TimelineViewHeader>
        {timeline.days.map(day => (
          <TimelineViewDayHeader key={day.key} day={day}>
            <TimelineViewDayTrigger day={day} view='day'>
              {day.date.toLocaleString(locale, { month: 'short', day: 'numeric' })}
            </TimelineViewDayTrigger>
          </TimelineViewDayHeader>
        ))}
        {timeline.days.some(day => day.colSpan > 1) &&
          timeline.slots.map(slot => (
            <TimelineViewSlotLabel key={slot.key} slot={slot}>
              {slot.time.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' })}
            </TimelineViewSlotLabel>
          ))}
      </TimelineViewHeader>
      <TimelineViewBody>
        {timeline.rows.map(row => (
          <TimelineViewRow key={row.key} row={row}>
            <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
            <TimelineViewLane row={row}>
              {row.backgrounds.map(background => (
                <TimelineViewBackground key={background.key} background={background} />
              ))}
              {row.backgroundEvents.map(segment => (
                <TimelineViewBackgroundEvent key={segment.key} segment={segment} />
              ))}
              {row.unavailable.map(segment => (
                <TimelineViewUnavailable key={segment.key} segment={segment} />
              ))}
              {row.segments.map(segment => (
                <TimelineViewEvent
                  key={segment.key}
                  segment={segment}
                  title={formatEvent(segment.event, locale)}
                  aria-label={formatEvent(segment.event, locale)}
                  onClick={() => onSelect?.(segment.event)}
                >
                  {segment.event.data.title}
                </TimelineViewEvent>
              ))}
            </TimelineViewLane>
          </TimelineViewRow>
        ))}
        <TimelineViewNowIndicator model={timeline} />
      </TimelineViewBody>
    </TimelineView>
  );
};
// #endregion view
