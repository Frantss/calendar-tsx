import type {
  Calendar_DurationSettings,
  Calendar_TimeViewSettings,
  Calendar_ResourceGrouping,
} from '#views/view.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_PickFeatures } from '#features/feature.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_BackgroundEventSegment, Calendar_UnavailableSegment } from '#layouts/layout.types';
import type { Temporal } from 'temporal-polyfill';
import type { LayoutCoordinates_Fragment, LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import type {
  Calendar_TimelineSegment_FeatureMap,
  Calendar_TimelineRow_FeatureMap,
} from '#features/feature-maps.types';

export type Calendar_TimelineViewSettings = Calendar_DurationSettings &
  Calendar_TimeViewSettings & {
    groupBy?: Calendar_ResourceGrouping;
    slotMinutes?: number;
    minSlotWidth?: string;
    /** Minimum display duration, also used for stacking; defaults to half of `slotMinutes`, `0` turns it off. */
    minEventMinutes?: number;
  };

/** A day in the timeline header, as slot columns. */
export type Calendar_TimelineDay = {
  key: string;
  date: Temporal.PlainDate;
  isToday: boolean;
  colStart: number;
  colSpan: number;
  start: number;
  span: number;
};

export type Calendar_TimelineSlot = {
  key: string;
  date: Temporal.PlainDate;
  time: Temporal.PlainTime;
  col: number;
  dayOffset: number;
  start: number;
  span: number;
};

export type Calendar_TimelineSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  /** Empty for all-day events, which follow anchor dates rather than source instants. */
  fragments: readonly LayoutCoordinates_Fragment[];
  /** Fractions of the range. */
  start: number;
  span: number;
  /** Stack row within its timeline row. */
  row: number;
  isAllDay: boolean;
  /** The event covers more than one date, before clipping to the range. */
  isMultiDay: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_TimelineSegment_FeatureMap, TFeatures>;

export type Calendar_TimelineRow<TData, TResourceData, TFeatures = {}> = {
  key: string;
  resource?: Calendar_Resource<TResourceData>;
  isUnavailable: boolean;
  segments: Calendar_TimelineSegment<TData, TFeatures>[];
  backgroundEvents: Calendar_BackgroundEventSegment<TData>[];
  /** Stack depth. */
  rows: number;
  /** Fractions of the range. */
  unavailable: Calendar_UnavailableSegment[];
} & Calendar_PickFeatures<Calendar_TimelineRow_FeatureMap, TFeatures>;

export type Calendar_TimelineLayout<TData, TResourceData, TFeatures = {}> = {
  kind: 'timeline';
  coordinates: LayoutCoordinates_Plan;
  slotUnits: number;
  /** The length of each slot. */
  slotMinutes: number;
  /** Slot units from the start of each day's visible window to its first hour; 0 when it starts on the hour. */
  hourOffset: number;
  days: Calendar_TimelineDay[];
  slots: Calendar_TimelineSlot[];
  rows: Calendar_TimelineRow<TData, TResourceData, TFeatures>[];
  /** The clock's fraction of the range; absent outside it. */
  now?: number;
  minSlotWidth?: string;
};
