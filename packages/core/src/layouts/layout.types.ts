import type { Calendar_Event } from '#events/event.types';
import type { Calendar_PickFeatures, Calendar_Features, Calendar_FeatureTypes } from '#features/feature.types';
import type { Calendar_FirstDayOfWeek, Calendar_Range } from '#dates/date.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_ResourceNode } from '#resources/resource.types';
import type { Calendar_Views } from '#views/view.types';
import type { Calendar_BarSegment_FeatureMap, Calendar_Layout_FeatureMap } from '#features/feature-maps.types';
import type { Temporal } from 'temporal-polyfill';

export type Calendar_BarSegment<TData, TFeatures = {}> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  row: number;
  isAllDay: boolean;
  /** The event covers more than one date, before clipping to the columns. */
  isMultiDay: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
} & Calendar_PickFeatures<Calendar_BarSegment_FeatureMap, TFeatures>;

/** A background event clipped to a run of day columns. It takes no row and sits under the bars (D37). */
export type Calendar_BackgroundEventSpan<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_UnavailableSegment = { key: string; start: number; span: number };

/** Background-event coverage, as fractions of a time-grid column or timeline track (D37, D42). */
export type Calendar_BackgroundEventSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  start: number;
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_LayoutKey = keyof Calendar_Layout_FeatureMap<unknown, unknown, {}>;

/** What a layout's `build` receives: the core pipeline's output for the active view. */
export type Calendar_LayoutInput<TData, TResourceData> = {
  firstDayOfWeek: Calendar_FirstDayOfWeek;
  range: Calendar_Range;
  period: Calendar_Range;
  inputRange: Calendar_Range;
  /** Normalised to `timeZone`, filtered to `inputRange`, sorted by `eventOrder`; no background events. */
  events: Calendar_Event<TData>[];
  /** The events with `display: 'background'`: normalised and clipped likewise, in input order (D37). */
  backgroundEvents: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  /** All hierarchy nodes in depth-first order, including collapsed descendants. */
  resourceNodes?: Calendar_ResourceNode<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
};

/** A layout model as features see it; layout features know their own shape. */
export type Calendar_AnyLayout = { kind: string };

/** One layout per view, with all registered features inherited (D54). */
export type Calendar_Layout<
  TData,
  TResourceData,
  TViews extends Calendar_Views = Calendar_Views,
  TFeatures extends Calendar_Features = {},
> = {
  [K in keyof TViews]: Calendar_Layout_FeatureMap<
    TData,
    TResourceData,
    Calendar_FeatureTypes<TViews[K]['~features'] & TFeatures>
  >[TViews[K]['~layout']];
}[keyof TViews];
