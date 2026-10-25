import type {
  Calendar_BackgroundLayer,
  Calendar_BackgroundSegment,
  Calendar_DayBackground,
} from '#features/background/background.types';
import { Temporal } from 'temporal-polyfill';

import type { Calendar_DayGridLayout } from '#layouts/day-grid/day-grid.types';
import type { Calendar_Range } from '#dates/date.types';
import type { Calendar_TimeGridLayout } from '#layouts/time-grid/time-grid.types';
import type { Calendar_TimelineLayout } from '#layouts/timeline/timeline.types';
import type { LayoutIntervals_Interval } from '#layouts/shared/intervals';
import { layoutCoordinates_length } from '#layouts/shared/coordinates';
import { layoutSurfaces_coverage } from '#layouts/shared/surfaces';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import { layoutIntervals_complement, layoutIntervals_day } from '#layouts/shared/intervals';

const layers_resolve = (layers: readonly Calendar_BackgroundLayer[], range: Calendar_Range, timeZone: string) =>
  layers.map(layer => ({
    layer,
    ranges: typeof layer.ranges === 'function' ? layer.ranges(range, timeZone) : layer.ranges,
  }));

const appliesTo = (layer: Calendar_BackgroundLayer, resourceId: string | undefined) =>
  !layer.resourceIds || (resourceId !== undefined && layer.resourceIds.includes(resourceId));

const timedBackgrounds = (
  plan: LayoutCoordinates_Plan,
  layers: readonly Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const length = layoutCoordinates_length(plan);
  const resolved = plan.dates.dates.length
    ? layers_resolve(layers, plan.dates.inputRange, timeZone).map(({ layer, ranges }) => ({
        layer,
        coverage: layoutSurfaces_coverage(plan, ranges),
      }))
    : [];
  return (key: string, resourceId?: string, dateIndex?: number): Calendar_BackgroundSegment[] => {
    const total = length * (dateIndex === undefined ? plan.dates.dates.length : 1);
    return resolved.flatMap(({ layer, coverage }) => {
      if (!appliesTo(layer, resourceId)) return [];
      const covered = coverage(dateIndex);
      return (layer.inverse ? layoutIntervals_complement(covered, { startMs: 0, endMs: total }) : covered).map(
        interval => ({
          key: `${key}:${layer.id}:${interval.startMs}`,
          layer: layer.id,
          kind: layer.kind,
          start: interval.startMs / total,
          span: (interval.endMs - interval.startMs) / total,
        }),
      );
    });
  };
};

export const timeGrid_decorate = (
  grid: Calendar_TimeGridLayout<unknown, unknown>,
  layers: readonly Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const backgrounds = timedBackgrounds(grid.coordinates, layers, timeZone);
  return {
    ...grid,
    columns: grid.columns.map(column => ({
      ...column,
      backgrounds: backgrounds(
        column.key,
        column.resource?.id,
        grid.coordinates.dates.indexByDate.get(column.date.toString()),
      ),
    })),
  };
};

/** All-day ranges shade cells; inverse layers shade untouched days, within the layer's resource scope. */
export const dayGrid_decorate = (
  grid: Calendar_DayGridLayout<unknown>,
  layers: readonly Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const range = grid.coordinates.dates.length ? grid.coordinates.inputRange : undefined;
  const resolved = range ? layers_resolve(layers, range, timeZone) : [];

  return {
    ...grid,
    sections: grid.sections.map(section => ({
      ...section,
      rows: section.rows.map(row => ({
        ...row,
        days: row.days.map(day => {
          const interval = layoutIntervals_day(day.date, timeZone);
          const touches = (item: LayoutIntervals_Interval) =>
            item.startMs < interval.endMs && item.endMs > interval.startMs;

          const backgrounds = resolved.flatMap(({ layer, ranges }): Calendar_DayBackground[] => {
            if (!appliesTo(layer, day.resource?.id)) return [];
            const allDayTouches = (range: { start: Temporal.PlainDate; end?: Temporal.PlainDate }) =>
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
    })),
  };
};

export const timeline_decorate = (
  timeline: Calendar_TimelineLayout<unknown, unknown>,
  layers: readonly Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const backgrounds = timedBackgrounds(timeline.coordinates, layers, timeZone);
  return {
    ...timeline,
    rows: timeline.rows.map(row => ({
      ...row,
      backgrounds: backgrounds(row.key, row.resource?.id),
    })),
  };
};
