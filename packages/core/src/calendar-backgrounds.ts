import { Temporal } from 'temporal-polyfill';

import type {
  Calendar_BackgroundLayer,
  Calendar_BackgroundRange,
  Calendar_BackgroundSegment,
  Calendar_DayBackground,
  Calendar_Feature,
  Calendar_MonthLayout,
  Calendar_Range,
  Calendar_TimeGridLayout,
  Calendar_WeeklyRule,
} from '#calendar.types';
import type { LayoutIntervals_Interval } from '#layout/layout-intervals';
import {
  layoutCoordinates_coverFragments,
  layoutCoordinates_length,
  layoutCoordinates_projectTime,
} from '#layout/layout-coordinates';
import { layoutIntervals_complement, layoutIntervals_day } from '#layout/layout-intervals';

/** Returns `layer` unchanged; it types the layer where it is written and keeps `kind` a literal (D33). */
export const createBackgroundLayer = <const TKind extends string>(
  layer: Calendar_BackgroundLayer<TKind>,
): Calendar_BackgroundLayer<TKind> => layer;

/** Weekly rules as a layer's `ranges` function; module scope keeps its reference stable (D24). */
export const createWeeklyRanges =
  (rules: Calendar_WeeklyRule[]) =>
  (range: Calendar_Range, timeZone: string): Calendar_BackgroundRange[] => {
    const ranges: Calendar_BackgroundRange[] = [];

    // From the day before, so a rule ending after midnight reaches the first visible day.
    for (
      let date = range.start.subtract({ days: 1 });
      Temporal.PlainDate.compare(date, range.end) <= 0;
      date = date.add({ days: 1 })
    )
      for (const rule of rules) {
        if (!rule.daysOfWeek.includes(date.dayOfWeek as Calendar_WeeklyRule['daysOfWeek'][number])) continue;

        const endDate = Temporal.PlainTime.compare(rule.endTime, rule.startTime) <= 0 ? date.add({ days: 1 }) : date;

        ranges.push({
          start: date.toZonedDateTime({ timeZone, plainTime: rule.startTime }),
          end: endDate.toZonedDateTime({ timeZone, plainTime: rule.endTime }),
        });
      }

    return ranges;
  };

const layers_resolve = (layers: Calendar_BackgroundLayer[], range: Calendar_Range, timeZone: string) =>
  layers.map(layer => ({
    layer,
    ranges: typeof layer.ranges === 'function' ? layer.ranges(range, timeZone) : layer.ranges,
  }));

const appliesTo = (layer: Calendar_BackgroundLayer, resourceId: string | undefined) =>
  !layer.resourceIds || (resourceId !== undefined && layer.resourceIds.includes(resourceId));

const timeGrid_decorate = (
  grid: Calendar_TimeGridLayout<unknown, unknown>,
  layers: Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const plan = grid.coordinates;
  const length = layoutCoordinates_length(plan);
  const resolved = plan.dates.dates.length
    ? layers_resolve(layers, plan.dates.inputRange, timeZone).map(({ layer, ranges }) => ({
        layer,
        allDay: ranges.filter(
          (range): range is Extract<Calendar_BackgroundRange, { allDay: true }> => 'allDay' in range,
        ),
        fragments: ranges.flatMap((range, index) =>
          'allDay' in range
            ? []
            : layoutCoordinates_projectTime(
                plan,
                { start: range.start.toInstant(), end: range.end.toInstant() },
                `${layer.id}:${index}`,
              ),
        ),
      }))
    : [];
  return {
    ...grid,
    columns: grid.columns.map(column => {
      const dateIndex = plan.dates.indexByDate.get(column.date.toString()) as number;
      const backgrounds = resolved.flatMap(({ layer, allDay, fragments }): Calendar_BackgroundSegment[] => {
        if (!appliesTo(layer, column.resource?.id)) return [];
        const full = allDay.some(
          range =>
            Temporal.PlainDate.compare(range.start, column.date) <= 0 &&
            Temporal.PlainDate.compare(range.end ?? range.start, column.date) >= 0,
        );
        const covered = full
          ? [{ startMs: 0, endMs: length }]
          : layoutCoordinates_coverFragments(plan, fragments, dateIndex);
        return (layer.inverse ? layoutIntervals_complement(covered, { startMs: 0, endMs: length }) : covered).map(
          interval => ({
            key: `${column.key}:${layer.id}:${interval.startMs}`,
            layer: layer.id,
            kind: layer.kind,
            start: interval.startMs / length,
            span: (interval.endMs - interval.startMs) / length,
          }),
        );
      });
      return { ...column, backgrounds };
    }),
  };
};

/**
 * A month day takes a layer's all-day ranges; timed ranges only matter to inverse layers, which shade the days
 * nothing in the layer touches (a business-hours layer shades the closed days). Month days have no resource, so
 * layers limited to resources are skipped.
 */
const month_decorate = (month: Calendar_MonthLayout<unknown>, layers: Calendar_BackgroundLayer[], timeZone: string) => {
  const range = month.coordinates.dates.length ? month.coordinates.inputRange : undefined;
  const resolved = range ? layers_resolve(layers, range, timeZone).filter(({ layer }) => !layer.resourceIds) : [];

  return {
    ...month,
    weeks: month.weeks.map(week => ({
      ...week,
      days: week.days.map(day => {
        const interval = layoutIntervals_day(day.date, timeZone);
        const touches = (item: LayoutIntervals_Interval) =>
          item.startMs < interval.endMs && item.endMs > interval.startMs;

        const backgrounds = resolved.flatMap(({ layer, ranges }): Calendar_DayBackground[] => {
          const allDayTouches = (range: Extract<Calendar_BackgroundRange, { allDay: true }>) =>
            Temporal.PlainDate.compare(range.start, day.date) <= 0 &&
            Temporal.PlainDate.compare(range.end ?? range.start, day.date) >= 0;
          const shaded = layer.inverse
            ? !ranges.some(range =>
                'allDay' in range
                  ? allDayTouches(range)
                  : touches({ startMs: range.start.epochMilliseconds, endMs: range.end.epochMilliseconds }),
              )
            : ranges.some(range => 'allDay' in range && allDayTouches(range));

          return shaded ? [{ key: `${day.key}:${layer.id}`, layer: layer.id, kind: layer.kind }] : [];
        });

        return { ...day, backgrounds };
      }),
    })),
  };
};

/** Shades time from `backgrounds` layers in the time-grid and month views that list it (D33). */
export const backgroundFeature = {
  trackedOptions: ['backgrounds'],
  decorate: {
    deps: context => [context.options.backgrounds, context.options.timeZone],
    run: (layout, context) => {
      const layers = context.options.backgrounds ?? [];
      const { timeZone } = context.options;

      if (layout.kind === 'timeGrid')
        return timeGrid_decorate(layout as Calendar_TimeGridLayout<unknown, unknown>, layers, timeZone);
      if (layout.kind === 'month') return month_decorate(layout as Calendar_MonthLayout<unknown>, layers, timeZone);

      return layout;
    },
  },
} satisfies Calendar_Feature;
