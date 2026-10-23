import type { Calendar_Event, Calendar_MonthDay, Calendar_TimeGridSegment } from '@calendar-tsx/core';
import { ListViewEvent, MonthViewDay, TimeGridViewEvent } from '@calendar-tsx/react';

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
export const TitledDay = ({ day }: { day: Calendar_MonthDay<Booking> }) => (
  <MonthViewDay day={day} render={(props, state) => <div {...props} title={state.isToday ? 'Today' : undefined} />} />
);
// #endregion function
