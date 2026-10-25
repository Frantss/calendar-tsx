import type { Calendar_LayoutInput } from '#layouts/layout.types';
import type { Calendar_FirstDayOfWeek } from '#dates/date.types';
import type { Calendar_TimeGridViewSettings } from '#layouts/time-grid/time-grid.types';
import type { Calendar_TimelineViewSettings } from '#layouts/timeline/timeline.types';
import { calendarPeriods_groups } from '#views/periods';
import type { Calendar_BackgroundRange } from '#features/background/background.types';
import type { Calendar_BarSegment, Calendar_BackgroundEventSpan } from '#layouts/layout.types';
import { Temporal } from 'temporal-polyfill';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_ResourceNode } from '#resources/resource.types';
import { calendarResources_build, calendarResources_visible } from '#resources/resources';
import { calendarEvents_dateSpan, calendarEvents_isAllDay, calendarEvents_isMultiDay } from '#events/events';
import { layoutProjection_events, layoutProjection_enclose, layoutProjection_cover } from '#layouts/shared/projection';
import {
  layoutCoordinates_dateColumns,
  layoutCoordinates_plan,
  layoutCoordinates_projectInstant,
  layoutCoordinates_length,
  layoutCoordinates_projectTime,
  layoutCoordinates_coverFragments,
} from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import { layoutIntervals_merge, layoutIntervals_complement, layoutIntervals_stack } from '#layouts/shared/intervals';
import { layoutLanes_assign } from '#layouts/shared/lanes';
import type { Calendar_TimeGridOverlap } from '#layouts/time-grid/time-grid.types';

export const layoutSurfaces_pairs = <R>(dates: readonly Temporal.PlainDate[], groups: R[], order?: string) =>
  order === 'date-first'
    ? dates.flatMap(date => groups.map(resource => ({ date, resource })))
    : groups.flatMap(resource => dates.map(date => ({ date, resource })));

export const layoutSurfaces_time = <T, R>(
  plan: LayoutCoordinates_Plan,
  events: Calendar_Event<T>[],
  backgrounds: Calendar_Event<T>[],
) => {
  const projected = layoutProjection_events(plan, events);
  const shaded = layoutProjection_events(plan, backgrounds);
  const length = layoutCoordinates_length(plan);
  const availabilityCache = new Map<Calendar_Resource<R>, ReturnType<typeof layoutSurfaces_coverage>>();
  return (key: string, resource?: Calendar_Resource<R>, dateIndex?: number) => {
    const total = length * (dateIndex === undefined ? plan.dates.dates.length : 1);
    const items = (minimum: number) =>
      projected.flatMap(item =>
        !resource || item.event.resourceIds?.includes(resource.id)
          ? layoutProjection_enclose(plan, item, minimum, dateIndex)
          : [],
      );
    type Item = ReturnType<typeof items>[number];
    const paint = (item: Item, key: string, offset = 0) => ({
      key,
      event: item.event,
      start: (offset + item.startMs) / total,
      span: (item.endMs - item.startMs) / total,
      continuesBefore: item.continuesBefore,
      continuesAfter: item.continuesAfter,
    });
    if (resource && !availabilityCache.has(resource))
      availabilityCache.set(resource, layoutSurfaces_coverage(plan, resource.availability));
    const availability = resource ? availabilityCache.get(resource)!(dateIndex) : [];

    return {
      key,
      resource,
      isUnavailable: !!resource && !availability.length,
      unavailable: resource
        ? layoutIntervals_complement(availability, { startMs: 0, endMs: total }).map(gap => ({
            key: `${key}:unavailable:${gap.startMs}`,
            start: gap.startMs / total,
            span: (gap.endMs - gap.startMs) / total,
          }))
        : [],
      grid(this: void, minimum: number, short: number, overlap: Calendar_TimeGridOverlap) {
        const segments = layoutLanes_assign(items(minimum), overlap).map(item => ({
          ...paint(item, `${key}:${item.event.id}`),
          fragments: item.fragments,
          lane: item.lane,
          lanes: item.lanes,
          inlineStart: item.inlineStart,
          inlineSize: item.inlineSize,
          isShort: item.endMs - item.startMs < short,
        }));
        return { segments, lanes: Math.max(0, ...segments.map(item => item.lanes)) };
      },
      stack(this: void, minimum: number) {
        const placed = items(minimum);
        const rows = layoutIntervals_stack(placed, item => item);
        return {
          rows: Math.max(0, ...rows.map(row => row + 1)),
          segments: placed.map((item, index) => ({
            ...paint(item, `${key}:${item.event.id}`),
            fragments: item.fragments,
            row: rows[index],
            isAllDay: calendarEvents_isAllDay(item.event),
            isMultiDay: calendarEvents_isMultiDay(item.event),
          })),
        };
      },
      backgroundEvents: shaded.flatMap(item => {
        if (resource && item.event.resourceIds && !item.event.resourceIds.includes(resource.id)) return [];
        if (dateIndex === undefined && calendarEvents_isAllDay(item.event))
          return layoutProjection_enclose(plan, item, 0).map(part => paint(part, `${key}:background:${item.event.id}`));
        return (dateIndex === undefined ? plan.dates.dates.map((_, index) => index) : [dateIndex]).flatMap(day =>
          layoutProjection_cover(plan, item, day).map((part, index) =>
            paint(
              part,
              dateIndex === undefined
                ? `${key}:background:${item.event.id}:${day}:${index}`
                : `${key}:${index ? `background-part:${index}` : 'background'}:${item.event.id}`,
              dateIndex === undefined ? day * length : 0,
            ),
          ),
        );
      }),
    };
  };
};

export const layoutSurfaces_dates = <T, R>(
  columns: { key: string; date: Temporal.PlainDate; resource?: Calendar_Resource<R> }[],
  groups: (Calendar_Resource<R> | undefined)[],
  events: Calendar_Event<T>[],
  backgrounds: Calendar_Event<T>[],
  prefix = 'all-day',
) => {
  const partitions = groups.flatMap(resource => {
    const indices = columns.flatMap((column, index) => (column.resource === resource ? [index] : []));
    return indices.every((index, position) => index === indices[0] + position)
      ? [{ resource, indices, key: `${prefix}:${resource?.id ?? 'all'}` }]
      : indices.map(index => ({ resource, indices: [index], key: `${prefix}:${columns[index].key}` }));
  });
  function place(source: Calendar_Event<T>[], background: false): Calendar_BarSegment<T>[];
  function place(source: Calendar_Event<T>[], background: true): Calendar_BackgroundEventSpan<T>[];
  function place(source: Calendar_Event<T>[], background: boolean) {
    return partitions.flatMap(({ resource, indices, key }) => {
      const dates = indices.map(index => columns[index].date);
      const spans = source.flatMap(event => {
        if (!layoutSurfaces_matches(event, resource, background)) return [];
        const span = layoutCoordinates_dateColumns(dates, calendarEvents_dateSpan(event));
        return span ? [{ event, ...span }] : [];
      });
      const rows = background
        ? []
        : layoutIntervals_stack(spans, span => ({ startMs: span.colStart, endMs: span.colEnd + 1 }));
      return spans.map((span, index) => ({
        key: `${key}${background ? ':background' : ''}:${span.event.id}`,
        event: span.event,
        colStart: span.colStart + (indices[0] ?? 0),
        colSpan: span.colEnd - span.colStart + 1,
        continuesBefore: span.continuesBefore,
        continuesAfter: span.continuesAfter,
        ...(background
          ? {}
          : {
              row: rows[index],
              isAllDay: calendarEvents_isAllDay(span.event),
              isMultiDay: calendarEvents_isMultiDay(span.event),
            }),
      }));
    });
  }
  const segments = place(events, false);
  return {
    segments,
    backgroundEvents: place(backgrounds, true),
    rows: Math.max(0, ...segments.map(segment => segment.row + 1)),
  };
};

export const layoutSurfaces_matches = <T, R>(
  event: Calendar_Event<T>,
  resource?: Calendar_Resource<R>,
  background = false,
) => !resource || (background && !event.resourceIds) || !!event.resourceIds?.includes(resource.id);

export const layoutSurfaces_coverage = (plan: LayoutCoordinates_Plan, ranges: readonly Calendar_BackgroundRange[]) => {
  const length = layoutCoordinates_length(plan);
  const fragments = ranges.flatMap((range, index) =>
    'allDay' in range
      ? []
      : layoutCoordinates_projectTime(
          plan,
          { start: range.start.toInstant(), end: range.end.toInstant() },
          String(index),
        ),
  );
  const parts = plan.dates.dates.map((): typeof fragments => []);
  for (const fragment of fragments) parts[fragment.dateIndex].push(fragment);
  const byDate = plan.dates.dates.map((date, index) => {
    const full = ranges.some(
      range =>
        'allDay' in range &&
        Temporal.PlainDate.compare(range.start, date) <= 0 &&
        Temporal.PlainDate.compare(range.end ?? range.start, date) >= 0,
    );
    return full ? [{ startMs: 0, endMs: length }] : layoutCoordinates_coverFragments(plan, parts[index], index);
  });
  const combined = layoutIntervals_merge(
    byDate.flatMap((intervals, day) =>
      intervals.map(interval => ({
        startMs: day * length + interval.startMs,
        endMs: day * length + interval.endMs,
      })),
    ),
  );
  return (dateIndex?: number) => (dateIndex === undefined ? combined : (byDate[dateIndex] ?? []));
};

export const layoutSurfaces_compile = <T, R>(
  input: Pick<
    Calendar_LayoutInput<T, R>,
    'range' | 'events' | 'backgroundEvents' | 'resources' | 'resourceNodes' | 'timeZone' | 'now'
  > & { firstDayOfWeek?: Calendar_FirstDayOfWeek },
  settings: Calendar_TimeGridViewSettings & Calendar_TimelineViewSettings,
  kind: 'timeGrid' | 'timeline',
) => {
  const { events, backgroundEvents, resources, range, timeZone, now, firstDayOfWeek } = input;
  const plan = layoutCoordinates_plan(range, settings, timeZone, firstDayOfWeek);
  const grouped = calendarPeriods_groups(settings.groupBy).includes('resource');
  const groups = grouped ? resources : [undefined];
  const slotMinutes = settings.slotMinutes ?? (kind === 'timeGrid' ? 30 : 60);
  const minimum = (settings.minEventMinutes ?? slotMinutes / 2) * 60_000;
  const query = layoutSurfaces_time<T, R>(
    plan,
    kind === 'timeGrid' ? events.filter(event => event.kind === 'timed') : events,
    backgroundEvents,
  );
  const pairs: {
    date?: Temporal.PlainDate;
    resource?: Calendar_Resource<R>;
    node?: Calendar_ResourceNode<R>;
  }[] =
    kind === 'timeGrid'
      ? layoutSurfaces_pairs(plan.dates.dates, groups, settings.groupOrder)
      : grouped
        ? calendarResources_visible(input.resourceNodes ?? calendarResources_build(resources)).map(node => ({
            resource: node.resource,
            node,
          }))
        : [{}];
  const surfaces = pairs.map(({ date, resource, node }) => {
    const dateIndex = date ? plan.dates.indexByDate.get(date.toString()) : undefined;
    const surface = query(
      date ? `${resource?.id ?? 'all'}:${date.toString()}` : (resource?.id ?? 'all'),
      resource,
      dateIndex,
    );
    return {
      date,
      dateIndex,
      node,
      surface,
      grid: () =>
        surface.grid(minimum, (settings.shortEventMinutes ?? 30) * 60_000, settings.overlap ?? 'side-by-side'),
      stack: () => surface.stack(minimum),
    };
  });
  const allDay = () =>
    settings.allDay === false
      ? undefined
      : layoutSurfaces_dates(
          surfaces.map(({ date, surface }) => ({ date: date!, key: surface.key, resource: surface.resource })),
          groups,
          events.filter(calendarEvents_isAllDay),
          backgroundEvents.filter(calendarEvents_isAllDay),
        );
  return {
    plan,
    slotMinutes,
    surfaces,
    allDay,
    clock: layoutCoordinates_projectInstant(plan, now.toInstant()),
  };
};

export const layoutSurfaces_preview = <T, R>(
  scene: ReturnType<typeof layoutSurfaces_compile<T, R>>,
  kind: 'timeGrid' | 'timeline',
) => {
  if (kind === 'timeline')
    return scene.surfaces.flatMap(({ surface, stack }) =>
      stack().segments.map(segment => ({
        surface: `lane:${surface.key}`,
        start: segment.start,
        span: segment.span,
      })),
    );
  return [
    ...scene.surfaces.flatMap(({ surface, grid }) =>
      grid().segments.map(segment => ({
        surface: `column:${surface.key}`,
        start: segment.start,
        span: segment.span,
        inlineStart: segment.inlineStart,
        inlineSize: segment.inlineSize,
      })),
    ),
    ...(scene.allDay()?.segments.map(segment => ({
      surface: 'allDay',
      start: segment.colStart / scene.surfaces.length,
      span: segment.colSpan / scene.surfaces.length,
    })) ?? []),
  ];
};
