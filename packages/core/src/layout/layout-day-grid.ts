import type { Temporal } from 'temporal-polyfill';

import { calendarEvents_isAllDay, calendarEvents_overlaps } from '#calendar-events';
import { calendarNavigation_contains } from '#calendar-navigation';
import type {
  Calendar_Event,
  Calendar_DayGridLayout,
  Calendar_DayGridViewSettings,
  Calendar_DayGridWeek,
  Calendar_Range,
  Calendar_FirstDayOfWeek,
} from '#calendar.types';
import { layoutBars_background, layoutBars_build, layoutBars_rows } from '#layout/layout-bars';
import { layoutCoordinates_dates } from '#layout/layout-coordinates';

export const layoutDayGrid_build = <TData>({
  definition,
  range,
  period,
  events,
  backgroundEvents,
  today,
  firstDayOfWeek,
}: {
  definition: Calendar_DayGridViewSettings;
  range: Calendar_Range;
  period: Calendar_Range;
  events: Calendar_Event<TData>[];
  backgroundEvents: Calendar_Event<TData>[];
  today: Temporal.PlainDate;
  firstDayOfWeek?: Calendar_FirstDayOfWeek;
}): Calendar_DayGridLayout<TData> => {
  const coordinates = layoutCoordinates_dates(
    range,
    definition,
    firstDayOfWeek ?? (range.start.dayOfWeek as Calendar_FirstDayOfWeek),
  );
  const weeks: Calendar_DayGridWeek<TData>[] = [];
  // A timed background would tint a whole day for part of it, so the month shows all-day ones only (D37).
  const allDayBackground = backgroundEvents.filter(calendarEvents_isAllDay);

  for (const week of coordinates.weeks) {
    const weekDays = week.dateIndices.map(index => coordinates.dates[index]);
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];

    if (!first || !last) continue;

    const weekEvents = events.filter(event => calendarEvents_overlaps(event, { start: first, end: last }));
    const segments = layoutBars_build(weekEvents, weekDays, week.key);
    const isHidden = (segment: { row: number }) => segment.row >= definition.maxEventsPerDay;

    weeks.push({
      key: week.key,
      segments: segments.filter(segment => !isHidden(segment)),
      backgroundEvents: layoutBars_background(
        allDayBackground.filter(event => calendarEvents_overlaps(event, { start: first, end: last })),
        weekDays,
        week.key,
      ),
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

  return { kind: 'dayGrid', coordinates, weekdays: weeks[0]?.days.map(day => day.date) ?? [], weeks };
};
