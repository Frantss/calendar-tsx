import { Temporal } from 'temporal-polyfill';

import { calendarEvents_dateSpan } from '#calendar-events';
import type { Calendar_BarSegment, Calendar_Event } from '#calendar.types';

type Span = { colStart: number; colEnd: number };

/** Greedy packing: each span takes the lowest row where all of its columns are free. */
const packRows = (spans: Span[]) => {
  const rows: boolean[][] = [];

  return spans.map(span => {
    let row = 0;

    while (rows[row]?.slice(span.colStart, span.colEnd + 1).some(Boolean)) row++;

    const cells = (rows[row] ??= []);

    for (let col = span.colStart; col <= span.colEnd; col++) cells[col] = true;

    return row;
  });
};

/**
 * Lays events out as bars across contiguous day columns (D17). Events must already be ordered;
 * spans are clipped to the columns and flagged when they continue past either edge.
 */
export const layoutBars_build = <TData>(
  events: Calendar_Event<TData>[],
  columns: Temporal.PlainDate[],
  keyPrefix: string,
) => {
  const first = columns[0];
  const last = columns[columns.length - 1];

  if (!first || !last) return [];

  const spans = events.map(event => {
    const span = calendarEvents_dateSpan(event);
    const continuesBefore = Temporal.PlainDate.compare(span.start, first) < 0;
    const continuesAfter = Temporal.PlainDate.compare(span.end, last) > 0;

    return {
      event,
      colStart: first.until(continuesBefore ? first : span.start).days,
      colEnd: first.until(continuesAfter ? last : span.end).days,
      continuesBefore,
      continuesAfter,
    };
  });

  const rows = packRows(spans);

  return spans.map((span, index): Calendar_BarSegment<TData> => ({
    key: `${keyPrefix}:${span.event.id}`,
    event: span.event,
    colStart: span.colStart,
    colSpan: span.colEnd - span.colStart + 1,
    row: rows[index] ?? 0,
    continuesBefore: span.continuesBefore,
    continuesAfter: span.continuesAfter,
  }));
};

export const layoutBars_rows = (segments: { row: number }[]) =>
  Math.max(0, ...segments.map(segment => segment.row + 1));
