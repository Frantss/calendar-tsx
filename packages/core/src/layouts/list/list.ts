import type { Temporal } from 'temporal-polyfill';
import { calendarEvents_overlaps } from '#events/events';
import { calendarPeriods_groups } from '#views/periods';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Event } from '#events/event.types';
import type {
  Calendar_ListDay,
  Calendar_ListLayout,
  Calendar_ListSection,
  Calendar_ListViewSettings,
} from '#layouts/list/list.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import { layoutCoordinates_dates } from '#layouts/shared/coordinates';
import { layoutColumns_matches } from '#layouts/shared/columns';

export const layoutList_build = <TData, TResourceData>({
  range,
  events,
  resources,
  definition,
  firstDayOfWeek,
}: {
  range: Calendar_Range;
  events: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  definition: Calendar_ListViewSettings;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_ListLayout<TData, TResourceData> => {
  const coordinates = layoutCoordinates_dates(range, definition, firstDayOfWeek);
  const dates = coordinates.dates;
  const groups = calendarPeriods_groups(definition.groupBy);
  const byResource = groups.includes('resource');
  const day = (
    date: Temporal.PlainDate,
    resource?: Calendar_Resource<TResourceData>,
  ): Calendar_ListDay<TData, TResourceData> => ({
    key: resource ? JSON.stringify([date.toString(), resource.id]) : date.toString(),
    date,
    resource,
    events: events.filter(
      event => layoutColumns_matches(event, resource) && calendarEvents_overlaps(event, { start: date, end: date }),
    ),
  });
  let sections: Calendar_ListSection<TData, TResourceData>[];

  if (!byResource) {
    sections = [{ key: 'all', days: dates.map(date => day(date)) }];
  } else if (groups[0] === 'date') {
    sections = dates.map(date => ({
      key: date.toString(),
      date,
      days: resources.map(resource => day(date, resource)),
    }));
  } else {
    sections = resources.map(resource => ({
      key: JSON.stringify(['resource', resource.id]),
      resource,
      days: dates.map(date => day(date, resource)),
    }));
  }

  sections = sections
    .map(section => ({ ...section, days: section.days.filter(day => day.events.length > 0) }))
    .filter(section => section.days.length > 0);

  return { kind: 'list', coordinates, sections, days: sections.flatMap(section => section.days) };
};
