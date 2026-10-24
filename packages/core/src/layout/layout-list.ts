import { calendarEvents_overlaps } from '#calendar-events';
import type {
  Calendar_Event,
  Calendar_ListLayout,
  Calendar_ListViewSettings,
  Calendar_FirstDayOfWeek,
  Calendar_Range,
} from '#calendar.types';
import { layoutCoordinates_dates } from '#layout/layout-coordinates';

/** Only days with events are listed (D18). */
export const layoutList_build = <TData>({
  range,
  events,
  definition,
  firstDayOfWeek,
}: {
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  definition: Calendar_ListViewSettings;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_ListLayout<TData> => {
  const coordinates = layoutCoordinates_dates(range, definition, firstDayOfWeek);
  return {
    kind: 'list',
    coordinates,
    days: coordinates.dates
      .map(date => ({
        key: date.toString(),
        date,
        events: events.filter(event => calendarEvents_overlaps(event, { start: date, end: date })),
      }))
      .filter(day => day.events.length > 0),
  };
};
