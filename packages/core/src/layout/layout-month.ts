import type { Temporal } from 'temporal-polyfill';

import { calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_contains, calendarNavigation_days } from '#calendar-navigation';
import type {
  Calendar_Event,
  Calendar_MonthLayout,
  Calendar_MonthViewDefinition,
  Calendar_MonthWeek,
  Calendar_Range,
} from '#calendar.types';
import { layoutBars_build, layoutBars_rows } from '#layout/layout-bars';

export const layoutMonth_build = <TData>({
  definition,
  range,
  period,
  events,
  today,
}: {
  definition: Calendar_MonthViewDefinition;
  range: Calendar_Range;
  period: Calendar_Range;
  events: Calendar_Event<TData>[];
  today: Temporal.PlainDate;
}): Calendar_MonthLayout<TData> => {
  const days = calendarNavigation_days(range);
  const weeks: Calendar_MonthWeek<TData>[] = [];

  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];

    if (!first || !last) continue;

    const weekEvents = events.filter(event => calendarEvents_overlaps(event, { start: first, end: last }));
    const segments = layoutBars_build(weekEvents, weekDays, first.toString());
    const isHidden = (segment: { row: number }) => segment.row >= definition.maxEventsPerDay;

    weeks.push({
      key: first.toString(),
      segments: segments.filter(segment => !isHidden(segment)),
      rows: Math.min(definition.maxEventsPerDay, layoutBars_rows(segments)),
      days: weekDays.map((date, col) => {
        const hiddenCount = segments.filter(
          segment => isHidden(segment) && col >= segment.colStart && col < segment.colStart + segment.colSpan,
        ).length;

        return {
          key: date.toString(),
          date,
          isOutside: !calendarNavigation_contains(period, date),
          isToday: date.equals(today),
          hiddenCount,
          hasMore: hiddenCount > 0 || (definition.dayOverflow?.(date) ?? false),
          events: weekEvents.filter(event => calendarEvents_overlaps(event, { start: date, end: date })),
        };
      }),
    });
  }

  return { kind: 'month', weekdays: days.slice(0, 7), weeks };
};
