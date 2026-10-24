import type { Calendar_Event, Calendar_DayGridDay, Calendar_TimeGridSegment } from '@calendar-tsx/core';
import { ListViewEvent, DayGridViewDay, TimeGridViewEvent } from '@calendar-tsx/react';

import type { Booking } from '../core/setup';

// #region props
export const ColoredEvent = ({ segment }: { segment: Calendar_TimeGridSegment<Booking> }) => (
  <TimeGridViewEvent segment={segment} className='event' style={{ background: segment.event.data.color }}>
    {segment.event.data.title}
  </TimeGridViewEvent>
);
// #endregion props

// #region element
export const LinkedEvent = ({ event }: { event: Calendar_Event<Booking> }) => (
  <ListViewEvent event={event} render={<a href={`/bookings/${event.id}`} />}>
    {event.data.title}
  </ListViewEvent>
);
// #endregion element

// #region function
export const TitledDay = ({ day }: { day: Calendar_DayGridDay<Booking> }) => (
  <DayGridViewDay day={day} render={(props, state) => <div {...props} title={state.isToday ? 'Today' : undefined} />} />
);
// #endregion function
