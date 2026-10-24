import type { Temporal } from 'temporal-polyfill';
import { calendarEvents_isAllDay, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_contains, calendarNavigation_days } from '#calendar-navigation';
import {
  calendarPeriods_groups,
  calendarPeriods_hiddenDays,
  calendarPeriods_months,
  calendarPeriods_pad,
} from '#calendar-periods';
import type {
  Calendar_DayGridColumn,
  Calendar_DayGridLayout,
  Calendar_DayGridRow,
  Calendar_DayGridSection,
  Calendar_DayGridViewSettings,
  Calendar_FirstDayOfWeek,
  Calendar_LayoutInput,
  Calendar_Range,
  Calendar_Resource,
} from '#calendar.types';
import { layoutCoordinates_dates } from '#layout/layout-coordinates';
import { layoutBars_background, layoutBars_build, layoutBars_rows } from '#layout/layout-bars';
import { layoutColumns_matches, layoutColumns_matchesBackground, layoutColumns_place } from '#layout/layout-columns';
import { layoutIntervals_day } from '#layout/layout-intervals';

type SectionRange<TResourceData> = {
  period: Calendar_Range;
  range: Calendar_Range;
  month?: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
};

const sections_of = <TResourceData>(
  definition: Calendar_DayGridViewSettings,
  period: Calendar_Range,
  range: Calendar_Range,
  firstDayOfWeek: Calendar_FirstDayOfWeek,
  resources: Calendar_Resource<TResourceData>[],
): SectionRange<TResourceData>[] => {
  const groups = calendarPeriods_groups(definition.groupBy);
  if (!groups.includes('month')) return [{ period, range }];
  const months = calendarPeriods_months(period).map(month => {
    const monthPeriod = { start: month, end: month.with({ day: month.daysInMonth }) };
    return {
      month,
      period: monthPeriod,
      range: calendarPeriods_pad(monthPeriod, firstDayOfWeek, definition.fixedWeekCount),
    };
  });
  return groups[0] === 'resource'
    ? resources.flatMap(resource => months.map(month => ({ ...month, resource })))
    : months;
};

export const layoutDayGrid_build = <TData, TResourceData>({
  definition,
  range,
  period,
  events,
  backgroundEvents,
  resources,
  timeZone,
  today,
  firstDayOfWeek,
}: Calendar_LayoutInput<TData, TResourceData> & {
  definition: Calendar_DayGridViewSettings;
  today: Temporal.PlainDate;
}): Calendar_DayGridLayout<TData, TResourceData> => {
  const coordinates = layoutCoordinates_dates(range, definition, firstDayOfWeek);
  const hiddenDays = calendarPeriods_hiddenDays(range, definition);
  const groupedResources = calendarPeriods_groups(definition.groupBy).includes('resource');
  const allDayBackgrounds = backgroundEvents.filter(calendarEvents_isAllDay);
  const sections = sections_of(definition, period, range, firstDayOfWeek, resources).map(
    (section): Calendar_DayGridSection<TData, TResourceData> => {
      const key = `${section.resource?.id ?? 'all'}:${section.period.start.toString()}`;
      const dates = calendarNavigation_days(section.range);
      const chunkSize = definition.days !== undefined ? dates.length : 7;
      const resourceGroups = section.resource ? [section.resource] : groupedResources ? resources : [undefined];
      const rows: Calendar_DayGridRow<TData, TResourceData>[] = [];
      for (let index = 0; index < dates.length; index += chunkSize) {
        const rowDates = dates.slice(index, index + chunkSize);
        const visible = rowDates.filter(date => !hiddenDays.some(day => day === date.dayOfWeek));
        const rowStart = rowDates[0];
        if (!rowStart) continue;
        const pairs =
          definition.groupOrder === 'date-first'
            ? visible.flatMap(date => resourceGroups.map(resource => ({ date, resource })))
            : resourceGroups.flatMap(resource => visible.map(date => ({ date, resource })));
        const columns: Calendar_DayGridColumn<TResourceData>[] = pairs.map(({ date, resource }) => ({
          key: resource ? `${resource.id}:${date.toString()}` : date.toString(),
          date,
          resource,
        }));
        if (!columns.length) continue;
        const rowKey = rowStart.toString();
        const rowRange = { start: rowStart, end: rowDates[rowDates.length - 1] ?? rowStart };
        const rowEvents = events.filter(event => calendarEvents_overlaps(event, rowRange));
        const segments = layoutColumns_place(
          columns,
          resourceGroups,
          resource => rowEvents.filter(event => layoutColumns_matches(event, resource)),
          layoutBars_build,
          `${key}:${rowKey}`,
        );
        const isHidden = (segment: { row: number }) => segment.row >= definition.maxEventsPerDay;
        rows.push({
          key: rowKey,
          columnCount: columns.length,
          segments: segments.filter(segment => !isHidden(segment)),
          backgroundEvents: layoutColumns_place(
            columns,
            resourceGroups,
            resource => allDayBackgrounds.filter(event => layoutColumns_matchesBackground(event, resource)),
            layoutBars_background,
            `${key}:${rowKey}`,
          ),
          stackCount: Math.min(definition.maxEventsPerDay, layoutBars_rows(segments)),
          days: columns.map((column, col) => {
            const hiddenCount = segments.filter(
              segment => isHidden(segment) && col >= segment.colStart && col < segment.colStart + segment.colSpan,
            ).length;
            const day = layoutIntervals_day(column.date, timeZone);
            return {
              ...column,
              isOutside: !calendarNavigation_contains(section.period, column.date),
              isToday: column.date.equals(today),
              isUnavailable:
                !!column.resource &&
                !column.resource.availability.some(
                  interval =>
                    interval.start.epochMilliseconds < day.endMs && interval.end.epochMilliseconds > day.startMs,
                ),
              hiddenCount,
              hasMore: hiddenCount > 0 || (definition.dayOverflow?.(column.date, column.resource?.id) ?? false),
              events: rowEvents.filter(
                event =>
                  layoutColumns_matches(event, column.resource) &&
                  calendarEvents_overlaps(event, { start: column.date, end: column.date }),
              ),
            };
          }),
        });
      }
      const columns =
        rows[0]?.days.map(({ key: columnKey, date, resource }) => ({ key: columnKey, date, resource })) ?? [];
      return { ...section, key, columns, columnCount: columns.length, rows };
    },
  );
  return { kind: 'dayGrid', coordinates, sections };
};
