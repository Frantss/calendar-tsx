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
import { layoutAxis_coverage, layoutAxis_create, layoutAxis_date } from '#layout/layout-axis';
import {
  layoutIntervals_clip,
  layoutIntervals_complement,
  layoutIntervals_day,
  layoutIntervals_merge,
} from '#layout/layout-intervals';

type Resolved = {
  layer: Calendar_BackgroundLayer;
  intervals: (LayoutIntervals_Interval & { allDay: boolean; clock?: LayoutIntervals_Interval })[];
};

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

const range_of = (dates: Temporal.PlainDate[]): Calendar_Range | undefined => {
  const sorted = dates.toSorted((a, b) => Temporal.PlainDate.compare(a, b));
  const start = sorted[0];
  const end = sorted[sorted.length - 1];

  return start && end ? { start, end } : undefined;
};

const range_interval = (range: Calendar_BackgroundRange, timeZone: string): Resolved['intervals'][number] =>
  'allDay' in range
    ? {
        startMs: layoutIntervals_day(range.start, timeZone).startMs,
        endMs: layoutIntervals_day(range.end ?? range.start, timeZone).endMs,
        allDay: true,
        clock: {
          startMs: layoutAxis_date(range.start),
          endMs: layoutAxis_date((range.end ?? range.start).add({ days: 1 })),
        },
      }
    : { startMs: range.start.epochMilliseconds, endMs: range.end.epochMilliseconds, allDay: false };

const layers_resolve = (layers: Calendar_BackgroundLayer[], range: Calendar_Range, timeZone: string): Resolved[] =>
  layers.map(layer => ({
    layer,
    intervals: (typeof layer.ranges === 'function' ? layer.ranges(range, timeZone) : layer.ranges).map(item =>
      range_interval(item, timeZone),
    ),
  }));

const appliesTo = (layer: Calendar_BackgroundLayer, resourceId: string | undefined) =>
  !layer.resourceIds || (resourceId !== undefined && layer.resourceIds.includes(resourceId));

const timeGrid_decorate = (
  grid: Calendar_TimeGridLayout<unknown, unknown>,
  layers: Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const range = range_of(grid.columns.map(column => column.date));
  const resolved = range ? layers_resolve(layers, range, timeZone) : [];

  return {
    ...grid,
    columns: grid.columns.map(column => {
      const axis = layoutAxis_create({ start: column.date, end: column.date }, timeZone);
      const length = axis.endMs - axis.startMs;

      const backgrounds = resolved.flatMap(({ layer, intervals }): Calendar_BackgroundSegment[] => {
        if (!appliesTo(layer, column.resource?.id)) return [];

        const covered = layoutIntervals_merge(
          layoutIntervals_clip(
            [
              ...intervals.flatMap(interval => (interval.clock ? [interval.clock] : [])),
              ...layoutAxis_coverage(
                axis,
                intervals.filter(interval => !interval.clock),
              ),
            ],
            axis,
          ),
        );

        return (layer.inverse ? layoutIntervals_complement(covered, axis) : covered).map(interval => ({
          key: `${column.key}:${layer.id}:${interval.startMs}`,
          layer: layer.id,
          kind: layer.kind,
          start: axis.fraction(interval.startMs),
          span: (interval.endMs - interval.startMs) / length,
        }));
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
  const range = range_of(month.weeks.flatMap(week => week.days.map(day => day.date)));
  const resolved = range ? layers_resolve(layers, range, timeZone).filter(({ layer }) => !layer.resourceIds) : [];

  return {
    ...month,
    weeks: month.weeks.map(week => ({
      ...week,
      days: week.days.map(day => {
        const interval = layoutIntervals_day(day.date, timeZone);
        const touches = (item: LayoutIntervals_Interval) =>
          item.startMs < interval.endMs && item.endMs > interval.startMs;

        const backgrounds = resolved.flatMap(({ layer, intervals }): Calendar_DayBackground[] => {
          const shaded = layer.inverse
            ? !intervals.some(touches)
            : intervals.some(item => item.allDay && touches(item));

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
