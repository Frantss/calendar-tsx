import type {
  Calendar_ResourceGrouping,
  Calendar_VisibilitySettings,
  Calendar_DayDuration,
  Calendar_MonthDuration,
} from '#views/view.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_PickFeatures } from '#features/feature.types';
import type { Calendar_BarSegment, Calendar_BackgroundEventSpan } from '#layouts/layout.types';
import type { Calendar_Range } from '#dates/date.types';
import type { Temporal } from 'temporal-polyfill';
import type { Calendar_DayGridDay_FeatureMap } from '#features/feature-maps.types';
import type { LayoutCoordinates_DateAxis } from '#layouts/shared/coordinates';

export type Calendar_MonthGrouping =
  | 'month'
  | readonly ['month']
  | readonly ['month', 'resource']
  | readonly ['resource', 'month'];

export type Calendar_DayGridGrouping = Calendar_ResourceGrouping | Calendar_MonthGrouping;

type MonthPeriod = { period: 'month'; days?: never; weeks?: never; months?: never };

export type Calendar_DayGridViewSettings = {
  maxEventsPerDay: number;
  dayOverflow?: (date: Temporal.PlainDate, resourceId?: string) => boolean;
  groupOrder?: 'resource-first' | 'date-first';
} & Calendar_VisibilitySettings &
  (
    | (Calendar_DayDuration & { groupBy?: Calendar_ResourceGrouping; fixedWeekCount?: never })
    | (MonthPeriod & { groupBy?: Calendar_DayGridGrouping; fixedWeekCount?: boolean })
    | (Calendar_MonthDuration & { groupBy: Calendar_MonthGrouping; fixedWeekCount?: boolean })
    | (Calendar_MonthDuration & { groupBy?: Calendar_ResourceGrouping; fixedWeekCount?: never })
  );

export type Calendar_DayGridColumn<TResourceData = unknown> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
};

export type Calendar_DayGridDay<
  TData,
  TResourceData = unknown,
  TFeatures = {},
> = Calendar_DayGridColumn<TResourceData> & {
  isOutside: boolean;
  isToday: boolean;
  isUnavailable: boolean;
  /** Hidden rows crossing this day; not the true total when the input was truncated. */
  hiddenCount: number;
  hasMore: boolean;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_DayGridDay_FeatureMap, TFeatures>;

export type Calendar_DayGridRow<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  days: Calendar_DayGridDay<TData, TResourceData, TFeatures>[];
  columnCount: number;
  segments: Calendar_BarSegment<TData, TFeatures>[];
  /** All-day background events only; timed ones shade time-grid columns (D37). */
  backgroundEvents: Calendar_BackgroundEventSpan<TData>[];
  stackCount: number;
};

export type Calendar_DayGridSection<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  period: Calendar_Range;
  range: Calendar_Range;
  month?: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  columns: Calendar_DayGridColumn<TResourceData>[];
  columnCount: number;
  rows: Calendar_DayGridRow<TData, TResourceData, TFeatures>[];
};

export type Calendar_DayGridLayout<TData, TResourceData = unknown, TFeatures = {}> = {
  kind: 'dayGrid';
  coordinates: LayoutCoordinates_DateAxis;
  sections: Calendar_DayGridSection<TData, TResourceData, TFeatures>[];
};
