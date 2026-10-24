import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Features, Calendar_FeatureTypes } from '#features/feature.types';
import type { Calendar_EventInput_FeatureMap } from '#features/feature-maps.types';
import type { Calendar_Range } from '#dates/date.types';

/** `'background'` shades the range under the other events instead of laying it out as one (D37). */
export type Calendar_EventDisplay = 'auto' | 'background';

export type Calendar_TimedEventInput<TData> = {
  id: string;
  kind: 'timed';
  '~source'?: never;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  resourceIds?: string[];
  /** Defaults to `'auto'`. */
  display?: Calendar_EventDisplay;
  data: TData;
};

export type Calendar_AllDayEventInput<TData> = {
  id: string;
  kind: 'allDay';
  '~source'?: never;
  start: Temporal.PlainDate;
  /** Inclusive; defaults to `start`. */
  end?: Temporal.PlainDate;
  resourceIds?: string[];
  /** Defaults to `'auto'`. */
  display?: Calendar_EventDisplay;
  data: TData;
};

/** Discriminated by `kind`. */
export type Calendar_EventInput<TData> = Calendar_TimedEventInput<TData> | Calendar_AllDayEventInput<TData>;

/** A definition resolved by the feature registered under `~source` (D50). */
export type Calendar_EventSource<TData> = { id: string; data: TData; '~source': string };

/** One-off inputs plus definitions supported by the registered features. */
export type Calendar_EventDefinition<TData, TFeatures = Calendar_Features> =
  | Calendar_EventInput<TData>
  | (Calendar_EventSource<TData> &
      Calendar_EventInput_FeatureMap<TData>[string extends keyof TFeatures
        ? keyof Calendar_EventInput_FeatureMap<TData>
        : Extract<keyof Calendar_FeatureTypes<TFeatures>, keyof Calendar_EventInput_FeatureMap<TData>>]);

/** An event after resolution and normalization; timed dates use the calendar's `timeZone`. */
export type Calendar_Event<TData> = Calendar_EventInput<TData> & {
  occurrence?: { seriesId: string; originalStart: Temporal.ZonedDateTime | Temporal.PlainDate };
};

/** Resolution is calendar-wide and memoized by definitions, input range and display zone (D50). */
export type Calendar_EventSourceContext = {
  /** Inclusive input coverage, including the following date needed by an overnight view. */
  range: Calendar_Range;
  timeZone: string;
};
