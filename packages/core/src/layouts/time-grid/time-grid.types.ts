import type {
  Calendar_DurationSettings,
  Calendar_TimeViewSettings,
  Calendar_ResourceGrouping,
} from '#views/view.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_PickFeatures } from '#features/feature.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type {
  Calendar_BackgroundEventSegment,
  Calendar_UnavailableSegment,
  Calendar_BarSegment,
  Calendar_BackgroundEventSpan,
} from '#layouts/layout.types';
import type { LayoutCoordinates_Fragment, LayoutCoordinates_Plan } from '#layouts/shared/coordinates';
import type {
  Calendar_TimeGridSegment_FeatureMap,
  Calendar_TimeGridColumn_FeatureMap,
} from '#features/feature-maps.types';
import type { Temporal } from 'temporal-polyfill';

/** How overlapping timed events share a column (D38). */
export type Calendar_TimeGridOverlap = 'side-by-side' | 'cascade';

export type Calendar_TimeGridViewSettings = Calendar_DurationSettings &
  Calendar_TimeViewSettings & {
    groupBy?: Calendar_ResourceGrouping;
    groupOrder?: 'resource-first' | 'date-first';
    allDay?: boolean;
    slotMinutes?: number;
    minColumnWidth?: string;
    /** Defaults to `'side-by-side'`; `'cascade'` lets later lanes cover up to half of an event (D38). */
    overlap?: Calendar_TimeGridOverlap;
    /** Shorter timed events are laid out this long, on screen and for lanes; defaults to half of `slotMinutes`, `0` turns it off (D39). */
    minEventMinutes?: number;
    /** Segments laid out shorter than this are flagged `isShort`; defaults to 30 (D39). */
    shortEventMinutes?: number;
  };

export type Calendar_TimeGridSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  /** Exact source coverage before D40 enclosure and minimum paint sizing. */
  fragments: readonly LayoutCoordinates_Fragment[];
  /** Fractions of the column's visible clock window. */
  start: number;
  span: number;
  lane: number;
  lanes: number;
  /** Fractions of the column's width, after expansion into free lanes and any cascade (D38). */
  inlineStart: number;
  inlineSize: number;
  /** Laid out shorter than the view's `shortEventMinutes`, so one line of content fits (D39). */
  isShort: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_TimeGridSegment_FeatureMap, TFeatures>;

export type Calendar_TimeGridColumn<TData, TResourceData, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  isToday: boolean;
  isUnavailable: boolean;
  /** The most lanes any overlap cluster in the column uses; 0 without timed events. */
  lanes: number;
  segments: Calendar_TimeGridSegment<TData, TFeatures>[];
  /** Timed background events, plus all-day ones covering the whole day (D37). */
  backgroundEvents: Calendar_BackgroundEventSegment<TData>[];
  unavailable: Calendar_UnavailableSegment[];
  now?: number;
} & Calendar_PickFeatures<Calendar_TimeGridColumn_FeatureMap, TFeatures>;

export type Calendar_TimeGridSlot = {
  key: string;
  time: Temporal.PlainTime;
  dayOffset: number;
  start: number;
  span: number;
};

export type Calendar_TimeGridLayout<TData, TResourceData, TFeatures = {}> = {
  kind: 'timeGrid';
  coordinates: LayoutCoordinates_Plan;
  /** Visible duration divided by slotMinutes; may include a final partial slot. */
  slotUnits: number;
  /** The length of each slot. */
  slotMinutes: number;
  /** Slot units from the start of the visible window to its first hour; 0 when it starts on the hour. */
  hourOffset: number;
  slots: Calendar_TimeGridSlot[];
  columns: Calendar_TimeGridColumn<TData, TResourceData, TFeatures>[];
  allDay?: {
    segments: Calendar_BarSegment<TData, TFeatures>[];
    backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
    rows: number;
  };
  minColumnWidth?: string;
};
