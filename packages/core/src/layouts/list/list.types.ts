import type {
  Calendar_ResourceGrouping,
  Calendar_DurationSettings,
  Calendar_VisibilitySettings,
} from '#views/view.types';
import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_Event } from '#events/event.types';
import type { Calendar_PickFeatures } from '#features/feature.types';
import type { Temporal } from 'temporal-polyfill';
import type { Calendar_ListDay_FeatureMap } from '#features/feature-maps.types';
import type { LayoutCoordinates_DateAxis } from '#layouts/shared/coordinates';

export type Calendar_ListGrouping =
  | Calendar_ResourceGrouping
  | 'date'
  | readonly ['date']
  | readonly ['resource', 'date']
  | readonly ['date', 'resource'];

export type Calendar_ListViewSettings = Calendar_DurationSettings &
  Calendar_VisibilitySettings & { groupBy?: Calendar_ListGrouping };

export type Calendar_ListDay<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  events: Calendar_Event<TData>[];
} & Calendar_PickFeatures<Calendar_ListDay_FeatureMap, TFeatures>;

export type Calendar_ListSection<TData, TResourceData = unknown, TFeatures = {}> = {
  key: string;
  date?: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  days: Calendar_ListDay<TData, TResourceData, TFeatures>[];
};

export type Calendar_ListLayout<TData, TResourceData = unknown, TFeatures = {}> = {
  kind: 'list';
  coordinates: LayoutCoordinates_DateAxis;
  sections: Calendar_ListSection<TData, TResourceData, TFeatures>[];
  /** The sections' days in render order, sharing the same objects. */
  days: Calendar_ListDay<TData, TResourceData, TFeatures>[];
};
