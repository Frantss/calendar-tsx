import { createCalendar, createCalendarInteractionBindings, timeGridSurface } from '@calendar-tsx/core';
import type { Calendar_EventInput } from '@calendar-tsx/core';
import { features, views, initialDate, initialEvents, eventRelocationPolicy } from './interactions';
import type { Booking } from './interactions';

// #region setup
export function mountEditableCalendar(root: HTMLElement) {
  let events = initialEvents;
  const replaceEvent = (after: Calendar_EventInput<Booking>): void => {
    events = events.map(event => (event.id === after.id ? after : event));
    calendar['~update']({ ...calendar.options, events });
  };
  const calendar = createCalendar({
    features,
    views,
    eventRelocationPolicy,
    view: 'day',
    date: initialDate,
    timeZone: 'UTC',
    events,
    onNavigate: (next): void =>
      calendar['~update']({
        ...calendar.options,
        view: next.view,
        date: next.date,
      }),
    onEventMove: ({ after }) => replaceEvent(after),
    onEventResize: ({ after }) => replaceEvent(after),
  });
  const releaseCalendar = calendar['~mount']();
  const bindings = createCalendarInteractionBindings(calendar);
  bindings.root(root);
  const releaseBindings = bindings.mount();

  return {
    calendar,
    bindings,
    destroy() {
      releaseBindings();
      bindings.root(null);
      releaseCalendar();
    },
  };
}
// #endregion setup

// #region bindings
export function attachTimedEvent(
  bindings: ReturnType<typeof createCalendarInteractionBindings>,
  columnElement: HTMLElement,
  columnKey: string,
  eventElement: HTMLElement,
  handleElement: HTMLElement,
  segmentKey: string,
  eventId: string,
  resourceId?: string,
) {
  const surface = bindings.surface(timeGridSurface(columnKey));
  const source = bindings.source(segmentKey, { eventId, resourceId });
  const handle = bindings.source(`${segmentKey}:end`, { eventId, resourceId, edge: 'end' });
  surface(columnElement);
  source(eventElement);
  handle(handleElement);
  return () => {
    handle(null);
    source(null);
    surface(null);
  };
}
// #endregion bindings
