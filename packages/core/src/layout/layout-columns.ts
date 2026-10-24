import type { Temporal } from 'temporal-polyfill';
import { calendarEvents_overlaps } from '#calendar-events';
import type { Calendar_DayGridColumn, Calendar_Event, Calendar_Resource } from '#calendar.types';

export const layoutColumns_matches = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || (event.resourceIds ?? []).includes(resource.id);

export const layoutColumns_matchesBackground = <TData, TResourceData>(
  event: Calendar_Event<TData>,
  resource?: Calendar_Resource<TResourceData>,
) => !resource || !event.resourceIds || event.resourceIds.includes(resource.id);

/** A bar may cross adjacent columns of one resource; date-first groups split it at each resource boundary. */
export const layoutColumns_place = <TData, TResourceData, TSpan extends { colStart: number }>(
  columns: Calendar_DayGridColumn<TResourceData>[],
  groups: (Calendar_Resource<TResourceData> | undefined)[],
  eventsOf: (resource?: Calendar_Resource<TResourceData>) => Calendar_Event<TData>[],
  place: (events: Calendar_Event<TData>[], dates: Temporal.PlainDate[], keyPrefix: string) => TSpan[],
  keyPrefix = 'all-day',
) =>
  groups.flatMap(resource => {
    const groupColumns = columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => column.resource === resource);
    const offset = groupColumns[0]?.index ?? 0;
    const contiguous = groupColumns.every(({ index }, position) => index === offset + position);
    const events = eventsOf(resource);
    if (contiguous)
      return place(
        events,
        groupColumns.map(({ column }) => column.date),
        `${keyPrefix}:${resource?.id ?? 'all'}`,
      ).map(span => ({ ...span, colStart: span.colStart + offset }));
    return groupColumns.flatMap(({ column, index }) =>
      place(
        events.filter(event => calendarEvents_overlaps(event, { start: column.date, end: column.date })),
        [column.date],
        `${keyPrefix}:${column.key}`,
      ).map(span => ({ ...span, colStart: index })),
    );
  });
