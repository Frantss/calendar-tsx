import type { Calendar_Event, Calendar_MonthDay, Calendar_TimeGridSegment } from '@calendar-tsx/core';
import { ListViewEvent, MonthViewDay, TimeGridViewEvent } from '@calendar-tsx/solid';

import type { Booking } from '../core/setup';

// #region props
export const ColoredEvent = (props: { segment: Calendar_TimeGridSegment<Booking> }) => (
  <TimeGridViewEvent segment={props.segment} class='event' style={{ background: props.segment.event.data.color }}>
    {props.segment.event.data.title}
  </TimeGridViewEvent>
);
// #endregion props

// #region function
export const LinkedEvent = (props: { event: Calendar_Event<Booking> }) => (
  <ListViewEvent
    event={props.event}
    render={(partProps, event) => <a {...partProps({ href: `/bookings/${event().id}` })} />}
  >
    {props.event.data.title}
  </ListViewEvent>
);
// #endregion function

// #region state
export const TitledDay = (props: { day: Calendar_MonthDay<Booking> }) => (
  <MonthViewDay
    day={props.day}
    render={(partProps, day) => <div {...partProps({ title: day().isToday ? 'Today' : undefined })} />}
  />
);
// #endregion state
