import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Range, Calendar_DayOfWeek } from '#calendar.types';

/** A range a background layer shades (D33); all-day ranges cover whole days, `end` inclusive and defaulting to `start`. */
export type Calendar_BackgroundRange =
  | { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }
  | { allDay: true; start: Temporal.PlainDate; end?: Temporal.PlainDate };

/** One kind of shading (D33). Create layers with `createBackgroundLayer` to keep `kind` a literal. */
export type Calendar_BackgroundLayer<TKind extends string = string> = {
  id: string;
  /** Emitted as `data-kind`. */
  kind: TKind;
  /** Shade what the ranges leave uncovered. */
  inverse?: boolean;
  /** Limits the layer to these resources' columns or rows; omitted, it shades all resources. */
  resourceIds?: string[];
  /** A list, or a function of the input date envelope and `timeZone`; both are compared by reference. */
  ranges: Calendar_BackgroundRange[] | ((range: Calendar_Range, timeZone: string) => Calendar_BackgroundRange[]);
};

/** Opening hours on some days of the week, in the calendar's `timeZone`; an `endTime` at or before `startTime` ends the next day. */
export type Calendar_WeeklyRule = {
  daysOfWeek: Calendar_DayOfWeek[];
  startTime: Temporal.PlainTime;
  endTime: Temporal.PlainTime;
};

/** A shaded span, as fractions of a time-grid column or timeline track. */
export type Calendar_BackgroundSegment = { key: string; layer: string; kind: string; start: number; span: number };

/** A layer that shades a whole day-grid cell. */
export type Calendar_DayBackground = { key: string; layer: string; kind: string };
