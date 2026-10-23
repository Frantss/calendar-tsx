import { calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_days } from '#calendar-navigation';
import type { Calendar_Event, Calendar_ListLayout, Calendar_Range } from '#calendar.types';

/** Only days with events are listed (D18). */
export const layoutList_build = <TData>({
  range,
  events,
}: {
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
}): Calendar_ListLayout<TData> => ({
  kind: 'list',
  days: calendarNavigation_days(range)
    .map(date => ({
      key: date.toString(),
      date,
      events: events.filter(event => calendarEvents_overlaps(event, { start: date, end: date })),
    }))
    .filter(day => day.events.length > 0),
});
