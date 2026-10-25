import type { Temporal } from 'temporal-polyfill';

import { calendarEvents_dateSpan, calendarEvents_isAllDay, calendarEvents_isMultiDay } from '#events/events';
import type { Calendar_BackgroundEventSpan, Calendar_BarSegment } from '#layouts/layout.types';
import type { Calendar_Event } from '#events/event.types';
import { layoutCoordinates_dateColumns } from '#layouts/shared/coordinates';
import { layoutIntervals_stack } from '#layouts/shared/intervals';

/** Clips each event's date span to the columns and flags when it continues past either edge. */
const clip = <TData>(events: Calendar_Event<TData>[], columns: Temporal.PlainDate[]) => {
  const first = columns[0];
  const last = columns[columns.length - 1];

  if (!first || !last) return [];

  return events.flatMap(event => {
    const span = calendarEvents_dateSpan(event);
    const projected = layoutCoordinates_dateColumns(columns, span);
    return projected ? [{ event, ...projected }] : [];
  });
};

/**
 * Lays events out as bars across visible day columns (D17). Events must already be ordered;
 * spans are clipped to the columns and flagged when they continue past either edge.
 */
export const layoutBars_build = <TData>(
  events: Calendar_Event<TData>[],
  columns: Temporal.PlainDate[],
  keyPrefix: string,
) => {
  const spans = clip(events, columns);
  const rows = layoutIntervals_stack(spans, span => ({ startMs: span.colStart, endMs: span.colEnd + 1 }));

  return spans.map((span, index): Calendar_BarSegment<TData> => ({
    key: `${keyPrefix}:${span.event.id}`,
    event: span.event,
    colStart: span.colStart,
    colSpan: span.colEnd - span.colStart + 1,
    row: rows[index] ?? 0,
    isAllDay: calendarEvents_isAllDay(span.event),
    isMultiDay: calendarEvents_isMultiDay(span.event),
    continuesBefore: span.continuesBefore,
    continuesAfter: span.continuesAfter,
  }));
};

/** Background events across the same columns: clipped like bars, but given no row (D37). */
export const layoutBars_background = <TData>(
  events: Calendar_Event<TData>[],
  columns: Temporal.PlainDate[],
  keyPrefix: string,
) =>
  clip(events, columns).map((span): Calendar_BackgroundEventSpan<TData> => ({
    key: `${keyPrefix}:background:${span.event.id}`,
    event: span.event,
    colStart: span.colStart,
    colSpan: span.colEnd - span.colStart + 1,
    continuesBefore: span.continuesBefore,
    continuesAfter: span.continuesAfter,
  }));

export const layoutBars_rows = (segments: { row: number }[]) =>
  Math.max(0, ...segments.map(segment => segment.row + 1));
