import type {
  Background_DayGridDay_FeatureMap,
  Background_TimeGridColumn_FeatureMap,
  Background_TimelineRow_FeatureMap,
} from '#features/background/background.feature-maps';
import type { Recurrence_EventInput_FeatureMap } from '#features/recurrence/recurrence.feature-maps';
import type {
  Calendar_DayGridLayout,
  Calendar_TimeGridLayout,
  Calendar_ListLayout,
  Calendar_TimelineLayout,
} from '#calendar.types';

/** Feature-owned event definitions, keyed by the feature's export name. */
export interface Calendar_EventInput_FeatureMap<TData> extends Recurrence_EventInput_FeatureMap<TData> {}

/*
 * Feature maps (D29). Features extend them by declaration merging, keyed by the feature's export name; each map is
 * filtered by the features a calendar or view registers.
 */

/** State slices a feature owns; each is uncontrolled, controlled through `state`, or external through `atoms`. */
export interface Calendar_State_FeatureMap {}
/** Actions a feature merges onto `api`. */
export interface Calendar_Api_FeatureMap {}
/** Model fields a feature adds to the layouts of the views that list it. */
export interface Calendar_DayGridDay_FeatureMap extends Background_DayGridDay_FeatureMap {}
export interface Calendar_BarSegment_FeatureMap {}
export interface Calendar_TimeGridColumn_FeatureMap extends Background_TimeGridColumn_FeatureMap {}
export interface Calendar_TimeGridSegment_FeatureMap {}
export interface Calendar_ListDay_FeatureMap {}
export interface Calendar_TimelineRow_FeatureMap extends Background_TimelineRow_FeatureMap {}
export interface Calendar_TimelineSegment_FeatureMap {}

/** Layout key → layout, given the features of the view it renders. Layout features extend it by declaration merging. */
export interface Calendar_Layout_FeatureMap<TData, TResourceData, TFeatures> {
  dayGridLayout: Calendar_DayGridLayout<TData, TResourceData, TFeatures>;
  timeGridLayout: Calendar_TimeGridLayout<TData, TResourceData, TFeatures>;
  listLayout: Calendar_ListLayout<TData, TResourceData, TFeatures>;
  timelineLayout: Calendar_TimelineLayout<TData, TResourceData, TFeatures>;
}
