import type {
  Calendar_BackgroundLayer,
  Calendar_BackgroundRange,
  Calendar_BackgroundSegment,
  Calendar_DayBackground,
} from '#features/background/background.types';
import { Temporal } from 'temporal-polyfill';

import type {
  Calendar_DayGridLayout,
  Calendar_Range,
  Calendar_TimeGridLayout,
  Calendar_TimelineLayout,
} from '#calendar.types';
import type { LayoutIntervals_Interval } from '#layout/layout-intervals';
import {
  layoutCoordinates_coverFragments,
  layoutCoordinates_length,
  layoutCoordinates_projectTime,
} from '#layout/layout-coordinates';
import { layoutIntervals_complement, layoutIntervals_day, layoutIntervals_merge } from '#layout/layout-intervals';

const layers_resolve = (layers: readonly Calendar_BackgroundLayer[], range: Calendar_Range, timeZone: string) =>
  layers.map(layer => ({
    layer,
    ranges: typeof layer.ranges === 'function' ? layer.ranges(range, timeZone) : layer.ranges,
  }));

const appliesTo = (layer: Calendar_BackgroundLayer, resourceId: string | undefined) =>
  !layer.resourceIds || (resourceId !== undefined && layer.resourceIds.includes(resourceId));

export const timeGrid_decorate = (
  grid: Calendar_TimeGridLayout<unknown, unknown>,
  layers: readonly Calendar_BackgroundLayer[],
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
    })),
  };
};

export const timeline_decorate = (
  timeline: Calendar_TimelineLayout<unknown, unknown>,
  layers: readonly Calendar_BackgroundLayer[],
  timeZone: string,
) => {
  const plan = timeline.coordinates;
  const length = layoutCoordinates_length(plan);
  const total = length * plan.dates.dates.length;
  const resolved = plan.dates.dates.length
    ? layers_resolve(layers, plan.dates.inputRange, timeZone).map(({ layer, ranges }) => {
        const intervals = ranges.flatMap((range, index) =>
          'allDay' in range
            ? plan.dates.dates.flatMap((date, index) =>
                Temporal.PlainDate.compare(range.start, date) <= 0 &&
                Temporal.PlainDate.compare(range.end ?? range.start, date) >= 0
                  ? [{ startMs: index * length, endMs: (index + 1) * length }]
                  : [],
              )
            : layoutCoordinates_coverFragments(
                plan,
                layoutCoordinates_projectTime(
                  plan,
                  {
                    start: range.start.toInstant(),
                    end: range.end.toInstant(),
                  },
                  `${layer.id}:${index}`,
                ),
              ),
        );
        const covered = layoutIntervals_merge(intervals.sort((a, b) => a.startMs - b.startMs));
        return {
          layer,
          intervals: layer.inverse ? layoutIntervals_complement(covered, { startMs: 0, endMs: total }) : covered,
        };
      })
    : [];
  return {
    ...timeline,
    rows: timeline.rows.map(row => ({
      ...row,
      backgrounds: resolved.flatMap(({ layer, intervals }): Calendar_BackgroundSegment[] =>
        appliesTo(layer, row.resource?.id)
          ? intervals.map(interval => ({
              key: `${row.key}:${layer.id}:${interval.startMs}`,
              layer: layer.id,
              kind: layer.kind,
              start: interval.startMs / total,
              span: (interval.endMs - interval.startMs) / total,
            }))
          : [],
      ),
    })),
  };
};
