import { calendarEvents_dateSpan } from '#events/events';
import type { Calendar_Event } from '#events/event.types';
import {
  layoutCoordinates_bounds,
  layoutCoordinates_coverFragments,
  layoutCoordinates_dateColumns,
  layoutCoordinates_length,
  layoutCoordinates_projectTime,
} from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Fragment, LayoutCoordinates_Plan } from '#layouts/shared/coordinates';

export type LayoutProjection_Event<TData> = {
  event: Calendar_Event<TData>;
  fragments: readonly LayoutCoordinates_Fragment[];
  bounds: { dateIndex: number; startMs: number; endMs: number }[];
};

export const layoutProjection_events = <TData>(plan: LayoutCoordinates_Plan, events: Calendar_Event<TData>[]) =>
  events.map((event): LayoutProjection_Event<TData> => {
    const fragments =
      event.kind === 'timed'
        ? layoutCoordinates_projectTime(plan, { start: event.start.toInstant(), end: event.end.toInstant() }, event.id)
        : [];
    return {
      event,
      fragments,
      bounds: layoutCoordinates_bounds(fragments).map(({ dateIndex, clock }) => ({
        dateIndex,
        startMs: Number(clock.start - plan.dates.clock.start) / 1_000_000,
        endMs: Number(clock.end - plan.dates.clock.start) / 1_000_000,
      })),
    };
  });

const partsOf = <TData>({ event, fragments }: LayoutProjection_Event<TData>, dateIndex?: number) => {
  const parts = dateIndex === undefined ? fragments : fragments.filter(part => part.dateIndex === dateIndex);
  return {
    event,
    fragments: parts,
    continuesBefore:
      event.kind === 'timed' && !!parts.length && event.start.epochNanoseconds < parts[0].source.start.epochNanoseconds,
    continuesAfter:
      event.kind === 'timed' &&
      !!parts.length &&
      event.end.epochNanoseconds > parts[parts.length - 1].source.end.epochNanoseconds,
  };
};

export const layoutProjection_enclose = <TData>(
  plan: LayoutCoordinates_Plan,
  projected: LayoutProjection_Event<TData>,
  minimum: number,
  dateIndex?: number,
) => {
  const parts = partsOf(projected, dateIndex);
  const length = layoutCoordinates_length(plan);
  const total = length * (dateIndex === undefined ? plan.dates.dates.length : 1);
  if (parts.event.kind === 'allDay') {
    const dates = dateIndex === undefined ? plan.dates.dates : [plan.dates.dates[dateIndex]];
    const span = layoutCoordinates_dateColumns(dates, calendarEvents_dateSpan(parts.event));
    return span
      ? [
          {
            ...parts,
            startMs: span.colStart * length,
            endMs: (span.colEnd + 1) * length,
            continuesBefore: span.continuesBefore,
            continuesAfter: span.continuesAfter,
          },
        ]
      : [];
  }
  const bounds =
    dateIndex === undefined ? projected.bounds : projected.bounds.filter(part => part.dateIndex === dateIndex);
  if (!bounds.length) return [];
  const offset = (part: (typeof bounds)[number]) => (dateIndex === undefined ? part.dateIndex * length : 0);
  const startMs = Math.min(...bounds.map(part => offset(part) + part.startMs));
  const endMs = Math.max(...bounds.map(part => offset(part) + part.endMs));
  return [{ ...parts, startMs, endMs: Math.min(total, Math.max(endMs, startMs + minimum)) }];
};

export const layoutProjection_cover = <TData>(
  plan: LayoutCoordinates_Plan,
  projected: LayoutProjection_Event<TData>,
  dateIndex: number,
) => {
  if (projected.event.kind === 'allDay') return layoutProjection_enclose(plan, projected, 0, dateIndex);
  const parts = partsOf(projected, dateIndex);
  return layoutCoordinates_coverFragments(plan, parts.fragments, dateIndex).map(interval => ({
    ...parts,
    ...interval,
  }));
};
